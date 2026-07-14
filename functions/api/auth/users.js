const COOKIE_NAME = "barricora_session";
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
function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach(p => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
async function currentUser(env, request) {
  const sid = parseCookies(request.headers.get("Cookie") || "")[COOKIE_NAME];
  if (!sid) return null;
  return await env.DB.prepare(`SELECT u.id,u.company_id,u.email,u.name,u.role,u.status,c.name AS company_name
    FROM auth_sessions s
    JOIN auth_users u ON u.id=s.user_id
    LEFT JOIN auth_companies c ON c.id=u.company_id
    WHERE s.id=?1 AND s.expires_at>?2 AND u.status='Active'`)
    .bind(sid, new Date().toISOString()).first();
}
function canManage(user) { return user && (user.role === "Owner" || user.role === "Admin"); }
function normalRole(role, actorRole) {
  role = String(role || "Editor").trim();
  if (!["Admin","Editor","Viewer"].includes(role)) role = "Editor";
  if (actorRole !== "Owner" && role === "Admin") role = "Editor";
  return role;
}

async function logActivity(env, request, user, action, targetType, targetId, details) {
  try {
    if (!env.DB || !user) return;
    await env.DB.prepare(`INSERT INTO app_activity_log
      (id,company_id,user_id,user_email,user_role,action,target_type,target_id,details,ip,user_agent,created_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)`)
      .bind(randomId("log_"), user.company_id || "", user.id || "", user.email || "", user.role || "", action, targetType || "", targetId || "", JSON.stringify(details || {}), request.headers.get("CF-Connecting-IP") || "", request.headers.get("user-agent") || "", new Date().toISOString()).run();
  } catch (e) {}
}
export async function onRequestGet({ request, env }) {
  try {
    const actor = await currentUser(env, request);
    if (!canManage(actor)) return json({ ok: false, error: "Only Owner/Admin can manage users." }, 403);
    const rows = await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.status,u.created_at,u.updated_at,c.name AS companyName
      FROM auth_users u LEFT JOIN auth_companies c ON c.id=u.company_id
      WHERE u.company_id=?1 ORDER BY CASE u.role WHEN 'Owner' THEN 1 WHEN 'Admin' THEN 2 WHEN 'Editor' THEN 3 ELSE 4 END, u.name`)
      .bind(actor.company_id).all();
    return json({ ok: true, users: rows.results || [] });
  } catch (err) { return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500); }
}
export async function onRequestPost({ request, env }) {
  try {
    const actor = await currentUser(env, request);
    if (!canManage(actor)) return json({ ok: false, error: "Only Owner/Admin can create users." }, 403);
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = normalRole(body.role, actor.role);
    if (!name || !email || !password) return json({ ok: false, error: "Name, email and temporary password are required." }, 400);
    if (password.length < 8) return json({ ok: false, error: "Password must be at least 8 characters." }, 400);
    const existing = await env.DB.prepare("SELECT id FROM auth_users WHERE email=?1").bind(email).first();
    if (existing) return json({ ok: false, error: "This email is already registered." }, 409);
    const hp = await hashPassword(password);
    const id = randomId("user_");
    const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO auth_users (id,company_id,name,email,password_hash,password_salt,role,status,created_at,updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,'Active',?8,?9)`)
      .bind(id, actor.company_id, name, email, hp.hash, hp.salt, role, now, now).run();
    await logActivity(env, request, actor, "user_created", "auth_user", id, { targetEmail: email, targetName: name, role });
    return json({ ok: true, user: { id, name, email, role, status: "Active" } });
  } catch (err) { return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500); }
}
export async function onRequestPut({ request, env }) {
  try {
    const actor = await currentUser(env, request);
    if (!canManage(actor)) return json({ ok: false, error: "Only Owner/Admin can update users." }, 403);
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) return json({ ok: false, error: "User ID required." }, 400);
    const target = await env.DB.prepare("SELECT id,company_id,role,status,email,name FROM auth_users WHERE id=?1").bind(id).first();
    if (!target || target.company_id !== actor.company_id) return json({ ok: false, error: "User not found." }, 404);
    if (target.id === actor.id) return json({ ok: false, error: "You cannot change your own role/status or reset your own password here." }, 400);
    if (target.role === "Owner") return json({ ok: false, error: "Owner account cannot be changed from this screen." }, 400);
    const now = new Date().toISOString();
    if (body.resetPassword) {
      const password = String(body.password || "");
      if (password.length < 8) return json({ ok: false, error: "New password must be at least 8 characters." }, 400);
      const hp = await hashPassword(password);
      await env.DB.prepare("UPDATE auth_users SET password_hash=?1,password_salt=?2,updated_at=?3 WHERE id=?4 AND company_id=?5")
        .bind(hp.hash, hp.salt, now, id, actor.company_id).run();
      await env.DB.prepare("DELETE FROM auth_sessions WHERE user_id=?1").bind(id).run();
      await logActivity(env, request, actor, "user_password_reset", "auth_user", id, { targetEmail: target.email, targetName: target.name });
      return json({ ok: true });
    }
    const role = normalRole(body.role || target.role, actor.role);
    const status = String(body.status || target.status) === "Disabled" ? "Disabled" : "Active";
    await env.DB.prepare("UPDATE auth_users SET role=?1,status=?2,updated_at=?3 WHERE id=?4 AND company_id=?5")
      .bind(role, status, now, id, actor.company_id).run();
    if (status !== "Active") await env.DB.prepare("DELETE FROM auth_sessions WHERE user_id=?1").bind(id).run();
    await logActivity(env, request, actor, "user_updated", "auth_user", id, { targetEmail: target.email, role, status });
    return json({ ok: true });
  } catch (err) { return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500); }
}
