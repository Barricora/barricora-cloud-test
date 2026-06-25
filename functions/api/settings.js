function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    const row = await env.DB.prepare("SELECT value_json FROM app_settings WHERE key=?1").bind("default").first();
    return json({ ok: true, settings: row ? JSON.parse(row.value_json) : {} });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    const settings = await request.json();
    await env.DB.prepare(
      `INSERT INTO app_settings (key,value_json,updated_at)
       VALUES (?1,?2,?3)
       ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`
    ).bind("default", JSON.stringify(settings || {}), new Date().toISOString()).run();
    return json({ ok: true, settings });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
