import "../src/lib/i18n";
import "../src/services/location-tasks";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useBootstrap } from "../src/hooks/use-bootstrap";
import { queryClient } from "../src/lib/query-client";
import { useColors, useGradient } from "../src/theme/use-colors";

export default function RootLayout() {
  const ready = useBootstrap();
  const colors = useColors();
  const colorScheme = require("../src/stores/app-store").useAppStore(
    (state: { colorScheme: "light" | "dark" }) => state.colorScheme
  );

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, justifyContent: "center", alignItems: "center" }}>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <Text style={{ color: colors.cloud, fontSize: 18, fontWeight: "700" }}>Busan Mate</Text>
        <Text style={{ color: colors.mist, marginTop: 8 }}>Loading your trip desk...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.ink },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="itinerary/[id]" />
          <Stack.Screen name="plan/ai-wizard" options={{ gestureEnabled: true }} />
          <Stack.Screen name="trip/[sessionId]" />
          <Stack.Screen name="trip/[sessionId]/guide" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
