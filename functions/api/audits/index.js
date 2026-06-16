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

async function storeDataUrl(env, auditId, folder, name, dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith("data:image")) return dataUrl;
  const converted = dataUrlToBytes(dataUrl);
  if (!converted) return dataUrl;
  const cleanName = String(name || "photo").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const key = `audits/${auditId}/${folder}/${crypto.randomUUID()}-${cleanName || "photo.jpg"}`;
  await env.AUDIT_PHOTOS.put(key, converted.bytes, {
    httpMetadata: { contentType: converted.mime }
  });
  return `/api/photos?key=${encodeURIComponent(key)}`;
}

async function normaliseAudit(env, audit) {
  audit.id = audit.id || `audit_${Date.now()}`;
  audit.savedAt = audit.savedAt || new Date().toISOString();

  const photoMap = audit.photos || {};
  for (const qKey of Object.keys(photoMap)) {
    const arr = Array.isArray(photoMap[qKey]) ? photoMap[qKey] : (photoMap[qKey] && photoMap[qKey].data ? [photoMap[qKey]] : []);
    for (const p of arr) {
      if (p && p.data && String(p.data).startsWith("data:image")) {
        p.data = await storeDataUrl(env, audit.id, qKey, p.name || "audit-photo.jpg", p.data);
      }
    }
    photoMap[qKey] = arr;
  }
  audit.photos = photoMap;

  const acts = audit.actions || {};
  for (const k of Object.keys(acts)) {
    const act = acts[k] || {};
    if (act.closePhoto && String(act.closePhoto).startsWith("data:image")) {
      act.closePhoto = await storeDataUrl(env, audit.id, `${k}/closeout`, "closeout.jpg", act.closePhoto);
    }
  }
  const cleanedActs = {};
  for (const k of Object.keys(acts)) {
    const act = acts[k] || {};
    if ((act.text || "").trim()) cleanedActs[k] = act;
  }
  audit.actions = cleanedActs;
  return audit;
}

function auditSummaryFields(audit) {
  const d = audit.details || {};
  const score = audit.score && audit.score.score !== undefined ? audit.score.score : null;
  const label = [audit.category, d.site, d.area].filter(Boolean).join(" - ") || "Saved audit";
  return {
    id: audit.id,
    status: audit.status || (audit.reportReady ? "Finished" : "Unfinished"),
    category: audit.category || "",
    label,
    site: d.site || "",
    area: d.area || "",
    auditor: d.auditor || "",
    score,
    savedAt: audit.savedAt || new Date().toISOString(),
    dataJson: JSON.stringify(audit)
  };
}

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    const { results } = await env.DB.prepare("SELECT data_json FROM audits ORDER BY saved_at DESC").all();
    const audits = (results || []).map(row => {
      try { return JSON.parse(row.data_json); } catch (_) { return null; }
    }).filter(Boolean);
    return json({ ok: true, audits });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    if (!env.AUDIT_PHOTOS) return json({ ok: false, error: "Missing R2 binding. Add binding name AUDIT_PHOTOS." }, 500);
    let audit;
    try { audit = await request.json(); } catch (_) { return json({ error: "Invalid JSON" }, 400); }
    audit = await normaliseAudit(env, audit);
  const f = auditSummaryFields(audit);
  await env.DB.prepare(
    `INSERT INTO audits (id,status,category,label,site,area,auditor,score,saved_at,data_json)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
     ON CONFLICT(id) DO UPDATE SET
       status=excluded.status,
       category=excluded.category,
       label=excluded.label,
       site=excluded.site,
       area=excluded.area,
       auditor=excluded.auditor,
       score=excluded.score,
       saved_at=excluded.saved_at,
       data_json=excluded.data_json`
  ).bind(f.id, f.status, f.category, f.label, f.site, f.area, f.auditor, f.score, f.savedAt, f.dataJson).run();
  return json({ ok: true, audit });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

export async function onRequestDelete({ env }) {
  try {
  let cursor;
  do {
    const listed = await env.AUDIT_PHOTOS.list({ prefix: "audits/", cursor });
    cursor = listed.truncated ? listed.cursor : undefined;
    for (const obj of listed.objects) await env.AUDIT_PHOTOS.delete(obj.key);
  } while (cursor);
  await env.DB.prepare("DELETE FROM audits").run();
  return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
