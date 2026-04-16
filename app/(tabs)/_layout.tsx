import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useColors } from "../../src/theme/use-colors";

function TabIcon({
  name,
  color,
  label,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: string;
  label: string;
  focused: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.tabItem, focused && { backgroundColor: `${colors.coral}1E` }]}>
      <Feather name={name} size={20} color={color} />
      <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          height: Platform.OS === "ios" ? 84 : 60,
          paddingBottom: Platform.OS === "ios" ? 24 : 6,
          paddingTop: 6,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.fog,
        tabBarIconStyle: styles.tabIconSlot,
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="map" color={color} label={t("tabs.plan")} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bookmark" color={color} label={t("tabs.library")} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="trending-up" color={color} label={t("tabs.ranking")} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconSlot: {
    width: 72,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
