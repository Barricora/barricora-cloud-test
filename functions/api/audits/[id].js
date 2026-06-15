function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function onRequestDelete({ params, env }) {
  const id = params.id;
  if (!id) return json({ error: "Missing audit id" }, 400);
  let cursor;
  const prefix = `audits/${id}/`;
  do {
    const listed = await env.AUDIT_PHOTOS.list({ prefix, cursor });
    cursor = listed.truncated ? listed.cursor : undefined;
    for (const obj of listed.objects) await env.AUDIT_PHOTOS.delete(obj.key);
  } while (cursor);
  await env.DB.prepare("DELETE FROM audits WHERE id=?1").bind(id).run();
  return json({ ok: true });
}
