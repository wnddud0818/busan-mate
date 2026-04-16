import { MobilityMode, RouteStep } from "../../types/domain";

type OdsayLane = {
  busNo?: unknown;
  name?: unknown;
};

type OdsaySubPath = {
  trafficType?: unknown;
  sectionTime?: unknown;
  distance?: unknown;
  stationCount?: unknown;
  startName?: unknown;
  endName?: unknown;
  lane?: unknown;
};

const KO = {
  walk: "\uB3C4\uBCF4",
  walkMove: "\uB3C4\uBCF4 \uC774\uB3D9",
  metroTransfer: "\uC9C0\uD558\uCCA0 \uD658\uC2B9 \uCD94\uCC9C",
  firstLastMile: "\uC5ED-\uC7A5\uC18C \uB3C4\uBCF4 \uC5F0\uACB0",
  bus: "\uBC84\uC2A4",
  metroBoard: "\uD0D1\uC2B9",
  taxiRide: "\uD0DD\uC2DC \uC774\uB3D9",
  minutes: "\uBD84",
  stations: "\uAC1C \uC5ED",
  stops: "\uAC1C \uC815\uB958\uC7A5",
} as const;

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const toText = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toLaneList = (value: unknown): OdsayLane[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is OdsayLane => Boolean(item && typeof item === "object"));
  }

  if (value && typeof value === "object") {
    return [value as OdsayLane];
  }

  return [];
};

const toDistanceKm = (value: unknown) => {
  const parsed = toNumber(value);
  if (parsed == null) {
    return undefined;
  }

  const kilometers = parsed > 30 ? parsed / 1000 : parsed;
  return Number(kilometers.toFixed(kilometers >= 10 ? 0 : 1));
};

const formatDistance = (distanceKm: number, locale: "ko" | "en") => {
  const normalized = Number.isInteger(distanceKm) ? distanceKm.toFixed(0) : distanceKm.toFixed(1);
  return locale === "ko" ? `${normalized}km` : `${normalized} km`;
};

const joinParts = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(" / ");

const buildStepDetail = ({
  durationMinutes,
  distanceKm,
  stationCount,
  stationLabel,
}: {
  durationMinutes?: number;
  distanceKm?: number;
  stationCount?: number;
  stationLabel?: "stations" | "stops";
}) => {
  const ko = joinParts(
    durationMinutes != null ? `${Math.round(durationMinutes)}${KO.minutes}` : undefined,
    distanceKm != null ? formatDistance(distanceKm, "ko") : undefined,
    stationCount != null && stationLabel != null
      ? `${Math.round(stationCount)}${stationLabel === "stations" ? KO.stations : KO.stops}`
      : undefined
  );
  const en = joinParts(
    durationMinutes != null ? `${Math.round(durationMinutes)} min` : undefined,
    distanceKm != null ? formatDistance(distanceKm, "en") : undefined,
    stationCount != null && stationLabel != null
      ? `${Math.round(stationCount)} ${stationLabel === "stations" ? "stations" : "stops"}`
      : undefined
  );

  if (!ko && !en) {
    return undefined;
  }

  return { ko, en };
};

const summarizeLaneNames = (subPath: OdsaySubPath, fallback: string) => {
  const names = toLaneList(subPath.lane)
    .map((lane) => toText(lane.busNo) ?? toText(lane.name))
    .filter((value): value is string => Boolean(value));

  return names.length > 0 ? names.slice(0, 2).join(" / ") : fallback;
};

const buildWalkStep = (subPath: OdsaySubPath): RouteStep => {
  const startName = toText(subPath.startName);
  const endName = toText(subPath.endName);

  return {
    mode: "walk",
    label: {
      ko: startName && endName ? `${startName} -> ${endName} ${KO.walk}` : KO.walkMove,
      en: startName && endName ? `Walk ${startName} to ${endName}` : "Walk",
    },
    detail: buildStepDetail({
      durationMinutes: toNumber(subPath.sectionTime),
      distanceKm: toDistanceKm(subPath.distance),
    }),
  };
};

const buildMetroStep = (subPath: OdsaySubPath): RouteStep => {
  const startName = toText(subPath.startName);
  const endName = toText(subPath.endName);
  const lineName = summarizeLaneNames(subPath, "Metro");

  return {
    mode: "metro",
    label: {
      ko: startName && endName ? `${lineName} ${startName} -> ${endName}` : `${lineName} ${KO.metroBoard}`,
      en: startName && endName ? `${lineName} from ${startName} to ${endName}` : `Take ${lineName}`,
    },
    detail: buildStepDetail({
      durationMinutes: toNumber(subPath.sectionTime),
      distanceKm: toDistanceKm(subPath.distance),
      stationCount: toNumber(subPath.stationCount),
      stationLabel: "stations",
    }),
  };
};

const buildBusStep = (subPath: OdsaySubPath): RouteStep => {
  const startName = toText(subPath.startName);
  const endName = toText(subPath.endName);
  const lineName = summarizeLaneNames(subPath, "Bus");

  return {
    mode: "bus",
    label: {
      ko: startName && endName ? `${KO.bus} ${lineName} ${startName} -> ${endName}` : `${KO.bus} ${lineName}`,
      en: startName && endName ? `Bus ${lineName} from ${startName} to ${endName}` : `Bus ${lineName}`,
    },
    detail: buildStepDetail({
      durationMinutes: toNumber(subPath.sectionTime),
      distanceKm: toDistanceKm(subPath.distance),
      stationCount: toNumber(subPath.stationCount),
      stationLabel: "stops",
    }),
  };
};

const buildTaxiStep = (subPath: OdsaySubPath): RouteStep => ({
  mode: "taxi",
  label: {
    ko: KO.taxiRide,
    en: "Taxi ride",
  },
  detail: buildStepDetail({
    durationMinutes: toNumber(subPath.sectionTime),
    distanceKm: toDistanceKm(subPath.distance),
  }),
});

export const buildFallbackTransitSteps = ({
  distanceKm,
  durationMinutes,
  mobilityMode,
}: {
  distanceKm: number;
  durationMinutes: number;
  mobilityMode: MobilityMode;
}): RouteStep[] => {
  if (distanceKm < 1.3 || mobilityMode === "walk") {
    return [
      {
        mode: "walk",
        label: {
          ko: KO.walkMove,
          en: "Walk",
        },
        detail: buildStepDetail({
          durationMinutes,
          distanceKm,
        }),
      },
    ];
  }

  return [
    {
      mode: "metro",
      label: {
        ko: KO.metroTransfer,
        en: "Recommended metro transfer",
      },
      detail: buildStepDetail({
        durationMinutes,
        distanceKm,
      }),
    },
    {
      mode: "walk",
      label: {
        ko: KO.firstLastMile,
        en: "First/last-mile walk",
      },
    },
  ];
};

export const buildOdsayTransitSteps = (subPaths: unknown): RouteStep[] => {
  if (!Array.isArray(subPaths)) {
    return [];
  }

  return subPaths
    .filter((subPath): subPath is OdsaySubPath => Boolean(subPath && typeof subPath === "object"))
    .map((subPath) => {
      switch (toNumber(subPath.trafficType)) {
        case 1:
          return buildMetroStep(subPath);
        case 2:
          return buildBusStep(subPath);
        case 3:
          return buildWalkStep(subPath);
        case 4:
          return buildTaxiStep(subPath);
        default:
          return buildWalkStep(subPath);
      }
    })
    .filter((step) => Boolean(step.label.ko || step.label.en));
};
