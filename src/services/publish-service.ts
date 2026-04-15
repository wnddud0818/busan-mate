import { hasSupabaseConfig } from "../config/env";
import { Itinerary, PublishResult, UserProfile } from "../types/domain";
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
