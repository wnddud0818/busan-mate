import { Redirect } from "expo-router";

import { useAppStore } from "../src/stores/app-store";

export default function IndexPage() {
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);

  return <Redirect href={onboardingComplete ? "/(tabs)/plan" : "/onboarding"} />;
}
