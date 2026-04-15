import * as SecureStore from "expo-secure-store";

import { supabase } from "../lib/supabase";
import { AppLocale, UserProfile } from "../types/domain";
import { createId } from "../utils/id";

const LOCAL_PROFILE_KEY = "busan-mate-local-profile";

const saveLocalProfile = async (profile: UserProfile) => {
  await SecureStore.setItemAsync(LOCAL_PROFILE_KEY, JSON.stringify(profile));
};

export const readStoredProfile = async (): Promise<UserProfile | null> => {
  const stored = await SecureStore.getItemAsync(LOCAL_PROFILE_KEY);
  return stored ? (JSON.parse(stored) as UserProfile) : null;
};

export const ensureRemoteProfile = async ({
  authUserId,
  email,
  isAnonymous,
  locale,
}: {
  authUserId: string;
  email?: string;
  isAnonymous: boolean;
  locale: AppLocale;
}): Promise<UserProfile> => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        auth_user_id: authUserId,
        locale,
        is_anonymous: isAnonymous,
      },
      {
        onConflict: "auth_user_id",
      }
    )
    .select("id, auth_user_id, locale, is_anonymous")
    .single();

  if (error || !data?.id) {
    throw error ?? new Error("Unable to ensure the remote profile.");
  }

  const profile: UserProfile = {
    id: authUserId,
    authUserId,
    profileId: data.id,
    isAnonymous,
    email,
    authMode: "supabase",
  };

  await saveLocalProfile(profile);
  return profile;
};

export const bootstrapAuth = async (locale: AppLocale = "ko"): Promise<UserProfile> => {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    let session = data.session;

    if (!session) {
      const anonymous = await supabase.auth.signInAnonymously();
      session = anonymous.data.session ?? null;
    }

    if (session?.user.id) {
      return ensureRemoteProfile({
        authUserId: session.user.id,
        email: session.user.email ?? undefined,
        isAnonymous: session.user.is_anonymous ?? true,
        locale,
      });
    }
  }

  const stored = await readStoredProfile();
  if (stored) {
    return stored;
  }

  const profile: UserProfile = {
    id: `guest-${createId(10)}`,
    isAnonymous: true,
    authMode: "local",
  };
  await saveLocalProfile(profile);
  return profile;
};

export const sendMagicLink = async (email: string, locale: AppLocale = "ko") => {
  if (supabase) {
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "busanmate://",
      },
    });

    const stored: UserProfile = {
      id: email,
      email,
      isAnonymous: false,
      authMode: "supabase",
    };
    await saveLocalProfile(stored);
    return stored;
  }

  const stored: UserProfile = {
    id: `guest-${createId(10)}`,
    isAnonymous: false,
    authMode: "local",
    email,
  };
  await saveLocalProfile(stored);
  return stored;
};
