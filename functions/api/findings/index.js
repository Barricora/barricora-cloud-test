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

async function storeDataUrl(env, findingId, folder, name, dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith("data:image")) return dataUrl;
  const converted = dataUrlToBytes(dataUrl);
  if (!converted) return dataUrl;
  const cleanName = String(name || "photo").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const key = `findings/${findingId}/${folder}/${crypto.randomUUID()}-${cleanName || "photo.jpg"}`;
  await env.AUDIT_PHOTOS.put(key, converted.bytes, {
    httpMetadata: { contentType: converted.mime }
  });
  return `/api/photos?key=${encodeURIComponent(key)}`;
}

async function normaliseFinding(env, finding) {
  finding.id = finding.id || `finding_${Date.now()}`;
  finding.savedAt = new Date().toISOString();
  const arr = Array.isArray(finding.photos) ? finding.photos : [];
  for (const p of arr) {
    if (p && p.data && String(p.data).startsWith("data:image")) {
      p.data = await storeDataUrl(env, finding.id, "photos", p.name || "finding-photo.jpg", p.data);
    }
  }
  finding.photos = arr;
  if (finding.action && finding.action.closePhoto && String(finding.action.closePhoto).startsWith("data:image")) {
    finding.action.closePhoto = await storeDataUrl(env, finding.id, "closeout", "closeout.jpg", finding.action.closePhoto);
  }
  if (finding.actionRequired && finding.action && finding.action.status === "Closed") finding.status = "Closed";
  else if (finding.actionRequired && finding.action && finding.action.text) finding.status = "Open";
  else finding.status = "Closed";
  return finding;
}

function summaryFields(finding) {
  const label = [finding.type, finding.site, finding.area].filter(Boolean).join(" - ") || "Finding";
  return {
    id: finding.id,
    status: finding.status || "Open",
    type: finding.type || "",
    label,
    site: finding.site || "",
    area: finding.area || "",
    contractor: finding.contractor || "",
    raisedBy: finding.raisedBy || "",
    savedAt: finding.savedAt || new Date().toISOString(),
    dataJson: JSON.stringify(finding)
  };
}

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    const { results } = await env.DB.prepare("SELECT data_json FROM findings ORDER BY saved_at DESC").all();
    const findings = (results || []).map(row => {
      try { return JSON.parse(row.data_json); } catch (_) { return null; }
    }).filter(Boolean);
    return json({ ok: true, findings });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    if (!env.AUDIT_PHOTOS) return json({ ok: false, error: "Missing R2 binding. Add binding name AUDIT_PHOTOS." }, 500);
    let finding;
    try { finding = await request.json(); } catch (_) { return json({ error: "Invalid JSON" }, 400); }
    finding = await normaliseFinding(env, finding || {});
    const f = summaryFields(finding);
    await env.DB.prepare(
      `INSERT INTO findings (id,status,type,label,site,area,contractor,raised_by,saved_at,data_json)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
       ON CONFLICT(id) DO UPDATE SET
         status=excluded.status,
         type=excluded.type,
         label=excluded.label,
         site=excluded.site,
         area=excluded.area,
         contractor=excluded.contractor,
         raised_by=excluded.raised_by,
         saved_at=excluded.saved_at,
         data_json=excluded.data_json`
    ).bind(f.id, f.status, f.type, f.label, f.site, f.area, f.contractor, f.raisedBy, f.savedAt, f.dataJson).run();
    return json({ ok: true, finding });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
