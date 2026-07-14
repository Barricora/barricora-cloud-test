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
function randomId(prefix = "") {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return prefix + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
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
async function logActivity(env, request, user, action, targetType, targetId, details) {
  try {
    await env.DB.prepare(`INSERT INTO app_activity_log
      (id,company_id,user_id,user_email,user_role,action,target_type,target_id,details,ip,user_agent,created_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)`)
      .bind(randomId("log_"), user.company_id, user.id, user.email || "", user.role || "", action, targetType || "", targetId || "", JSON.stringify(details || {}), request.headers.get("CF-Connecting-IP") || "", request.headers.get("user-agent") || "", new Date().toISOString()).run();
  } catch (e) {}
}
function normalizeStatus(row) {
  const now = new Date();
  const expires = row && row.expires_at ? new Date(row.expires_at) : null;
  const active = !!(row && Number(row.enabled) === 1 && expires && expires.getTime() > now.getTime());
  return {
    enabled: active,
    expiresAt: row && row.expires_at ? row.expires_at : "",
    note: row && row.note ? row.note : "",
    updatedBy: row && row.updated_by ? row.updated_by : "",
    updatedAt: row && row.updated_at ? row.updated_at : ""
  };
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding DB." }, 500);
    const actor = await currentUser(env, request);
    if (!canManage(actor)) return json({ ok: false, error: "Only Owner/Admin can view support access." }, 403);
    const row = await env.DB.prepare("SELECT * FROM app_support_access WHERE company_id=?1").bind(actor.company_id).first();
    return json({ ok: true, supportAccess: normalizeStatus(row) });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding DB." }, 500);
    const actor = await currentUser(env, request);
    if (!canManage(actor)) return json({ ok: false, error: "Only Owner/Admin can change support access." }, 403);
    const body = await request.json();
    const now = new Date();
    const enabled = !!body.enabled;
    let hours = Number(body.hours || 24);
    if (!Number.isFinite(hours) || hours <= 0) hours = 24;
    hours = Math.min(hours, 168);
    const expiresAt = enabled ? new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString() : "";
    const note = String(body.note || "").slice(0, 500);
    await env.DB.prepare(`INSERT INTO app_support_access (company_id,enabled,expires_at,note,updated_by,updated_at)
      VALUES (?1,?2,?3,?4,?5,?6)
      ON CONFLICT(company_id) DO UPDATE SET enabled=excluded.enabled, expires_at=excluded.expires_at, note=excluded.note, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
      .bind(actor.company_id, enabled ? 1 : 0, expiresAt, note, actor.email || actor.id, now.toISOString()).run();
    await logActivity(env, request, actor, enabled ? "support_access_enabled" : "support_access_disabled", "support_access", actor.company_id, { hours: enabled ? hours : 0, expiresAt, note });
    return json({ ok: true, supportAccess: { enabled, expiresAt, note, updatedBy: actor.email || actor.id, updatedAt: now.toISOString() } });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
