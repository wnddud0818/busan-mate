import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const payload = await request.json();

  return json({
    ok: true,
    receivedAt: new Date().toISOString(),
    eventId: payload?.id ?? crypto.randomUUID(),
  });
});
