import { DebugLogEntry, Itinerary } from "../types/domain";
import { formatKrwFull } from "../utils/currency";
import { createId } from "../utils/id";
import { useAppStore } from "../stores/app-store";

const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 8;
const MAX_OBJECT_KEYS = 16;
const MAX_STRING_LENGTH = 600;

const truncateText = (value: string, limit = MAX_STRING_LENGTH) =>
  value.length <= limit ? value : `${value.slice(0, limit)}...`;

const sanitizeDebugValue = (value: unknown, depth = 0): unknown => {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return truncateText(value);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ? truncateText(value.stack, 900) : undefined,
    };
  }

  if (depth >= MAX_DEPTH) {
    if (Array.isArray(value)) {
      return `[Array(${value.length})]`;
    }

    return "[Object]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeDebugValue(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, MAX_OBJECT_KEYS)
        .map(([key, nestedValue]) => [key, sanitizeDebugValue(nestedValue, depth + 1)])
    );
  }

  return String(value);
};

const pushLog = (entry: Omit<DebugLogEntry, "id" | "createdAt">) => {
  useAppStore.getState().actions.addDebugLog({
    ...entry,
    id: createId(),
    createdAt: new Date().toISOString(),
    summary: entry.summary ? truncateText(entry.summary, 240) : undefined,
    payload: sanitizeDebugValue(entry.payload),
  });
};

export const logDebugInfo = ({
  kind = "api",
  label,
  summary,
  payload,
  traceId,
}: {
  kind?: DebugLogEntry["kind"];
  label: string;
  summary?: string;
  payload?: unknown;
  traceId?: string;
}) => {
  pushLog({
    kind,
    stage: "info",
    label,
    summary,
    payload,
    traceId,
  });
};

export const logApiRequest = ({
  label,
  summary,
  payload,
}: {
  label: string;
  summary?: string;
  payload?: unknown;
}) => {
  const traceId = createId(8);
  pushLog({
    kind: "api",
    stage: "request",
    label,
    summary,
    payload,
    traceId,
  });
  return traceId;
};

export const logApiResponse = ({
  label,
  traceId,
  summary,
  payload,
}: {
  label: string;
  traceId?: string;
  summary?: string;
  payload?: unknown;
}) => {
  pushLog({
    kind: "api",
    stage: "response",
    label,
    summary,
    payload,
    traceId,
  });
};

export const logApiError = ({
  label,
  traceId,
  summary,
  error,
  payload,
}: {
  label: string;
  traceId?: string;
  summary?: string;
  error: unknown;
  payload?: unknown;
}) => {
  pushLog({
    kind: "api",
    stage: "error",
    label,
    summary,
    payload: {
      ...(payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}),
      error: sanitizeDebugValue(error),
    },
    traceId,
  });
};

export const logPriceSnapshot = ({
  label,
  itinerary,
  summary,
}: {
  label: string;
  itinerary: Itinerary;
  summary?: string;
}) => {
  const locale = itinerary.locale;
  const budgetSummary = itinerary.planningMeta?.budgetSummary;
  const pricePayload = {
    budgetSummary,
    days: itinerary.days.map((day) => ({
      dayNumber: day.dayNumber,
      totalPlaceSpendKrw: day.stops.reduce((total, stop) => total + stop.place.estimatedSpendKrw, 0),
      totalTransitFareKrw: day.stops.reduce(
        (total, stop) => total + (stop.transitFromPrevious?.estimatedFareKrw ?? 0),
        0
      ),
      stops: day.stops.map((stop) => ({
        order: stop.order,
        place: stop.place.name[locale],
        priceLevel: stop.place.priceLevel,
        estimatedSpendKrw: stop.place.estimatedSpendKrw,
        transitFareKrw: stop.transitFromPrevious?.estimatedFareKrw ?? 0,
        transitProvider: stop.transitFromPrevious?.provider ?? null,
      })),
    })),
  };

  pushLog({
    kind: "price",
    stage: "info",
    label,
    summary:
      summary ??
      (budgetSummary
        ? `${formatKrwFull(budgetSummary.estimatedTotalKrw, locale)} total / ${formatKrwFull(
            budgetSummary.estimatedPerPersonKrw,
            locale
          )} per traveler`
        : undefined),
    payload: pricePayload,
  });
};
