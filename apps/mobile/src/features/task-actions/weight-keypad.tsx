import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";

export type WeightKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";

const ROWS: readonly (readonly WeightKey[])[] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "back"],
];

/** 체중 g 은 소수 한 자리, 다섯 자리(5000g)까지 */
const MAX_INT_DIGITS = 4;

/** 키 하나를 누른 뒤의 값. 잘못된 입력(두 번째 점, 소수 둘째 자리 등)은 무시한다 */
export const pressWeightKey = (value: string, key: WeightKey) => {
  if (key === "back") return value.slice(0, -1);
  if (key === ".") return value.includes(".") ? value : `${value || "0"}.`;
  const [int = "", decimal] = value.split(".");
  if (decimal !== undefined) return decimal.length >= 1 ? value : `${value}${key}`;
  if (int === "0") return key;
  return int.length >= MAX_INT_DIGITS ? value : `${value}${key}`;
};

const BackspaceIcon = () => (
  <Svg width={26} height={20} viewBox="0 0 26 20" fill="none">
    <Path
      d="M8.5 2h13.5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8.5L2 10l6.5-8Z"
      stroke={semantic.foreground}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="m12 7 6 6m0-6-6 6"
      stroke={semantic.foreground}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

/** 숫자 키패드 (Figma 체중 시트 '숫자 키패드'). 시스템 키보드 대신 시트 안에 붙는다 */
export function WeightKeypad({ onKey }: { onKey: (key: WeightKey) => void }) {
  return (
    <View style={styles.pad} accessibilityLabel="숫자 키패드">
      {ROWS.map((row) => (
        <View key={row.join("")} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="keyboardkey"
              accessibilityLabel={key === "back" ? "지우기" : key === "." ? "소수점" : key}
              onPress={() => onKey(key)}
              style={({ pressed }) => [styles.key, pressed && styles.pressed]}
            >
              {key === "back" ? (
                <BackspaceIcon />
              ) : (
                <Text variant="title-sm" weight="medium">
                  {key}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingTop: 8 },
  row: { flexDirection: "row" },
  key: {
    flex: 1,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
  },
  pressed: { backgroundColor: semantic.muted },
});
