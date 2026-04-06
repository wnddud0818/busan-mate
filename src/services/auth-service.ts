import * as SecureStore from "expo-secure-store";

import { supabase } from "../lib/supabase";
import { UserProfile } from "../types/domain";
import { createId } from "../utils/id";

const LOCAL_PROFILE_KEY = "busan-mate-local-profile";

export const bootstrapAuth = async (): Promise<UserProfile> => {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    let session = data.session;

    if (!session) {
      const anonymous = await supabase.auth.signInAnonymously();
      session = anonymous.data.session ?? null;
    }

    return {
      id: session?.user.id ?? createId(),
      isAnonymous: session?.user.is_anonymous ?? true,
      email: session?.user.email ?? undefined,
      authMode: "supabase",
    };
  }

  const stored = await SecureStore.getItemAsync(LOCAL_PROFILE_KEY);
  if (stored) {
    return JSON.parse(stored) as UserProfile;
  }

  const profile: UserProfile = {
    id: `guest-${createId(10)}`,
    isAnonymous: true,
    authMode: "local",
  };
  await SecureStore.setItemAsync(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  return profile;
};

export const sendMagicLink = async (email: string) => {
  if (supabase) {
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "busanmate://",
      },
    });
  }

  const stored: UserProfile = {
    id: `guest-${createId(10)}`,
    isAnonymous: false,
    authMode: supabase ? "supabase" : "local",
    email,
  };
  await SecureStore.setItemAsync(LOCAL_PROFILE_KEY, JSON.stringify(stored));
  return stored;
};
