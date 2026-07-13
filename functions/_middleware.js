
const COOKIE_NAME = "barricora_session";
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach(p => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
async function isAuthenticated(env, request) {
  if (!env.DB) return false;
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const sid = cookies[COOKIE_NAME];
  if (!sid) return false;
  const row = await env.DB.prepare(`SELECT s.id
    FROM auth_sessions s
    JOIN auth_users u ON u.id=s.user_id
    WHERE s.id=?1 AND s.expires_at>?2 AND u.status='Active'`)
    .bind(sid, new Date().toISOString()).first();
  return !!row;
}
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  if (!path.startsWith("/api/")) return context.next();
  if (path === "/api/health" || path.startsWith("/api/auth/")) return context.next();
  try {
    const ok = await isAuthenticated(context.env, context.request);
    if (!ok) return json({ ok: false, error: "Not authenticated" }, 401);
    return context.next();
  } catch (err) {
    return json({ ok: false, error: "Authentication check failed" }, 401);
  }
}
