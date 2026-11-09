import { Tabs } from "expo-router";
import type { ComponentProps, JSX } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarIcon, CogIcon, PawPrintIcon, type IconProps } from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const TABS: Record<string, { label: string; icon: (props: IconProps) => JSX.Element }> = {
  home: { label: "오늘", icon: CalendarIcon },
  pets: { label: "개체", icon: PawPrintIcon },
  settings: { label: "설정", icon: CogIcon },
};

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: semantic.background } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="pets" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

/** 하단 탭 3개. 웹 BottomTabBar 와 같은 모양 (60px + 안전 영역) */
function BottomTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const active = state.index === index;
        const Icon = tab.icon;
        const color = active ? semantic.primary : semantic.mutedForeground;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => navigateToTab(route.key)}
            style={styles.tab}
          >
            <Icon color={color} strokeWidth={active ? 2.4 : 2} />
            <Text variant="body-md" weight={active ? "semibold" : "medium"} color={color}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    backgroundColor: semantic.background,
  },
  tab: { flex: 1, height: 60, alignItems: "center", justifyContent: "center", gap: 4 },
});
