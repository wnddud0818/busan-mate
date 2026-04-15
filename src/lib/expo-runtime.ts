import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const isWeb = Platform.OS === "web";
export const supportsBackgroundLiveGuide = !isWeb && !isExpoGo;

export const getLiveGuideUnsupportedMessage = (locale: string) =>
  locale === "ko"
    ? "Expo Go에서는 백그라운드 위치 안내와 알림을 지원하지 않아 수동 가이드로 계속합니다. 개발 빌드를 사용해 주세요."
    : "Expo Go can't run background location guidance or notifications. Continuing in manual guide mode. Use a development build for the full live guide.";
