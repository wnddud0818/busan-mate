import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppStore } from "../../stores/app-store";
import { colors, radii, spacing } from "../../theme/tokens";

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

export const DebugPanel = () => {
  const debugLogs = useAppStore((state) => state.debugLogs);
  const clearDebugLogs = useAppStore((state) => state.actions.clearDebugLogs);
  const [open, setOpen] = useState(false);

  const visibleLogs = useMemo(() => debugLogs.slice(0, 12), [debugLogs]);

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.toggleButton} onPress={() => setOpen((current) => !current)}>
        <Text style={styles.toggleText}>{open ? "Hide debug" : `Debug console (${debugLogs.length})`}</Text>
      </Pressable>

      {open ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleWrap}>
              <Text style={styles.panelTitle}>Live debug</Text>
              <Text style={styles.panelHint}>Recent API request/response logs and price snapshots.</Text>
            </View>
            <Pressable onPress={clearDebugLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.logs} contentContainerStyle={styles.logsContent} nestedScrollEnabled>
            {visibleLogs.length === 0 ? (
              <Text style={styles.emptyText}>No debug events yet.</Text>
            ) : (
              visibleLogs.map((log) => (
                <View
                  key={log.id}
                  style={[
                    styles.logCard,
                    log.stage === "error"
                      ? styles.errorCard
                      : log.kind === "price"
                        ? styles.priceCard
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
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  toggleText: {
    color: colors.sand,
    fontSize: 13,
    fontWeight: "800",
  },
  panel: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
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
    color: colors.cloud,
    fontSize: 16,
    fontWeight: "800",
  },
  panelHint: {
    color: "rgba(248,251,253,0.68)",
    fontSize: 12,
    lineHeight: 18,
  },
  clearButton: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.line,
  },
  clearButtonText: {
    color: colors.cloud,
    fontSize: 12,
    fontWeight: "700",
  },
  logs: {
    maxHeight: 320,
  },
  logsContent: {
    gap: spacing.sm,
  },
  emptyText: {
    color: "rgba(248,251,253,0.65)",
    lineHeight: 20,
  },
  logCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
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
  logMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  logBadge: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: "800",
  },
  logTime: {
    color: "rgba(248,251,253,0.5)",
    fontSize: 11,
  },
  logLabel: {
    color: colors.cloud,
    fontSize: 14,
    fontWeight: "800",
  },
  traceId: {
    color: "rgba(248,251,253,0.45)",
    fontSize: 11,
  },
  logSummary: {
    color: colors.sand,
    fontSize: 12,
    lineHeight: 18,
  },
  payloadText: {
    color: colors.smoke,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "monospace",
  },
});
