function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
function normaliseStock(item) {
  item = item || {};
  const now = new Date().toISOString();
  item.id = item.id || `ppe_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  item.updatedAt = item.updatedAt || now;
  return {
    id: item.id,
    category: item.category || "Other",
    type: item.type || "PPE",
    label: [item.type || "PPE", item.size && item.size !== "Standard" ? item.size : "", item.brand || ""].filter(Boolean).join(" "),
    qty: Number(item.qty || 0),
    minQty: Number(item.minQty || 0),
    updatedAt: item.updatedAt,
    dataJson: JSON.stringify(item)
  };
}
function normaliseIssue(issue) {
  issue = issue || {};
  const now = new Date().toISOString();
  issue.id = issue.id || `ppe_issue_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  issue.createdAt = issue.createdAt || now;
  return {
    id: issue.id,
    workerId: issue.workerId || "",
    workerName: issue.worker || issue.workerName || "",
    itemId: issue.itemId || "",
    date: issue.date || now.slice(0,10),
    createdAt: issue.createdAt,
    dataJson: JSON.stringify(issue)
  };
}
export async function onRequestGet({ env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    const stockRows = await env.DB.prepare("SELECT data_json FROM ppe_stock ORDER BY category, type, label").all();
    const issueRows = await env.DB.prepare("SELECT data_json FROM ppe_issues ORDER BY created_at DESC").all();
    const stock = (stockRows.results || []).map(row => { try { return JSON.parse(row.data_json); } catch (_) { return null; } }).filter(Boolean);
    const issues = (issueRows.results || []).map(row => { try { return JSON.parse(row.data_json); } catch (_) { return null; } }).filter(Boolean);
    return json({ ok: true, stock, issues });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "Missing D1 binding. Add binding name DB." }, 500);
    let body;
    try { body = await request.json(); } catch (_) { return json({ ok: false, error: "Invalid JSON" }, 400); }
    const stock = Array.isArray(body.stock) ? body.stock : [];
    const issues = Array.isArray(body.issues) ? body.issues : [];
    await env.DB.prepare("DELETE FROM ppe_stock").run();
    await env.DB.prepare("DELETE FROM ppe_issues").run();
    for (const item of stock) {
      const s = normaliseStock(item);
      await env.DB.prepare(
        `INSERT INTO ppe_stock (id,category,type,label,qty,min_qty,updated_at,data_json)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`
      ).bind(s.id, s.category, s.type, s.label, s.qty, s.minQty, s.updatedAt, s.dataJson).run();
    }
    for (const issue of issues) {
      const i = normaliseIssue(issue);
      await env.DB.prepare(
        `INSERT INTO ppe_issues (id,worker_id,worker_name,item_id,date,created_at,data_json)
         VALUES (?1,?2,?3,?4,?5,?6,?7)`
      ).bind(i.id, i.workerId, i.workerName, i.itemId, i.date, i.createdAt, i.dataJson).run();
    }
    return json({ ok: true, stockCount: stock.length, issueCount: issues.length });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}
