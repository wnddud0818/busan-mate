import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppStore } from "../../stores/app-store";
import { radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";
import { AppLocale, DebugLogEntry } from "../../types/domain";

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

// Panel bg is always dark — use fixed dark-theme values for panel internals
const PANEL_TEXT = "#EDF6FF";
const PANEL_HINT = "rgba(237,246,255,0.68)";
const PANEL_BADGE = "#20D9C8";
const PANEL_TIME = "rgba(237,246,255,0.50)";
const PANEL_TRACE = "rgba(237,246,255,0.45)";
const PANEL_SUMMARY = "#FAE0A0";
const PANEL_SMOKE = "#B8D4E8";
const PANEL_EMPTY = "rgba(237,246,255,0.65)";
const PANEL_BORDER = "rgba(237,246,255,0.12)";
const PANEL_CLEAR_BG = "rgba(255,255,255,0.08)";
const PANEL_TAB_BG = "rgba(255,255,255,0.05)";
const PANEL_TAB_ACTIVE_BG = "rgba(32,217,200,0.16)";
const PANEL_TAB_ACTIVE_BORDER = "rgba(32,217,200,0.45)";

type DebugTabId =
  | "all"
  | "planner"
  | "weather"
  | "places"
  | "transit"
  | "price"
  | "sync"
  | "auth"
  | "guide"
  | "other";

const tabLabelMap: Record<AppLocale, Record<DebugTabId, string>> = {
  ko: {
    all: "전체",
    planner: "일정",
    weather: "날씨",
    places: "장소",
    transit: "교통",
    price: "가격",
    sync: "동기화",
    auth: "인증",
    guide: "가이드",
    other: "기타",
  },
  en: {
    all: "All",
    planner: "Planner",
    weather: "Weather",
    places: "Places",
    transit: "Transit",
    price: "Price",
    sync: "Sync",
    auth: "Auth",
    guide: "Guide",
    other: "Other",
  },
};

const resolveLogTab = (log: DebugLogEntry): DebugTabId => {
  if (log.kind === "price" || log.label.endsWith(".price")) {
    return "price";
  }

  if (log.kind === "planner" || log.label.startsWith("generate-itinerary")) {
    return "planner";
  }

  if (log.label.startsWith("weather.")) {
    return "weather";
  }

  if (log.label.startsWith("visit-korea")) {
    return "places";
  }

  if (log.label.startsWith("odsay.") || log.label === "get-transit-route") {
    return "transit";
  }

  if (
    log.label === "publish-itinerary" ||
    log.label === "rate-itinerary" ||
    log.label === "materialize-ranking" ||
    log.label === "trip_sessions.upsert" ||
    log.label === "sync-live-session" ||
    log.label === "ingest-location-event"
  ) {
    return "sync";
  }

  if (log.label.startsWith("auth.") || log.label.startsWith("profiles.")) {
    return "auth";
  }

  if (log.label === "answer-guide") {
    return "guide";
  }

  return "other";
};

export const DebugPanel = () => {
  const colors = useColors();
  const locale = useAppStore((state) => state.locale);
  const debugLogs = useAppStore((state) => state.debugLogs);
  const clearDebugLogs = useAppStore((state) => state.actions.clearDebugLogs);
  const [open, setOpen] = useState(debugLogs.length > 0);
  const [selectedTab, setSelectedTab] = useState<DebugTabId>("all");
  const [expandedLogIds, setExpandedLogIds] = useState<string[]>([]);

  const tabs = useMemo(() => {
    const counts = debugLogs.reduce<Record<DebugTabId, number>>(
      (current, log) => {
        const next = resolveLogTab(log);
        current[next] += 1;
        return current;
      },
      {
        all: debugLogs.length,
        planner: 0,
        weather: 0,
        places: 0,
        transit: 0,
        price: 0,
        sync: 0,
        auth: 0,
        guide: 0,
        other: 0,
      }
    );

    return (Object.keys(tabLabelMap[locale]) as DebugTabId[])
      .filter((id) => id === "all" || counts[id] > 0)
      .map((id) => ({
        id,
        label: tabLabelMap[locale][id],
        count: id === "all" ? debugLogs.length : counts[id],
      }));
  }, [debugLogs, locale]);

  const visibleLogs = useMemo(
    () => debugLogs.filter((log) => selectedTab === "all" || resolveLogTab(log) === selectedTab),
    [debugLogs, selectedTab]
  );

  const toggleExpanded = (logId: string) =>
    setExpandedLogIds((current) =>
      current.includes(logId) ? current.filter((item) => item !== logId) : [...current, logId]
    );

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={[styles.toggleButton, { borderColor: colors.lineBright, backgroundColor: colors.glass }]}
        onPress={() => setOpen((current) => !current)}
      >
        <Text style={[styles.toggleText, { color: colors.sand }]}>
          {open ? "Hide debug" : `Debug console (${debugLogs.length})`}
        </Text>
      </Pressable>

      {open ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleWrap}>
              <Text style={styles.panelTitle}>Live debug</Text>
              <Text style={styles.panelHint}>
                Full API payloads, planner traces, and price snapshots captured on this device.
              </Text>
            </View>
            <Pressable onPress={clearDebugLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
          >
            {tabs.map((tab) => {
              const active = tab.id === selectedTab;
              return (
                <Pressable
                  key={tab.id}
                  style={[
                    styles.tabButton,
                    active ? styles.tabButtonActive : undefined,
                  ]}
                  onPress={() => setSelectedTab(tab.id)}
                >
                  <Text style={[styles.tabText, active ? styles.tabTextActive : undefined]}>
                    {tab.label}
                  </Text>
                  <Text style={[styles.tabCount, active ? styles.tabCountActive : undefined]}>
                    {tab.count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView style={styles.logs} contentContainerStyle={styles.logsContent} nestedScrollEnabled>
            {visibleLogs.length === 0 ? (
              <Text style={styles.emptyText}>
                {debugLogs.length === 0
                  ? "No debug events yet."
                  : locale === "ko"
                    ? "이 탭에 해당하는 로그가 없어요."
                    : "No logs in this tab."}
              </Text>
            ) : (
              visibleLogs.map((log) => {
                const payloadOpen = expandedLogIds.includes(log.id);
                return (
                <View
                  key={log.id}
                  style={[
                    styles.logCard,
                    log.stage === "error"
                      ? styles.errorCard
                      : log.kind === "price"
                        ? styles.priceCard
                        : log.kind === "planner"
                          ? styles.plannerCard
                          : undefined,
                  ]}
                >
                  <View style={styles.logMetaRow}>
                    <Text style={styles.logBadge}>
                      {log.kind.toUpperCase()} / {log.stage.toUpperCase()}
                    </Text>
                    <Text style={styles.logTime}>{formatTimestamp(log.createdAt)}</Text>
                  </View>
                  <Text style={styles.logLabel}>{log.label}</Text>
                  {log.traceId ? <Text style={styles.traceId}>trace {log.traceId}</Text> : null}
                  {log.summary ? <Text style={styles.logSummary}>{log.summary}</Text> : null}
                  {log.payload !== undefined ? (
                    <>
                      <Pressable
                        style={styles.payloadToggle}
                        onPress={() => toggleExpanded(log.id)}
                      >
                        <Text style={styles.payloadToggleText}>
                          {payloadOpen
                            ? locale === "ko"
                              ? "payload 숨기기"
                              : "Hide payload"
                            : locale === "ko"
                              ? "payload 보기"
                              : "View payload"}
                        </Text>
                      </Pressable>
                      {payloadOpen ? (
                        <Text style={styles.payloadText} selectable>
                          {JSON.stringify(log.payload, null, 2)}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </View>
              )})
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  toggleButton: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "800",
  },
  panel: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: "rgba(6,19,29,0.86)",
    padding: spacing.md,
    gap: spacing.sm,
  },
  panelHeader: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  panelTitleWrap: {
    flex: 1,
    gap: 4,
  },
  panelTitle: {
    color: PANEL_TEXT,
    fontSize: 16,
    fontWeight: "800",
  },
  panelHint: {
    color: PANEL_HINT,
    fontSize: 12,
    lineHeight: 18,
  },
  clearButton: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    backgroundColor: PANEL_CLEAR_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
  },
  clearButtonText: {
    color: PANEL_TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  logs: {
    maxHeight: 520,
  },
  logsContent: {
    gap: spacing.sm,
  },
  tabRow: {
    gap: spacing.xs,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: PANEL_TAB_BG,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  tabButtonActive: {
    borderColor: PANEL_TAB_ACTIVE_BORDER,
    backgroundColor: PANEL_TAB_ACTIVE_BG,
  },
  tabText: {
    color: PANEL_TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  tabTextActive: {
    color: PANEL_BADGE,
  },
  tabCount: {
    color: PANEL_HINT,
    fontSize: 11,
    fontWeight: "700",
  },
  tabCountActive: {
    color: PANEL_BADGE,
  },
  emptyText: {
    color: PANEL_EMPTY,
    lineHeight: 20,
  },
  logCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: spacing.md,
    gap: spacing.xs,
  },
  errorCard: {
    borderColor: "rgba(255,122,69,0.55)",
  },
  priceCard: {
    borderColor: "rgba(95,209,194,0.55)",
  },
  plannerCard: {
    borderColor: "rgba(255,186,0,0.55)",
  },
  logMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  logBadge: {
    color: PANEL_BADGE,
    fontSize: 11,
    fontWeight: "800",
  },
  logTime: {
    color: PANEL_TIME,
    fontSize: 11,
  },
  logLabel: {
    color: PANEL_TEXT,
    fontSize: 14,
    fontWeight: "800",
  },
  traceId: {
    color: PANEL_TRACE,
    fontSize: 11,
  },
  logSummary: {
    color: PANEL_SUMMARY,
    fontSize: 12,
    lineHeight: 18,
  },
  payloadText: {
    color: PANEL_SMOKE,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "monospace",
  },
  payloadToggle: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  payloadToggleText: {
    color: PANEL_BADGE,
    fontSize: 11,
    fontWeight: "700",
  },
});
