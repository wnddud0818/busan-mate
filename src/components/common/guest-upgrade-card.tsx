import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";

export const GuestUpgradeCard = ({
  locale,
  onSend,
}: {
  locale: "ko" | "en";
  onSend: (email: string) => Promise<void>;
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await onSend(email);
      setEmail("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Feather name="user-check" size={18} color={colors.mint} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {locale === "ko" ? "계정 업그레이드" : "Upgrade account"}
          </Text>
          <Text style={styles.copy}>
            {locale === "ko"
              ? "이메일 링크로 로그인하면 일정 공유와 평점 작성이 가능해요."
              : "Sign in with a magic link to publish routes and leave ratings."}
          </Text>
        </View>
      </View>

      {/* 입력 */}
      <TextInput
        nativeID="guest-upgrade-email-input"
        value={email}
        onChangeText={setEmail}
        placeholder={locale === "ko" ? "이메일 주소 입력" : "Enter email address"}
        placeholderTextColor={colors.fog}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      {/* 버튼 */}
      <Pressable
        onPress={submit}
        style={[styles.button, loading && styles.buttonDisabled]}
        disabled={loading}
      >
        <Feather name="send" size={15} color={colors.navy} />
        <Text style={styles.buttonText}>
          {loading
            ? locale === "ko" ? "전송 중..." : "Sending..."
            : locale === "ko" ? "매직 링크 보내기" : "Send magic link"}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.mintLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(95,209,194,0.16)",
    borderWidth: 1,
    borderColor: colors.mintBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.cloud,
    fontSize: 15,
    fontWeight: "800",
  },
  copy: {
    color: "rgba(248,251,253,0.74)",
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.cloud,
    backgroundColor: "rgba(255,255,255,0.08)",
    fontSize: 14,
  },
  button: {
    borderRadius: radii.md,
    backgroundColor: colors.mint,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.navy,
    fontWeight: "800",
    fontSize: 15,
  },
});
