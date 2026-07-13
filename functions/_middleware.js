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
async function getAuthenticatedUser(env, request) {
  if (!env.DB) return null;
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const sid = cookies[COOKIE_NAME];
  if (!sid) return null;
  const row = await env.DB.prepare(`SELECT u.id,u.email,u.name,u.role,u.status,u.company_id
    FROM auth_sessions s
    JOIN auth_users u ON u.id=s.user_id
    WHERE s.id=?1 AND s.expires_at>?2 AND u.status='Active'`)
    .bind(sid, new Date().toISOString()).first();
  return row || null;
}
function isPublicApi(path) {
  return path === "/api/health" ||
    path === "/api/auth/login" ||
    path === "/api/auth/register" ||
    path === "/api/auth/logout" ||
    path === "/api/auth/me";
}
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const method = context.request.method.toUpperCase();
  if (!path.startsWith("/api/")) return context.next();
  if (method === "OPTIONS" || isPublicApi(path)) return context.next();
  try {
    const user = await getAuthenticatedUser(context.env, context.request);
    if (!user) return json({ ok: false, error: "Not authenticated" }, 401);
    if (user.role === "Viewer" && method !== "GET" && method !== "HEAD") {
      return json({ ok: false, error: "View-only users cannot create, edit, upload or delete records." }, 403);
    }
    return context.next();
  } catch (err) {
    return json({ ok: false, error: "Authentication check failed" }, 401);
  }
}
