function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function dataUrlToBytes(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/i.exec(dataUrl || "");
  if (!match) return null;
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { mime, bytes };
}

async function storeDataUrl(env, talkId, folder, name, dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith("data:image")) return dataUrl;
  const converted = dataUrlToBytes(dataUrl);
  if (!converted) return dataUrl;
  const cleanName = String(name || "photo").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const key = `toolbox/${talkId}/${folder}/${crypto.randomUUID()}-${cleanName || "photo.jpg"}`;
  await env.AUDIT_PHOTOS.put(key, converted.bytes, { httpMetadata: { contentType: converted.mime } });
  return `/api/photos?key=${encodeURIComponent(key)}`;
}

async function normaliseToolbox(env, talk) {
  talk.id = talk.id || `toolbox_${Date.now()}`;
  talk.savedAt = new Date().toISOString();
  talk.status = talk.status || "Completed";
  const arr = Array.isArray(talk.photos) ? talk.photos : [];
  for (const p of arr) {
    if (p && p.data && String(p.data).startsWith("data:image")) {
      p.data = await storeDataUrl(env, talk.id, "photos", p.name || "toolbox-photo.jpg", p.data);
    }
  }
  talk.photos = arr;
  talk.attendees = Array.isArray(talk.attendees) ? talk.attendees : [];
  return talk;
}

function summaryFields(talk) {
  const label = [talk.topic || "Toolbox Talk", talk.site, talk.area].filter(Boolean).join(" - ") || "Toolbox Talk";
  return {
    id: talk.id,
    status: talk.status || "Completed",
    topic: talk.topic || "",
    label,
    site: talk.site || "",
    area: talk.area || "",
    deliveredBy: talk.deliveredBy || "",
    company: talk.company || "",
    savedAt: talk.savedAt || new Date().toISOString(),
    dataJson: JSON.stringify(talk)
  };
}

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    const { results } = await env.DB.prepare("SELECT data_json FROM toolbox_talks ORDER BY saved_at DESC").all();
    const toolbox = (results || []).map(row => {
      try { return JSON.parse(row.data_json); } catch (_) { return null; }
    }).filter(Boolean);
    return json({ ok: true, toolbox });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    if (!env.AUDIT_PHOTOS) return json({ ok: false, error: "Missing R2 binding. Add binding name AUDIT_PHOTOS." }, 500);
    let talk;
    try { talk = await request.json(); } catch (_) { return json({ error: "Invalid JSON" }, 400); }
    talk = await normaliseToolbox(env, talk || {});
    const t = summaryFields(talk);
    await env.DB.prepare(
      `INSERT INTO toolbox_talks (id,status,topic,label,site,area,delivered_by,company,saved_at,data_json)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
       ON CONFLICT(id) DO UPDATE SET
         status=excluded.status,
         topic=excluded.topic,
         label=excluded.label,
         site=excluded.site,
         area=excluded.area,
         delivered_by=excluded.delivered_by,
         company=excluded.company,
         saved_at=excluded.saved_at,
         data_json=excluded.data_json`
    ).bind(t.id, t.status, t.topic, t.label, t.site, t.area, t.deliveredBy, t.company, t.savedAt, t.dataJson).run();
    return json({ ok: true, toolboxTalk: talk });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
