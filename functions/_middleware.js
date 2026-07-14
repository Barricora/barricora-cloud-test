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

function randomId(prefix = "") {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return prefix + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
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

function describeTarget(path) {
  if (path.startsWith("/api/audits")) return "audits";
  if (path.startsWith("/api/findings")) return "findings";
  if (path.startsWith("/api/daily")) return "daily_checklists";
  if (path.startsWith("/api/toolbox")) return "toolbox_talks";
  if (path.startsWith("/api/workers")) return "workers";
  if (path.startsWith("/api/ppe")) return "ppe";
  if (path.startsWith("/api/rams")) return "rams";
  if (path.startsWith("/api/settings")) return "settings";
  if (path.startsWith("/api/photos")) return "photos";
  return "api";
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
      await logActivity(context.env, context.request, user, "blocked_viewer_write", "api", path, { method });
      return json({ ok: false, error: "View-only users cannot create, edit, upload or delete records." }, 403);
    }

    const response = await context.next();

    // App Log v88: capture successful/failed write requests for normal app data changes.
    // Specific auth/support actions are logged inside their own API handlers to avoid duplicates.
    if (method !== "GET" && method !== "HEAD" && !path.startsWith("/api/auth/") && path !== "/api/support-access") {
      const ok = response && response.status < 400;
      await logActivity(context.env, context.request, user, ok ? "record_changed" : "write_failed", describeTarget(path), path, { method, status: response ? response.status : "unknown" });
    }

    return response;
  } catch (err) {
    return json({ ok: false, error: "Authentication check failed" }, 401);
  }
}
