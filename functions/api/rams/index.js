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

async function storeDataUrl(env, ramsId, name, dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith("data:application/pdf")) return dataUrl;
  const converted = dataUrlToBytes(dataUrl);
  if (!converted) return dataUrl;
  const cleanName = String(name || "rams.pdf").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const key = `rams/${ramsId}/pdfs/${crypto.randomUUID()}-${cleanName || "rams.pdf"}`;
  await env.AUDIT_PHOTOS.put(key, converted.bytes, { httpMetadata: { contentType: converted.mime } });
  return `/api/photos?key=${encodeURIComponent(key)}`;
}

async function normaliseRAMS(env, rams) {
  rams.id = rams.id || `rams_${Date.now()}`;
  rams.savedAt = new Date().toISOString();
  rams.status = rams.status || "Active";
  if (rams.pdf && rams.pdf.data && String(rams.pdf.data).startsWith("data:application/pdf")) {
    rams.pdf.data = await storeDataUrl(env, rams.id, rams.pdf.name || "rams.pdf", rams.pdf.data);
  }
  return rams;
}

function summaryFields(rams) {
  const label = [rams.title || "RAMS", rams.revision, rams.site].filter(Boolean).join(" - ") || "RAMS";
  return {
    id: rams.id,
    status: rams.status || "Active",
    title: rams.title || "",
    label,
    site: rams.site || "",
    contractor: rams.contractor || "",
    task: rams.task || "",
    revision: rams.revision || "",
    uploadedDate: rams.uploadedDate || "",
    reviewDate: rams.reviewDate || "",
    savedAt: rams.savedAt || new Date().toISOString(),
    dataJson: JSON.stringify(rams)
  };
}

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    const { results } = await env.DB.prepare("SELECT data_json FROM rams_register ORDER BY saved_at DESC").all();
    const rams = (results || []).map(row => {
      try { return JSON.parse(row.data_json); } catch (_) { return null; }
    }).filter(Boolean);
    return json({ ok: true, rams });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    if (!env.AUDIT_PHOTOS) return json({ ok: false, error: "Missing R2 binding. Add binding name AUDIT_PHOTOS." }, 500);
    let rams;
    try { rams = await request.json(); } catch (_) { return json({ error: "Invalid JSON" }, 400); }
    rams = await normaliseRAMS(env, rams || {});
    const r = summaryFields(rams);
    await env.DB.prepare(
      `INSERT INTO rams_register (id,status,title,label,site,contractor,task,revision,uploaded_date,review_date,saved_at,data_json)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
       ON CONFLICT(id) DO UPDATE SET
         status=excluded.status,
         title=excluded.title,
         label=excluded.label,
         site=excluded.site,
         contractor=excluded.contractor,
         task=excluded.task,
         revision=excluded.revision,
         uploaded_date=excluded.uploaded_date,
         review_date=excluded.review_date,
         saved_at=excluded.saved_at,
         data_json=excluded.data_json`
    ).bind(r.id, r.status, r.title, r.label, r.site, r.contractor, r.task, r.revision, r.uploadedDate, r.reviewDate, r.savedAt, r.dataJson).run();
    return json({ ok: true, ramsRecord: rams });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
