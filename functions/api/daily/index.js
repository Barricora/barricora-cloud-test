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

async function storeDataUrl(env, dailyId, folder, name, dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith("data:image")) return dataUrl;
  const converted = dataUrlToBytes(dataUrl);
  if (!converted) return dataUrl;
  const cleanName = String(name || "photo").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const key = `daily/${dailyId}/${folder}/${crypto.randomUUID()}-${cleanName || "photo.jpg"}`;
  await env.AUDIT_PHOTOS.put(key, converted.bytes, {
    httpMetadata: { contentType: converted.mime }
  });
  return `/api/photos?key=${encodeURIComponent(key)}`;
}

async function normaliseDaily(env, daily) {
  daily.id = daily.id || `daily_${Date.now()}`;
  daily.savedAt = new Date().toISOString();
  daily.status = daily.status || "Completed";

  const arr = Array.isArray(daily.photos) ? daily.photos : [];
  for (const p of arr) {
    if (p && p.data && String(p.data).startsWith("data:image")) {
      p.data = await storeDataUrl(env, daily.id, "photos", p.name || "daily-photo.jpg", p.data);
    }
  }
  daily.photos = arr;

  const acts = daily.actions || {};
  for (const k of Object.keys(acts)) {
    const act = acts[k] || {};
    if (act.closePhoto && String(act.closePhoto).startsWith("data:image")) {
      act.closePhoto = await storeDataUrl(env, daily.id, `${k}/closeout`, "closeout.jpg", act.closePhoto);
    }
  }
  const cleanedActs = {};
  for (const k of Object.keys(acts)) {
    const act = acts[k] || {};
    if ((act.text || "").trim()) cleanedActs[k] = act;
  }
  daily.actions = cleanedActs;
  return daily;
}

function summaryFields(daily) {
  const label = [daily.type || "General Daily Walk", daily.site, daily.area].filter(Boolean).join(" - ") || "Daily checklist";
  return {
    id: daily.id,
    status: daily.status || "Completed",
    type: daily.type || "General Daily Walk",
    label,
    site: daily.site || "",
    area: daily.area || "",
    checkedBy: daily.checkedBy || "",
    savedAt: daily.savedAt || new Date().toISOString(),
    dataJson: JSON.stringify(daily)
  };
}

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    const { results } = await env.DB.prepare("SELECT data_json FROM daily_checklists ORDER BY saved_at DESC").all();
    const daily = (results || []).map(row => {
      try { return JSON.parse(row.data_json); } catch (_) { return null; }
    }).filter(Boolean);
    return json({ ok: true, daily });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    if (!env.AUDIT_PHOTOS) return json({ ok: false, error: "Missing R2 binding. Add binding name AUDIT_PHOTOS." }, 500);
    let daily;
    try { daily = await request.json(); } catch (_) { return json({ error: "Invalid JSON" }, 400); }
    daily = await normaliseDaily(env, daily || {});
    const d = summaryFields(daily);
    await env.DB.prepare(
      `INSERT INTO daily_checklists (id,status,type,label,site,area,checked_by,saved_at,data_json)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)
       ON CONFLICT(id) DO UPDATE SET
         status=excluded.status,
         type=excluded.type,
         label=excluded.label,
         site=excluded.site,
         area=excluded.area,
         checked_by=excluded.checked_by,
         saved_at=excluded.saved_at,
         data_json=excluded.data_json`
    ).bind(d.id, d.status, d.type, d.label, d.site, d.area, d.checkedBy, d.savedAt, d.dataJson).run();
    return json({ ok: true, daily });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
