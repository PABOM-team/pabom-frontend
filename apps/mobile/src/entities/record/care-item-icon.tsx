import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { CARE_ICON_XML, careIconOf } from "@/shared/ui/care-icons";
import { semantic } from "@/shared/ui/theme";

/**
 * 관리 항목 아이콘 칸 (Figma '할 일 아이콘': 회색 둥근 칸 + 그림). 그림은 할 일 아이콘과 같은 것을 쓴다.
 * 기본 36칸 · 22 그림, 기록 추가 타일은 56칸 · 34 그림
 */
export function CareItemIcon({ code, size = 36 }: { code: string; size?: number }) {
  const glyph = Math.round(size * 0.61);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { width: size, height: size, borderRadius: size * 0.3 }]}
    >
      <SvgXml xml={CARE_ICON_XML[careIconOf(code)]} width={glyph} height={glyph} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: semantic.screen,
  },
});
