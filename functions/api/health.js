export async function onRequestGet(context) {
  return new Response(JSON.stringify({ ok: true, service: "Barricora Cloud API" }), {
    headers: { "Content-Type": "application/json" }
  });
}
