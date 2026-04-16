// ─── Base palette (기존 토큰 이름 유지, 값 일부 개선) ───────────────────────
export const colors = {
  ink: "#050E1A",         // 베이스 배경 — 깊은 네이비 블랙
  navy: "#0B1D2E",        // 카드/헤더 배경
  slate: "#1B3D57",       // 중간 톤 블루
  mint: "#20D9C8",        // 비비드 일렉트릭 틸
  coral: "#FF5C2C",       // 채도 높은 선명한 오렌지레드
  sand: "#FAE0A0",        // 따뜻한 골드 옐로
  cloud: "#EDF6FF",       // 약간 블루 틴트 화이트
  smoke: "#B8D4E8",       // 밝은 스모크 블루
  line: "rgba(255,255,255,0.16)",
  success: "#18DC82",
  warning: "#FFBA00",

  // ─── 확장 팔레트 ────────────────────────────────────────────────────────────
  surface: "#102336",     // 배경보다 확연히 밝은 카드 bg
  surfaceHigh: "#1A3450", // 높은 층위 카드 bg

  coralLight: "rgba(255,92,44,0.22)",
  coralBorder: "rgba(255,92,44,0.44)",
  mintLight: "rgba(32,217,200,0.18)",
  mintBorder: "rgba(32,217,200,0.38)",
  sandLight: "rgba(250,224,160,0.16)",

  mist: "rgba(237,246,255,0.72)",    // 흐릿한 보조 텍스트 (0.56 → 0.72)
  fog: "rgba(237,246,255,0.48)",     // 아주 흐릿한 텍스트 (0.34 → 0.48)
  lineBright: "rgba(255,255,255,0.28)",

  gold: "#FFD12B",
  silver: "#9BBAC9",
  bronze: "#D4883A",
  error: "#FF3E3E",
};

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
