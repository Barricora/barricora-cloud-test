function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return json({ error: "Missing photo key" }, 400);
  const obj = await env.AUDIT_PHOTOS.get(key);
  if (!obj) return json({ error: "Photo not found" }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (!headers.get("Content-Type")) headers.set("Content-Type", "application/octet-stream");
  if (headers.get("Content-Type") === "application/pdf") {
    const filename = (key.split("/").pop() || "document.pdf").replace(/^[0-9a-f-]+-/i, "");
    headers.set("Content-Disposition", `inline; filename="${filename.replace(/"/g, "") || "document.pdf"}"`);
  }
  headers.set("etag", obj.httpEtag);
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(obj.body, { headers });
}
