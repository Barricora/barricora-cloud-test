function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function onRequestDelete({ params, env }) {
  try {
    const id = params.id;
    if (!id) return json({ error: "Missing RAMS id" }, 400);
    if (env.AUDIT_PHOTOS) {
      let cursor;
      const prefix = `rams/${id}/`;
      do {
        const listed = await env.AUDIT_PHOTOS.list({ prefix, cursor });
        cursor = listed.truncated ? listed.cursor : undefined;
        for (const obj of listed.objects) await env.AUDIT_PHOTOS.delete(obj.key);
      } while (cursor);
    }
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    await env.DB.prepare("DELETE FROM rams_register WHERE id=?1").bind(id).run();
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
