import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import { appEnv, hasSupabaseConfig } from "../config/env";

export const supabase = hasSupabaseConfig
  ? createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: AsyncStorage,
        detectSessionInUrl: Platform.OS === "web",
      },
    })
  : null;

const edgeFunctionAvailability = new Map<string, boolean>();

export const canInvokeEdgeFunction = async (name: string) => {
  if (!hasSupabaseConfig || !supabase) {
    return false;
  }

  const cached = edgeFunctionAvailability.get(name);
  if (cached != null) {
    return cached;
  }

  try {
    // A simple GET avoids the browser preflight that `functions.invoke()` triggers.
    const response = await fetch(`${appEnv.supabaseUrl}/functions/v1/${name}`, {
      method: "GET",
    });
    const available = response.status !== 404;
    edgeFunctionAvailability.set(name, available);
    return available;
  } catch {
    // Let the real invoke path handle transient network errors.
    return true;
  }
};
