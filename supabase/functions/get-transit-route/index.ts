import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { from, to, locale = "ko" } = await request.json();
  const dx = Number(from.coordinates.latitude) - Number(to.coordinates.latitude);
  const dy = Number(from.coordinates.longitude) - Number(to.coordinates.longitude);
  const distanceKm = Number(Math.sqrt(dx * dx + dy * dy).toFixed(1));
  const durationMinutes = Math.max(12, Math.round(distanceKm * 10 + 15));

  return json({
    fromPlaceId: from.id,
    toPlaceId: to.id,
    summary: {
      ko: `${from.name.ko} -> ${to.name.ko} 대중교통 추천`,
      en: `${from.name.en} -> ${to.name.en} recommended transit route`,
    },
    durationMinutes,
    distanceKm,
    provider: "fallback",
    steps: [
      {
        mode: "metro",
        label: {
          ko: locale === "ko" ? "지하철 1회 환승" : "One metro transfer",
          en: "One metro transfer",
        },
      },
    ],
    navigationLinks: {
      appleMaps: `http://maps.apple.com/?ll=${to.coordinates.latitude},${to.coordinates.longitude}`,
      googleMaps: `https://www.google.com/maps/search/?api=1&query=${to.coordinates.latitude},${to.coordinates.longitude}`,
      naverMap: `nmap://place?lat=${to.coordinates.latitude}&lng=${to.coordinates.longitude}&appname=com.busanmate.app`,
      kakaoMap: `kakaomap://look?p=${to.coordinates.latitude},${to.coordinates.longitude}`,
      tMap: `tmap://search?name=${to.coordinates.latitude},${to.coordinates.longitude}`,
    },
  });
});
