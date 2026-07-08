function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
export async function onRequestDelete({ params, env }) {
  try {
    const id = params.id;
    if (!id) return json({ ok: false, error: "Missing worker id" }, 400);
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    await env.DB.prepare("DELETE FROM workers WHERE id=?1").bind(id).run();
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
