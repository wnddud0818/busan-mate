import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { colors } from "../../src/theme/tokens";

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.navy,
          borderTopColor: "rgba(255,255,255,0.08)",
        },
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: "rgba(248,251,253,0.54)",
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{
          title: t("tabs.plan"),
          tabBarIcon: ({ color, size }) => <Feather name="map" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t("tabs.library"),
          tabBarIcon: ({ color, size }) => <Feather name="bookmark" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: t("tabs.ranking"),
          tabBarIcon: ({ color, size }) => <Feather name="trending-up" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
