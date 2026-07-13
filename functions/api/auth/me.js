
const COOKIE_NAME = "barricora_session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100000;
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...extraHeaders } });
}
function b64(bytes) {
  let s = "";
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}
function b64ToBytes(str) {
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function randomId(prefix = "") {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return prefix + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function hashPassword(password, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64 ? b64ToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, keyMaterial, 256);
  return { salt: b64(salt), hash: b64(bits) };
}
function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach(p => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function sessionCookie(sessionId) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
async function createSession(env, userId, request) {
  const id = randomId("sess_");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await env.DB.prepare(`INSERT INTO auth_sessions (id,user_id,created_at,expires_at,user_agent) VALUES (?1,?2,?3,?4,?5)`)
    .bind(id, userId, now.toISOString(), expires.toISOString(), request.headers.get("user-agent") || "").run();
  return id;
}
async function getSessionUser(env, request) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const sid = cookies[COOKIE_NAME];
  if (!sid) return null;
  const now = new Date().toISOString();
  const row = await env.DB.prepare(`SELECT u.id,u.email,u.name,u.role,u.status,u.company_id,c.name AS company_name,s.expires_at
    FROM auth_sessions s
    JOIN auth_users u ON u.id=s.user_id
    LEFT JOIN auth_companies c ON c.id=u.company_id
    WHERE s.id=?1 AND s.expires_at>?2 AND u.status='Active'`)
    .bind(sid, now).first();
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role, status: row.status, companyId: row.company_id, companyName: row.company_name };
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, user: null, error: "Missing D1 binding DB." }, 200);
    const user = await getSessionUser(env, request);
    return json({ ok: true, user: user || null });
  } catch (err) {
    return json({ ok: false, user: null, error: String(err && err.message ? err.message : err) }, 200);
  }
}
