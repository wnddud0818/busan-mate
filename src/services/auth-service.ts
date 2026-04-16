import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { supabase } from "../lib/supabase";
import { AppLocale, UserProfile } from "../types/domain";
import { createId } from "../utils/id";
import { logApiError, logApiRequest, logApiResponse, logDebugInfo } from "./debug-service";

const LOCAL_PROFILE_KEY = "busan-mate-local-profile";

const setProfileValue = async (value: string) => {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(LOCAL_PROFILE_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(LOCAL_PROFILE_KEY, value);
};

const getProfileValue = async () => {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(LOCAL_PROFILE_KEY);
  }

  return SecureStore.getItemAsync(LOCAL_PROFILE_KEY);
};

const saveLocalProfile = async (profile: UserProfile) => {
  await setProfileValue(JSON.stringify(profile));
};

export const readStoredProfile = async (): Promise<UserProfile | null> => {
  const stored = await getProfileValue();
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

  const traceId = logApiRequest({
    label: "profiles.upsert",
    summary: "Ensuring a remote user profile in Supabase.",
    payload: {
      authUserId,
      email,
      isAnonymous,
      locale,
    },
  });
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
    logApiError({
      label: "profiles.upsert",
      traceId,
      summary: "Remote profile upsert failed.",
      error: error ?? new Error("Missing profile id after upsert."),
      payload: {
        authUserId,
        email,
        isAnonymous,
        locale,
      },
    });
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
  logApiResponse({
    label: "profiles.upsert",
    traceId,
    summary: "Remote profile is ready.",
    payload: profile,
  });
  return profile;
};

export const bootstrapAuth = async (locale: AppLocale = "ko"): Promise<UserProfile> => {
  if (supabase) {
    const traceId = logApiRequest({
      label: "auth.bootstrap",
      summary: "Bootstrapping Supabase auth session.",
      payload: {
        locale,
      },
    });
    const { data } = await supabase.auth.getSession();
    let session = data.session;

    if (!session) {
      const anonymous = await supabase.auth.signInAnonymously();
      session = anonymous.data.session ?? null;
    }

    if (session?.user.id) {
      logApiResponse({
        label: "auth.bootstrap",
        traceId,
        summary: "Supabase session is available.",
        payload: {
          userId: session.user.id,
          email: session.user.email ?? undefined,
          isAnonymous: session.user.is_anonymous ?? true,
        },
      });
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
    logDebugInfo({
      label: "auth.bootstrap",
      summary: "Using a locally stored profile.",
      payload: stored,
    });
    return stored;
  }

  const profile: UserProfile = {
    id: `guest-${createId(10)}`,
    isAnonymous: true,
    authMode: "local",
  };
  await saveLocalProfile(profile);
  logDebugInfo({
    label: "auth.bootstrap",
    summary: "Created a new local guest profile.",
    payload: profile,
  });
  return profile;
};

export const sendMagicLink = async (email: string, locale: AppLocale = "ko") => {
  if (supabase) {
    const emailRedirectTo = Platform.OS === "web" ? Linking.createURL("/") : "busanmate://";
    const traceId = logApiRequest({
      label: "auth.magic-link",
      summary: "Sending Supabase magic link.",
      payload: {
        email,
        locale,
      },
    });
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });

    const stored: UserProfile = {
      id: email,
      email,
      isAnonymous: false,
      authMode: "supabase",
    };
    await saveLocalProfile(stored);
    logApiResponse({
      label: "auth.magic-link",
      traceId,
      summary: "Magic link request completed.",
      payload: stored,
    });
    return stored;
  }

  const stored: UserProfile = {
    id: `guest-${createId(10)}`,
    isAnonymous: false,
    authMode: "local",
    email,
  };
  await saveLocalProfile(stored);
  logDebugInfo({
    label: "auth.magic-link",
    summary: "Supabase is unavailable, so a local upgraded profile was stored instead.",
    payload: stored,
  });
  return stored;
};
