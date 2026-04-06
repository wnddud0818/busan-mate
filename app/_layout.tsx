import "../src/lib/i18n";
import "../src/services/location-tasks";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useBootstrap } from "../src/hooks/use-bootstrap";
import { queryClient } from "../src/lib/query-client";
import { colors } from "../src/theme/tokens";

export default function RootLayout() {
  const ready = useBootstrap();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy, justifyContent: "center", alignItems: "center" }}>
        <StatusBar style="light" />
        <Text style={{ color: colors.cloud, fontSize: 18, fontWeight: "700" }}>Busan Mate</Text>
        <Text style={{ color: "rgba(248,251,253,0.7)", marginTop: 8 }}>Loading your trip desk...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.navy },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="itinerary/[id]" />
          <Stack.Screen name="trip/[sessionId]" />
          <Stack.Screen name="trip/[sessionId]/guide" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
