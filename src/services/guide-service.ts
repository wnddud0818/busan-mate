import { hasSupabaseConfig } from "../config/env";
import { buildGuideAnswer } from "../features/guide/answerer";
import { supabase } from "../lib/supabase";
import { GuideAnswerResult, GuideContext, TripSession, UserProfile } from "../types/domain";
import { createId } from "../utils/id";
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
  if (hasRemoteProfile(userProfile) && session.remoteId && supabase) {
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
  }

  return {
    ...buildGuideAnswer(question, context),
    assistantClientId: createId(),
    threadRemoteId: session.chatThreadRemoteId,
    syncStatus: hasSupabaseConfig ? "pending" : "synced",
  };
};
