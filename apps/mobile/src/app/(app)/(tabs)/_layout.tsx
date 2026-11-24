import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { TabBar } from "@/features/tab-bar";
import { semantic } from "@/shared/ui/theme";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <RoutedTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: semantic.screen } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="pets" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const RoutedTabBar = ({ state, navigateToTab }: BottomTabBarProps) => (
  <TabBar
    routes={state.routes}
    activeIndex={state.index}
    onSelect={(routeKey) => navigateToTab(routeKey)}
  />
);
