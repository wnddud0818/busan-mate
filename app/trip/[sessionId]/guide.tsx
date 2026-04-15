import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "../../../src/components/common/screen";
import { hasSupabaseConfig } from "../../../src/config/env";
import { answerGuideQuestion } from "../../../src/services/guide-service";
import { useAppStore } from "../../../src/stores/app-store";
import { colors, radii, spacing } from "../../../src/theme/tokens";
import { createId } from "../../../src/utils/id";

export default function GuideChatPage() {
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
    if (!itinerary || !activeSession) {
      return undefined;
    }

    return itinerary.days[activeSession.currentDay - 1]?.stops[activeSession.currentStopOrder - 1];
  }, [activeSession, itinerary]);

  if (!itinerary || !activeSession || !currentStop) {
    return (
      <Screen title="Guide chat">
        <Text style={{ color: "white" }}>Guide context is unavailable.</Text>
      </Screen>
    );
  }

  const sendMessage = async (preset?: string) => {
    const question = preset ?? input.trim();
    if (!question) {
      return;
    }

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
        context: {
          itinerary,
          stop: currentStop,
          locale,
        },
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
        updateSession({
          ...activeSession,
          chatThreadRemoteId: answer.threadRemoteId,
        });
      }

      addChatMessage({
        id: answer.assistantClientId ?? createId(),
        remoteId: answer.assistantRemoteId,
        itineraryId: itinerary.id,
        sessionId: activeSession.id,
        threadRemoteId: answer.threadRemoteId,
        role: "assistant",
        content: answer.citations.length > 0 ? `${answer.answer}\n\n${answer.citations.join("\n")}` : answer.answer,
        createdAt: new Date().toISOString(),
        syncStatus: answer.syncStatus,
      });
    } catch {
      addChatMessage({
        id: createId(),
        itineraryId: itinerary.id,
        sessionId: activeSession.id,
        role: "assistant",
        content:
          locale === "ko"
            ? "일시적인 오류가 발생했어요. 다시 시도해 주세요."
            : "Something went wrong. Please try again.",
        createdAt: new Date().toISOString(),
        syncStatus: "failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title={locale === "ko" ? "가이드 Q&A" : "Guide Q&A"}
      subtitle={currentStop.place.name[locale]}
      scroll={false}
    >
      <View style={styles.container}>
        <View style={styles.quickRow}>
          {(locale === "ko"
            ? ["여기가 왜 유명해?", "다음 이동 시간은 언제야?", "실내 대체 장소 추천해줘"]
            : ["Why is this place famous?", "When do I leave next?", "Suggest an indoor backup"]
          ).map((question) => (
            <Pressable key={question} style={styles.quickButton} onPress={() => sendMessage(question)}>
              <Text style={styles.quickText}>{question}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === "user" ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={styles.messageText}>{message.content}</Text>
            </View>
          ))}
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>
              {locale === "ko"
                ? "현재 장소 이야기나 다음 이동 시간을 물어보세요."
                : "Ask about the current stop, local story, or the next transfer."}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            style={styles.input}
            placeholder={locale === "ko" ? "질문을 입력해 주세요" : "Type your question"}
            placeholderTextColor="rgba(248,251,253,0.45)"
          />
          <Pressable style={styles.sendButton} onPress={() => sendMessage()} disabled={loading}>
            <Text style={styles.sendText}>{loading ? "..." : locale === "ko" ? "전송" : "Send"}</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  quickText: {
    color: colors.cloud,
    fontSize: 12,
    fontWeight: "700",
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: radii.md,
    maxWidth: "88%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.coral,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.line,
  },
  messageText: {
    color: colors.cloud,
    lineHeight: 20,
  },
  emptyText: {
    color: "rgba(248,251,253,0.6)",
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  input: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: colors.cloud,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sendButton: {
    backgroundColor: colors.mint,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    color: colors.navy,
    fontWeight: "800",
  },
});
