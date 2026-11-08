import { getErrorMessage } from "@pabom/core/api/errors";
import { env } from "@pabom/core/config/env";
import { colors, radius, spacing, toNativeTextStyle, typography } from "@pabom/core/design/tokens";
import { SPECIES_LABEL } from "@pabom/core/domain/species";
import { speciesQueries } from "@pabom/core/entities/species";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * 첫 화면: 공유 코드가 앱에서도 그대로 도는지 보여 주는 스모크 화면.
 * 종 목록(GET /species)은 로그인 없이 부를 수 있어 백엔드 연결·zod 검증·쿼리 캐시를 한 번에 확인한다.
 * 실제 홈(오늘 할 일)은 로그인 흐름(카카오·구글 → 딥링크)이 붙은 뒤에 그린다.
 */
export default function IndexScreen() {
  const species = useQuery(speciesQueries.list());

  return (
    <>
      <Stack.Screen options={{ title: "파봄" }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>지원하는 종</Text>
        <Text style={styles.caption}>
          {env.apiBaseUrl ? `백엔드 ${env.apiBaseUrl}` : "EXPO_PUBLIC_API_BASE_URL 이 비어 있어요"}
        </Text>

        {species.isPending ? (
          <ActivityIndicator color={colors.primary[500]} style={styles.block} />
        ) : species.isError ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{getErrorMessage(species.error)}</Text>
            <Pressable onPress={() => species.refetch()} style={styles.retry}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : (
          species.data.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{SPECIES_LABEL[item.id]}</Text>
              <Text style={styles.cardSub}>
                {item.lifeStages.map((stage) => stage.name).join(" · ")}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.gutter, gap: 12 },
  title: { ...toNativeTextStyle(typography.title.sm), color: colors.gray[900] },
  caption: { ...toNativeTextStyle(typography.body.md), color: colors.gray[500] },
  block: { marginTop: 24 },
  card: {
    borderWidth: 1.3,
    borderColor: colors.gray[300],
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
  },
  cardTitle: {
    ...toNativeTextStyle(typography.body.xl),
    fontWeight: "700",
    color: colors.gray[900],
  },
  cardSub: { ...toNativeTextStyle(typography.body.md), color: colors.gray[500] },
  errorCard: { borderColor: colors.red[200], backgroundColor: colors.red[50], gap: 10 },
  errorText: { ...toNativeTextStyle(typography.body.lg), color: colors.red[600] },
  retry: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary[500],
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  retryText: { ...toNativeTextStyle(typography.body.lg), fontWeight: "600", color: colors.white },
});
