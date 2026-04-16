import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";

export const GuestUpgradeCard = ({
  locale,
  onSend,
}: {
  locale: "ko" | "en";
  onSend: (email: string) => Promise<void>;
}) => {
  const colors = useColors();
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
    <View style={[styles.card, { backgroundColor: colors.mintLight, borderColor: colors.mintBorder }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: colors.mintLight, borderColor: colors.mintBorder }]}>
          <Feather name="user-check" size={18} color={colors.mint} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.cloud }]}>
            {locale === "ko" ? "계정 업그레이드" : "Upgrade account"}
          </Text>
          <Text style={[styles.copy, { color: colors.mist }]}>
            {locale === "ko"
              ? "이메일 링크로 로그인하면 일정 공유와 평점 작성이 가능해요."
              : "Sign in with a magic link to publish routes and leave ratings."}
          </Text>
        </View>
      </View>

      <TextInput
        nativeID="guest-upgrade-email-input"
        value={email}
        onChangeText={setEmail}
        placeholder={locale === "ko" ? "이메일 주소 입력" : "Enter email address"}
        placeholderTextColor={colors.fog}
        autoCapitalize="none"
        keyboardType="email-address"
        style={[styles.input, { borderColor: colors.lineBright, backgroundColor: colors.input, color: colors.cloud }]}
      />

      <Pressable
        onPress={submit}
        style={[styles.button, { backgroundColor: colors.mint }, loading && styles.buttonDisabled]}
        disabled={loading}
      >
        <Feather name="send" size={15} color={colors.navy} />
        <Text style={[styles.buttonText, { color: colors.navy }]}>
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
    borderRadius: radii.lg,
    borderWidth: 1,
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
  },
  copy: {
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
  },
  button: {
    borderRadius: radii.md,
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
    fontWeight: "800",
    fontSize: 15,
  },
});
