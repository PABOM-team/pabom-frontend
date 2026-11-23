import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/shared/ui/text";
import { alpha, semantic } from "@/shared/ui/theme";
import { TABS, type TabMeta } from "./tab-icons";
import type { TabBarViewProps } from "./types";

const BAR_HEIGHT = 80;
const INDICATOR_WIDTH = 64;
const INDICATOR_HEIGHT = 32;

/**
 * Android 하단 탭 (Material 3 Navigation bar). 화면 아래에 붙은 막대이고,
 * 고른 탭은 아이콘 뒤 알약(indicator)이 가운데서 옆으로 펼쳐지며 라벨이 굵어진다.
 * 높이 80dp · indicator 64×32dp · 누르면 물결(ripple)
 */
export const NavigationBar = ({ routes, activeIndex, onSelect }: TabBarViewProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const active = index === activeIndex;
        return (
          <NavigationItem
            key={route.key}
            tab={tab}
            active={active}
            onPress={() => onSelect(route.key, active)}
          />
        );
      })}
    </View>
  );
};

const NavigationItem = ({
  tab,
  active,
  onPress,
}: {
  tab: TabMeta;
  active: boolean;
  onPress: () => void;
}) => {
  const [progress] = useState(() => new Animated.Value(active ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: true,
    }).start();
  }, [active, progress]);

  const Icon = active ? tab.activeIcon : tab.icon;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
      onPress={onPress}
      style={styles.item}
    >
      <View style={styles.indicatorSlot}>
        <Animated.View
          style={[
            styles.indicator,
            {
              opacity: progress,
              transform: [
                { scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
            },
          ]}
        />
        <Pressable
          onPress={onPress}
          android_ripple={{ color: alpha(semantic.primary, 0.16), borderless: false }}
          importantForAccessibility="no"
          style={styles.ripple}
        >
          <Icon size={24} color={active ? semantic.primary : semantic.mutedForeground} />
        </Pressable>
      </View>
      <Text
        variant="body-md"
        weight={active ? "semibold" : "medium"}
        color={active ? semantic.foreground : semantic.mutedForeground}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: semantic.input,
    backgroundColor: semantic.card,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 12,
    paddingBottom: 16,
  },
  indicatorSlot: {
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderRadius: INDICATOR_HEIGHT / 2,
    overflow: "hidden",
  },
  indicator: { ...StyleSheet.absoluteFill, backgroundColor: semantic.primarySoft },
  ripple: { flex: 1, alignItems: "center", justifyContent: "center" },
});
