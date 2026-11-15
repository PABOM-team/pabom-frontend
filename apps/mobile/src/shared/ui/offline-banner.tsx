import { useNetworkState } from "expo-network";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExclamationIcon } from "./icons";
import { Text } from "./text";
import { semantic, spacing } from "./theme";

/**
 * 연결이 끊기면 위쪽에 붙는 배너 (C5-1). 연결되면 저절로 사라진다.
 * 상태 표시줄 뒤까지 검은 바탕을 칠하므로 연결돼 있을 때는 아무것도 그리지 않는다
 */
export function OfflineBanner() {
  const network = useNetworkState();
  const insets = useSafeAreaInsets();
  // 아직 모르면(undefined) 연결된 것으로 본다
  const online = network.isInternetReachable ?? network.isConnected ?? true;
  if (online) return null;
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: semantic.inverse }}>
      <Banner />
    </View>
  );
}

function Banner() {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.left}>
        <ExclamationIcon size={16} color={semantic.inverseForeground} />
        <Text variant="body-md" weight="medium" color={semantic.inverseForeground}>
          인터넷 연결이 끊겼어요
        </Text>
      </View>
      <Text variant="body-md" weight="medium" color="rgba(255,255,255,0.8)">
        연결되면 다시 불러와요
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: semantic.inverse,
    paddingHorizontal: spacing.gutter,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 4 },
});
