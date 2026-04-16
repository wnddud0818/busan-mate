import { hasSupabaseConfig } from "../config/env";
import { buildGuideAnswer } from "../features/guide/answerer";
import { canInvokeEdgeFunction, supabase } from "../lib/supabase";
import { GuideAnswerResult, GuideContext, TripSession, UserProfile } from "../types/domain";
import { createId } from "../utils/id";
import { logApiError, logApiRequest, logApiResponse, logDebugInfo } from "./debug-service";
import { hasRemoteProfile } from "./remote-sync";

export const answerGuideQuestion = async ({
  question,
  context,
  session,
  userProfile,
  userMessageId,
}: {
  question: string;
  context: GuideContext;
  session: TripSession;
  userProfile?: UserProfile;
  userMessageId: string;
}): Promise<GuideAnswerResult> => {
  const remoteProfileReady = hasRemoteProfile(userProfile);
  const remoteGuideAvailable =
    remoteProfileReady && session.remoteId && supabase ? await canInvokeEdgeFunction("answer-guide") : false;

  if (remoteProfileReady && session.remoteId && supabase && remoteGuideAvailable) {
    const traceId = logApiRequest({
      label: "answer-guide",
      summary: "Sending guide question to Supabase Edge Function.",
      payload: {
        question,
        context,
        session,
        profileId: userProfile!.profileId,
        userMessageId,
      },
    });
    const { data, error } = await supabase.functions.invoke("answer-guide", {
      body: {
        question,
        context,
        session,
        profileId: userProfile!.profileId,
        userMessageId,
      },
    });

    if (!error && data?.answer) {
      logApiResponse({
        label: "answer-guide",
        traceId,
        summary: "Guide answer returned from Supabase.",
        payload: data,
      });
      return {
        answer: data.answer,
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        citations: Array.isArray(data.citations) ? data.citations : [],
        confidence: data.confidence ?? "medium",
        threadRemoteId: data.threadRemoteId,
        assistantClientId: data.assistantClientId ?? createId(),
        assistantRemoteId: data.assistantRemoteId,
        syncStatus: "synced",
      };
    }

    if (error) {
      logApiError({
        label: "answer-guide",
        traceId,
        summary: "Guide answer request failed. Falling back to the local answerer.",
        error,
        payload: {
          question,
          sessionId: session.id,
          userMessageId,
        },
      });
    }
  }

  logDebugInfo({
    label: "answer-guide",
    summary: "Using the local guide answerer.",
    payload: {
      question,
      sessionId: session.id,
      hasRemoteProfile: remoteProfileReady,
      hasRemoteSession: Boolean(session.remoteId),
      hasRemoteFunction: remoteGuideAvailable,
    },
  });

  return {
    ...buildGuideAnswer(question, context),
    assistantClientId: createId(),
    threadRemoteId: session.chatThreadRemoteId,
    syncStatus: hasSupabaseConfig ? "pending" : "synced",
  };
};
