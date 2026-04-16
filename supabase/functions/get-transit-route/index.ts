import { corsHeaders, json } from "../_shared/cors.ts";

const estimateTransitFareKrw = (distanceKm: number) => {
  if (distanceKm < 1.3) {
    return 0;
  }

  if (distanceKm < 4) {
    return 1600;
  }

  if (distanceKm < 9) {
    return 1900;
  }

  return 2200;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { from, to, locale = "ko" } = await request.json();
  const dx = Number(from.coordinates.latitude) - Number(to.coordinates.latitude);
  const dy = Number(from.coordinates.longitude) - Number(to.coordinates.longitude);
  const distanceKm = Number(Math.sqrt(dx * dx + dy * dy).toFixed(1));
  const durationMinutes = Math.max(12, Math.round(distanceKm * 10 + 15));
  const estimatedFareKrw = estimateTransitFareKrw(distanceKm);

  return json({
    fromPlaceId: from.id,
    toPlaceId: to.id,
    summary: {
      ko: `${from.name.ko} -> ${to.name.ko} 대중교통 추천`,
      en: `${from.name.en} -> ${to.name.en} recommended transit route`,
    },
    durationMinutes,
    distanceKm,
    estimatedFareKrw,
    provider: "fallback",
    steps:
      distanceKm < 1.3
        ? [
            {
              mode: "walk",
              label: {
                ko: "도보 이동",
                en: "Walk",
              },
              detail: {
                ko: `${durationMinutes}분 · ${distanceKm}km`,
                en: `${durationMinutes} min · ${distanceKm} km`,
              },
            },
          ]
        : [
            {
              mode: "metro",
              label: {
                ko: locale === "ko" ? "지하철 환승 추천" : "Recommended metro transfer",
                en: "Recommended metro transfer",
              },
              detail: {
                ko: `${durationMinutes}분 · ${distanceKm}km`,
                en: `${durationMinutes} min · ${distanceKm} km`,
              },
            },
            {
              mode: "walk",
              label: {
                ko: "역-장소 도보 연결",
                en: "First/last-mile walk",
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
