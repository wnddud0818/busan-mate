// ─── Palette type ─────────────────────────────────────────────────────────────
export type ColorPalette = typeof lightColors;

// ─── Light theme ──────────────────────────────────────────────────────────────
export const lightColors = {
  ink: "#EBF4FF",         // 페이지 배경 — 맑은 하늘빛
  navy: "#0B1A2E",        // 어두운 버튼 텍스트 (coral/mint 위에서만 사용)
  slate: "#2A4C6C",       // 중간 블루 accent
  mint: "#00A090",        // 딥 틸 (흰 배경 대비)
  coral: "#E54516",       // 코랄레드 (흰 배경 대비)
  sand: "#A46E00",        // 앰버 (흰 배경 텍스트)
  cloud: "#0E1C2C",       // 주 텍스트 — 다크 네이비
  smoke: "#3B5672",       // 보조 텍스트
  line: "rgba(0,0,0,0.09)",
  success: "#067842",
  warning: "#A46E00",

  surface: "#FFFFFF",
  surfaceHigh: "#EAF3FF",
  glass: "rgba(0,0,0,0.04)",   // 카드 유리 배경
  input: "rgba(0,0,0,0.05)",   // 입력 필드 배경

  coralLight: "rgba(229,69,22,0.09)",
  coralBorder: "rgba(229,69,22,0.24)",
  mintLight: "rgba(0,160,144,0.09)",
  mintBorder: "rgba(0,160,144,0.24)",
  sandLight: "rgba(164,110,0,0.09)",

  mist: "rgba(14,28,44,0.55)",
  fog: "rgba(14,28,44,0.36)",
  lineBright: "rgba(0,0,0,0.14)",

  gold: "#B48400",
  silver: "#4C6E88",
  bronze: "#7A4C00",
  error: "#C81818",

  // 메달 카드 배경/테두리
  medalGoldBg: "rgba(180,132,0,0.12)",
  medalSilverBg: "rgba(76,110,136,0.10)",
  medalBronzeBg: "rgba(122,76,0,0.12)",
  medalGoldBorder: "rgba(180,132,0,0.32)",
  medalSilverBorder: "rgba(76,110,136,0.26)",
  medalBronzeBorder: "rgba(122,76,0,0.28)",
};

// ─── Dark theme ───────────────────────────────────────────────────────────────
export const darkColors: ColorPalette = {
  ink: "#050E1A",
  navy: "#0B1D2E",
  slate: "#1B3D57",
  mint: "#20D9C8",
  coral: "#FF5C2C",
  sand: "#FAE0A0",
  cloud: "#EDF6FF",
  smoke: "#B8D4E8",
  line: "rgba(255,255,255,0.16)",
  success: "#18DC82",
  warning: "#FFBA00",

  surface: "#102336",
  surfaceHigh: "#1A3450",
  glass: "rgba(255,255,255,0.07)",
  input: "rgba(255,255,255,0.09)",

  coralLight: "rgba(255,92,44,0.22)",
  coralBorder: "rgba(255,92,44,0.44)",
  mintLight: "rgba(32,217,200,0.18)",
  mintBorder: "rgba(32,217,200,0.38)",
  sandLight: "rgba(250,224,160,0.16)",

  mist: "rgba(237,246,255,0.72)",
  fog: "rgba(237,246,255,0.48)",
  lineBright: "rgba(255,255,255,0.28)",

  gold: "#FFD12B",
  silver: "#9BBAC9",
  bronze: "#D4883A",
  error: "#FF3E3E",

  medalGoldBg: "rgba(245,200,66,0.10)",
  medalSilverBg: "rgba(168,186,196,0.08)",
  medalBronzeBg: "rgba(205,127,50,0.09)",
  medalGoldBorder: "rgba(245,200,66,0.28)",
  medalSilverBorder: "rgba(168,186,196,0.22)",
  medalBronzeBorder: "rgba(205,127,50,0.24)",
};

// 하위 호환 — 직접 import 시 라이트 테마 기본값
export const colors = lightColors;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 12,
  md: 18,
  lg: 28,
  pill: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  display: 34,
};
