const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  openAiModel: process.env.EXPO_PUBLIC_OPENAI_MODEL ?? "gpt-4.1-mini",
  tourApiKey: process.env.EXPO_PUBLIC_TOUR_API_KEY ?? "",
  odsayApiKey: process.env.EXPO_PUBLIC_ODSAY_API_KEY ?? "",
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
};

export const appEnv = env;

export const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasTourApiKey = Boolean(env.tourApiKey);
export const hasOdsayApiKey = Boolean(env.odsayApiKey);
