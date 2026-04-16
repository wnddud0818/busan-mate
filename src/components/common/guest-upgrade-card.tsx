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
    if (!email) {
      return;
    }
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
      <Text style={styles.title}>
        {locale === "ko" ? "공유/평점용 로그인 업그레이드" : "Upgrade to publish and rate"}
      </Text>
      <Text style={styles.copy}>
        {locale === "ko"
          ? "이메일 링크를 받아 로그인하면 일정을 게시하고 평점을 남길 수 있습니다."
          : "Receive a magic link by email to publish routes and leave ratings."}
      </Text>
      <TextInput
        nativeID="guest-upgrade-email-input"
        value={email}
        onChangeText={setEmail}
        placeholder={locale === "ko" ? "이메일 주소" : "Email address"}
        placeholderTextColor="rgba(248,251,253,0.45)"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <Pressable onPress={submit} style={styles.button} disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? (locale === "ko" ? "전송 중..." : "Sending...") : locale === "ko" ? "이메일 링크 보내기" : "Send magic link"}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(95,209,194,0.12)",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(95,209,194,0.24)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.cloud,
    fontSize: 16,
    fontWeight: "800",
  },
  copy: {
    color: "rgba(248,251,253,0.76)",
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.cloud,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  button: {
    borderRadius: radii.md,
    backgroundColor: colors.mint,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonText: {
    color: colors.navy,
    fontWeight: "800",
  },
});
