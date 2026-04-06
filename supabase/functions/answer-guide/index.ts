import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { question, context } = await request.json();
  const locale = context?.locale ?? "ko";
  const stop = context?.stop;

  if (!stop) {
    return json(
      {
        answer:
          locale === "ko"
            ? "가이드 컨텍스트가 부족해 정확한 답변을 만들지 못했어요."
            : "Guide context is incomplete, so I could not answer reliably.",
        suggestions: [],
        citations: [],
        confidence: "fallback",
      },
      200
    );
  }

  const answer =
    String(question).toLowerCase().includes("why") || String(question).includes("왜")
      ? stop.place.signatureStory?.[locale] ?? stop.place.description?.[locale]
      : stop.place.description?.[locale];

  return json({
    answer,
    suggestions:
      locale === "ko"
        ? ["다음 이동 시간은?", "실내 대체 장소 추천"]
        : ["When do I leave next?", "Suggest an indoor backup"],
    citations: [stop.place.name?.[locale], stop.place.description?.[locale]].filter(Boolean),
    confidence: "medium",
  });
});
