export async function onRequestGet({ env }) {
  const out = {
    ok: true,
    dbBinding: !!env.DB,
    r2Binding: !!env.AUDIT_PHOTOS,
    time: new Date().toISOString()
  };
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
}
