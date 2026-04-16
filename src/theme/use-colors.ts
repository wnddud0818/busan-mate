import { useAppStore } from "../stores/app-store";
import { darkColors, lightColors } from "./tokens";

/** 현재 테마 팔레트를 반환합니다. */
export const useColors = () => {
  const colorScheme = useAppStore((state) => state.colorScheme);
  return colorScheme === "dark" ? darkColors : lightColors;
};

/** 현재 테마의 배경 그라디언트를 반환합니다. */
export const useGradient = (): readonly [string, string, string] => {
  const colorScheme = useAppStore((state) => state.colorScheme);
  return colorScheme === "dark"
    ? ["#071120", "#0E2438", "#1A3E57"]
    : ["#DCF0FF", "#EBF5FF", "#F6FBFF"];
};
