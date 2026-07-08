function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
function workerFields(worker) {
  worker = worker || {};
  const now = new Date().toISOString();
  worker.id = worker.id || `worker_${Date.now()}`;
  worker.updatedAt = worker.updatedAt || worker.savedAt || now;
  worker.savedAt = now;
  return {
    id: worker.id,
    name: worker.name || "",
    company: worker.company || "",
    role: worker.role || "",
    site: worker.site || "",
    status: worker.status || "Active",
    updatedAt: worker.updatedAt,
    dataJson: JSON.stringify(worker)
  };
}
export async function onRequestGet({ env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    const { results } = await env.DB.prepare("SELECT data_json FROM workers ORDER BY name COLLATE NOCASE ASC").all();
    const workers = (results || []).map(row => { try { return JSON.parse(row.data_json); } catch (_) { return null; } }).filter(Boolean);
    return json({ ok: true, workers });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    let worker;
    try { worker = await request.json(); } catch (_) { return json({ ok: false, error: "Invalid JSON" }, 400); }
    const w = workerFields(worker);
    await env.DB.prepare(
      `INSERT INTO workers (id,name,company,role,site,status,updated_at,data_json)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         company=excluded.company,
         role=excluded.role,
         site=excluded.site,
         status=excluded.status,
         updated_at=excluded.updated_at,
         data_json=excluded.data_json`
    ).bind(w.id, w.name, w.company, w.role, w.site, w.status, w.updatedAt, w.dataJson).run();
    return json({ ok: true, worker: JSON.parse(w.dataJson) });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
