import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { appEnv, hasSupabaseConfig } from "../config/env";

export const supabase = hasSupabaseConfig
  ? createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: AsyncStorage,
        detectSessionInUrl: false,
      },
    })
  : null;
