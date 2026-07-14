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

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding DB." }, 500);
    const actor = await currentUser(env, request);
    if (!canManage(actor)) return json({ ok: false, error: "Only Owner/Admin can view the App Log." }, 403);
    const url = new URL(request.url);
    let limit = Number(url.searchParams.get("limit") || 100);
    if (!Number.isFinite(limit) || limit < 1) limit = 100;
    limit = Math.min(limit, 300);
    const rows = await env.DB.prepare(`SELECT id,company_id,user_id,user_email,user_role,action,target_type,target_id,details,ip,user_agent,created_at
      FROM app_activity_log
      WHERE company_id=?1
      ORDER BY created_at DESC
      LIMIT ?2`).bind(actor.company_id, limit).all();
    const logs = (rows.results || []).map(row => {
      let details = {};
      try { details = row.details ? JSON.parse(row.details) : {}; } catch (e) { details = { raw: row.details }; }
      return { ...row, details };
    });
    return json({ ok: true, logs });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
