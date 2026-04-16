import { hasSupabaseConfig } from "../config/env";
import { Itinerary, PublishResult, UserProfile } from "../types/domain";
import { logDebugInfo } from "./debug-service";
import { syncItineraryRecord, toLocalSharedSnapshot } from "./remote-sync";

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
    logDebugInfo({
      label: "publish-itinerary",
      summary: "Publishing was blocked because the user needs to upgrade before remote publish.",
      payload: {
        itineraryId: itinerary.id,
        isAnonymous: userProfile?.isAnonymous ?? true,
        remoteEnabled: hasSupabaseConfig,
      },
    });
    const pendingItinerary: Itinerary = {
      ...itinerary,
      shareStatus: "published",
      syncStatus: "pending",
    };

    return {
      itinerary: pendingItinerary,
      shared: toLocalSharedSnapshot(pendingItinerary, "pending"),
      upgradeRequired: true,
      syncStatus: "pending",
    };
  }

  const result = await syncItineraryRecord({
    itinerary,
    userProfile,
    shareStatus: "published",
  });

  return {
    itinerary: result.itinerary,
    shared: result.shared ?? toLocalSharedSnapshot(result.itinerary, result.syncStatus),
    upgradeRequired: false,
    syncStatus: result.syncStatus,
  };
};
