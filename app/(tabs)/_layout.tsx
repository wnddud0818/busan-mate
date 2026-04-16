import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { colors } from "../../src/theme/tokens";

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
  return (
    <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
      <Feather name={name} size={20} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#0A1A24",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.08)",
          height: Platform.OS === "ios" ? 84 : 60,
          paddingBottom: Platform.OS === "ios" ? 24 : 6,
          paddingTop: 6,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: "rgba(248,251,253,0.36)",
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
            <TabIcon
              name="trending-up"
              color={color}
              label={t("tabs.ranking")}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabItemFocused: {
    backgroundColor: "rgba(255,122,69,0.12)",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
