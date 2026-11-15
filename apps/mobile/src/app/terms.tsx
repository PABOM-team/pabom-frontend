import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Segmented } from "@/shared/ui/display";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";

type Tab = "terms" | "privacy";

/** [미확정] 약관 원문은 11/20 확정 뒤 게시. 그 전까지 목차와 회색 막대로 자리만 잡는다 */
const DOCS: Record<Tab, { title: string; version: string; sections: string[] }> = {
  terms: {
    title: "이용약관",
    version: "시행일 2026-10-12 · 버전 v1.0 (예시)",
    sections: ["제1조 목적", "제2조 정의", "제3조 서비스 내용"],
  },
  privacy: {
    title: "개인정보 처리방침",
    version: "시행일 2026-10-12 · 버전 v1.0 (예시)",
    sections: ["1. 수집하는 정보", "2. 이용 목적", "3. 보관 기간과 파기"],
  },
};

/** SCR-S03 이용약관·개인정보 처리방침 */
export default function TermsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: Tab = params.tab === "privacy" ? "privacy" : "terms";
  const doc = DOCS[tab];

  return (
    <Screen>
      <TopBar title={doc.title} fallbackHref="/settings" />
      <ScreenBody>
        <Segmented
          label="문서"
          options={[
            { value: "terms", label: "이용약관" },
            { value: "privacy", label: "개인정보 처리방침" },
          ]}
          value={tab}
          onChange={(next) => router.setParams({ tab: next === "privacy" ? "privacy" : undefined })}
        />
        <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 12 }}>
          {doc.version}
        </Text>
        <View style={styles.toc}>
          <Text variant="body-lg" weight="bold" style={{ marginBottom: 4 }}>
            목차
          </Text>
          {doc.sections.map((s) => (
            <Text key={s} variant="body-lg" color={semantic.primary} style={{ paddingVertical: 2 }}>
              {s}
            </Text>
          ))}
        </View>
        {/* 원문 확정 전이라 Figma처럼 앞 두 조만 막대로 보여 준다 */}
        {doc.sections.slice(0, 2).map((s) => (
          <View key={s} style={{ marginTop: 20 }}>
            <Text variant="body-lg" weight="bold" style={{ marginBottom: 10 }}>
              {s}
            </Text>
            <View style={{ gap: 8 }} accessibilityLabel="원문 준비 중">
              {[100, 100, 100, 62].map((w, j) => (
                <View key={j} style={[styles.bar, { width: `${w}%` }]} />
              ))}
            </View>
          </View>
        ))}
        <Text variant="body-lg" weight="medium" color={semantic.primary} style={{ marginTop: 24 }}>
          이전 버전 보기
        </Text>
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toc: { marginTop: 12, borderRadius: radius.md, backgroundColor: semantic.muted, padding: 12 },
  bar: { height: 10, borderRadius: radius.full, backgroundColor: semantic.muted },
});
