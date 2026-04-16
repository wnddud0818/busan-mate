import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "../../../src/components/common/screen";
import { hasSupabaseConfig } from "../../../src/config/env";
import { answerGuideQuestion } from "../../../src/services/guide-service";
import { useAppStore } from "../../../src/stores/app-store";
import { radii, spacing } from "../../../src/theme/tokens";
import { useColors } from "../../../src/theme/use-colors";
import { createId } from "../../../src/utils/id";

const QUICK_KO = ["이 장소가 유명한 이유?", "다음 이동 시간은?", "실내 장소 추천"];
const QUICK_EN = ["Why is this place famous?", "When do I leave next?", "Suggest an indoor backup"];

export default function GuideChatPage() {
  const colors = useColors();
  const locale = useAppStore((state) => state.locale);
  const profile = useAppStore((state) => state.userProfile);
  const activeSession = useAppStore((state) => state.activeSession);
  const itinerary = useAppStore((state) =>
    state.itineraries.find((item) => item.id === activeSession?.itineraryId)
  );
  const messages = useAppStore((state) =>
    state.chatMessages.filter((message) => message.itineraryId === activeSession?.itineraryId)
  );
  const { addChatMessage, updateSession } = useAppStore((state) => state.actions);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const currentStop = useMemo(() => {
    if (!itinerary || !activeSession) return undefined;
    return itinerary.days[activeSession.currentDay - 1]?.stops[activeSession.currentStopOrder - 1];
  }, [activeSession, itinerary]);

  if (!itinerary || !activeSession || !currentStop) {
    return (
      <Screen title={locale === "ko" ? "가이드 Q&A" : "Guide Q&A"} showBack>
        <Text style={{ color: colors.mist }}>
          {locale === "ko" ? "가이드 컨텍스트를 찾을 수 없어요." : "Guide context is unavailable."}
        </Text>
      </Screen>
    );
  }

  const sendMessage = async (preset?: string) => {
    const question = preset ?? input.trim();
    if (!question) return;

    const userSyncStatus: "pending" | "synced" = hasSupabaseConfig ? "pending" : "synced";

    const userMessage = {
      id: createId(),
      itineraryId: itinerary.id,
      sessionId: activeSession.id,
      threadRemoteId: activeSession.chatThreadRemoteId,
      role: "user" as const,
      content: question,
      createdAt: new Date().toISOString(),
      syncStatus: userSyncStatus,
    };

    addChatMessage(userMessage);
    setInput("");
    setLoading(true);

    try {
      const answer = await answerGuideQuestion({
        question,
        context: { itinerary, stop: currentStop, locale },
        session: activeSession,
        userProfile: profile,
        userMessageId: userMessage.id,
      });

      addChatMessage({
        ...userMessage,
        threadRemoteId: answer.threadRemoteId ?? userMessage.threadRemoteId,
        syncStatus: answer.syncStatus,
      });

      if (answer.threadRemoteId && activeSession.chatThreadRemoteId !== answer.threadRemoteId) {
        updateSession({ ...activeSession, chatThreadRemoteId: answer.threadRemoteId });
      }

      addChatMessage({
        id: answer.assistantClientId ?? createId(),
        remoteId: answer.assistantRemoteId,
        itineraryId: itinerary.id,
        sessionId: activeSession.id,
        threadRemoteId: answer.threadRemoteId,
        role: "assistant",
        content: `${answer.answer}\n\n${answer.citations.join(" · ")}`,
        createdAt: new Date().toISOString(),
        syncStatus: answer.syncStatus,
      });
    } catch {
      addChatMessage({
        id: createId(),
        itineraryId: itinerary.id,
        sessionId: activeSession.id,
        role: "assistant",
        content: locale === "ko"
          ? "오류가 발생했어요. 다시 시도해 주세요."
          : "Something went wrong. Please try again.",
        createdAt: new Date().toISOString(),
        syncStatus: "failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const quickButtons = locale === "ko" ? QUICK_KO : QUICK_EN;

  return (
    <Screen
      title={locale === "ko" ? "가이드 Q&A" : "Guide Q&A"}
      subtitle={currentStop.place.name[locale]}
      scroll={false}
      showBack
    >
      <View style={styles.container}>
        <View style={styles.quickRow}>
          {quickButtons.map((question) => (
            <Pressable
              key={question}
              style={[styles.quickBtn, { borderColor: colors.line, backgroundColor: colors.glass }]}
              onPress={() => sendMessage(question)}
            >
              <Text style={[styles.quickText, { color: colors.cloud }]}>{question}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={36} color={colors.lineBright} />
              <Text style={[styles.emptyText, { color: colors.mist }]}>
                {locale === "ko"
                  ? "현재 장소나 다음 이동 시간에 대해 자유롭게 물어보세요."
                  : "Ask about the current stop, local story, or the next transfer."}
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.bubble,
                  message.role === "user"
                    ? [styles.userBubble, { backgroundColor: colors.coral }]
                    : [styles.assistantBubble, { backgroundColor: colors.glass, borderColor: colors.line }],
                ]}
              >
                {message.role === "assistant" ? (
                  <View style={styles.assistantHeader}>
                    <Feather name="cpu" size={11} color={colors.mint} />
                    <Text style={[styles.assistantLabel, { color: colors.mint }]}>
                      {locale === "ko" ? "가이드" : "Guide"}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.bubbleText, { color: message.role === "user" ? colors.navy : colors.cloud }]}>
                  {message.content}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            nativeID="guide-question-input"
            value={input}
            onChangeText={setInput}
            style={[styles.input, { borderColor: colors.line, backgroundColor: colors.input, color: colors.cloud }]}
            placeholder={locale === "ko" ? "질문을 입력하세요." : "Type your question"}
            placeholderTextColor={colors.fog}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: colors.mint }, loading && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={loading}
          >
            {loading ? (
              <Text style={[styles.sendText, { color: colors.navy }]}>...</Text>
            ) : (
              <Feather name="send" size={18} color={colors.navy} />
            )}
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.sm },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickBtn: {
    borderRadius: radii.pill, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  quickText: { fontSize: 12, fontWeight: "600" },
  messages: { flex: 1 },
  messagesContent: { gap: spacing.sm, paddingBottom: spacing.md, flexGrow: 1 },
  emptyState: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: spacing.md, paddingVertical: spacing.xl,
  },
  emptyText: { lineHeight: 22, textAlign: "center", fontSize: 14, paddingHorizontal: spacing.lg },
  bubble: { padding: spacing.md, borderRadius: radii.md, maxWidth: "88%", gap: 6 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: "flex-start", borderWidth: 1, borderBottomLeftRadius: 4 },
  assistantHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  assistantLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  bubbleText: { lineHeight: 20, fontSize: 14 },
  inputRow: { flexDirection: "row", gap: spacing.sm, paddingBottom: spacing.md },
  input: {
    flex: 1, borderRadius: radii.md, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 14,
  },
  sendBtn: {
    borderRadius: radii.md, paddingHorizontal: spacing.md,
    alignItems: "center", justifyContent: "center", minWidth: 50,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendText: { fontWeight: "800", fontSize: 16 },
});
