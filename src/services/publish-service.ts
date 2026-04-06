import { hasSupabaseConfig } from "../config/env";
import { buildSharedSnapshot } from "../features/ranking/scoring";
import { supabase } from "../lib/supabase";
import { Itinerary, PublishResult, UserProfile } from "../types/domain";

export const requiresUpgradeForRemotePublish = ({
  userProfile,
  remoteEnabled,
}: {
  userProfile?: UserProfile;
  remoteEnabled: boolean;
}) => Boolean(userProfile?.isAnonymous && remoteEnabled);

export const publishItinerary = async ({
  itinerary,
  userProfile,
}: {
  itinerary: Itinerary;
  userProfile?: UserProfile;
}): Promise<PublishResult> => {
  if (
    requiresUpgradeForRemotePublish({
      userProfile,
      remoteEnabled: hasSupabaseConfig,
    })
  ) {
    return {
      shared: buildSharedSnapshot(itinerary),
      upgradeRequired: true,
    };
  }

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.functions.invoke("publish-itinerary", {
      body: {
        itinerary,
      },
    });

    if (!error && data) {
      return {
        shared: data,
        upgradeRequired: false,
      };
    }
  }

  return {
    shared: buildSharedSnapshot({
      ...itinerary,
      shareStatus: "published",
    }),
    upgradeRequired: false,
  };
};
