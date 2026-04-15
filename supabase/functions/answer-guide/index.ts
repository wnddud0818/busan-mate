import { corsHeaders, json } from "../_shared/cors.ts";
import { createAdminClient, requireAuthUser, requireOwnedProfile } from "../_shared/db.ts";

const buildFallbackAnswer = ({
  question,
  context,
}: {
  question: string;
  context: {
    locale?: "ko" | "en";
    stop?: {
      place?: {
        name?: { ko: string; en: string };
        description?: { ko: string; en: string };
        signatureStory?: { ko: string; en: string };
      };
    };
  };
}) => {
  const locale = context.locale ?? "ko";
  const place = context.stop?.place;
  const lower = String(question ?? "").toLowerCase();

  const answer =
    (lower.includes("why") || lower.includes("name")
      ? place?.signatureStory?.[locale]
      : undefined) ??
    place?.description?.[locale] ??
    (locale === "ko" ? "이 장소에 대한 설명을 찾지 못했어요." : "I could not find details for this stop.");

  return {
    answer,
    suggestions:
      locale === "ko"
        ? ["다음 이동 시간은?", "실내 대체 장소 추천"]
        : ["When do I leave next?", "Suggest an indoor backup"],
    citations: [place?.name?.[locale], place?.description?.[locale]].filter(Boolean),
    confidence: lower.includes("why") || lower.includes("name") ? "high" : "medium",
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authUser = await requireAuthUser(request);
    const admin = createAdminClient();
    const { question, context, session, profileId, userMessageId } = await request.json();

    const ownedProfileId = await requireOwnedProfile({
      admin,
      profileId,
      authUserId: authUser.id,
    });

    if (!session?.remoteId) {
      throw new Error("A remote trip session is required before saving guide chat.");
    }

    const { data: thread, error: threadError } = await admin
      .from("chat_threads")
      .upsert(
        {
          client_id: `thread-${session.id}`,
          itinerary_id: context?.itinerary?.remoteId,
          trip_session_id: session.remoteId,
          profile_id: ownedProfileId,
        },
        {
          onConflict: "client_id",
        }
      )
      .select("id")
      .single();

    if (threadError || !thread?.id) {
      throw threadError ?? new Error("Unable to create the guide chat thread.");
    }

    const { error: userMessageError } = await admin.from("chat_messages").upsert(
      {
        client_id: userMessageId,
        thread_id: thread.id,
        role: "user",
        content: question,
      },
      {
        onConflict: "client_id",
      }
    );

    if (userMessageError) {
      throw userMessageError;
    }

    const answer = buildFallbackAnswer({
      question,
      context,
    });

    const assistantClientId = `assistant-${userMessageId}`;
    const { data: assistantMessage, error: assistantMessageError } = await admin
      .from("chat_messages")
      .upsert(
        {
          client_id: assistantClientId,
          thread_id: thread.id,
          role: "assistant",
          content: answer.answer,
        },
        {
          onConflict: "client_id",
        }
      )
      .select("id")
      .single();

    if (assistantMessageError || !assistantMessage?.id) {
      throw assistantMessageError ?? new Error("Unable to save the guide answer.");
    }

    return json({
      ...answer,
      threadRemoteId: thread.id,
      assistantClientId,
      assistantRemoteId: assistantMessage.id,
      syncStatus: "synced",
    });
  } catch (error) {
    return json(
      {
        message: error instanceof Error ? error.message : "Unable to answer the guide question.",
      },
      400
    );
  }
});
