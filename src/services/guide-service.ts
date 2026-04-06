import { hasSupabaseConfig } from "../config/env";
import { buildGuideAnswer } from "../features/guide/answerer";
import { supabase } from "../lib/supabase";
import { GuideContext } from "../types/domain";

export const answerGuideQuestion = async ({
  question,
  context,
}: {
  question: string;
  context: GuideContext;
}) => {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.functions.invoke("answer-guide", {
      body: {
        question,
        context,
      },
    });

    if (!error && data) {
      return data;
    }
  }

  return buildGuideAnswer(question, context);
};
