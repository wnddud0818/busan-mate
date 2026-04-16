import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppStore } from "../../stores/app-store";
import { radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";

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

export const DebugPanel = () => {
  const colors = useColors();
  const debugLogs = useAppStore((state) => state.debugLogs);
  const clearDebugLogs = useAppStore((state) => state.actions.clearDebugLogs);
  const [open, setOpen] = useState(debugLogs.length > 0);

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

          <ScrollView style={styles.logs} contentContainerStyle={styles.logsContent} nestedScrollEnabled>
            {debugLogs.length === 0 ? (
              <Text style={styles.emptyText}>No debug events yet.</Text>
            ) : (
              debugLogs.map((log) => (
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
                    <Text style={styles.payloadText} selectable>
                      {JSON.stringify(log.payload, null, 2)}
                    </Text>
                  ) : null}
                </View>
              ))
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
});
