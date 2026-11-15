import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import { speciesQueries } from "@/entities/species";
import { CARE_DISCLAIMER, formatInterval, RECORD_KIND_LABEL } from "@pabom/core/domain/care";
import { EVIDENCE_LEVEL_LABEL, speciesIdSchema } from "@pabom/core/domain/species";
import { Skeleton, StateMessage } from "@/shared/ui/display";
import { ArrowUpRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenCenter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";

/** 표 다섯 칸의 너비 비율 (생애 단계 · 항목 · 주기 · 기록 · 근거) */
const COLUMNS = [1, 1.4, 1, 1, 1] as const;

/** SCR-S04 3 종 가이드라인. 표의 항목·주기는 확정 전 예시 */
export function SpeciesGuidelineScreen() {
  const params = useLocalSearchParams<{ speciesId: string }>();
  const parsed = speciesIdSchema.safeParse(params.speciesId);
  const speciesList = useQuery(speciesQueries.list());
  const table = useQuery({
    ...speciesQueries.careStandards(parsed.success ? parsed.data : "crested_gecko"),
    enabled: parsed.success,
  });
  const species = speciesList.data?.find((s) => s.id === params.speciesId);

  if (!parsed.success) {
    return (
      <Screen>
        <TopBar title="가이드라인" fallbackHref="/settings/guidelines" />
        <ScreenCenter>
          <StateMessage title="지원하지 않는 종이에요" />
        </ScreenCenter>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar
        title={species?.commonName ?? "가이드라인"}
        fallbackHref={{ pathname: "/settings/guidelines", params: { group: "lizard" } }}
      />
      <ScreenBody>
        {table.isPending || !species ? (
          <Skeleton height={288} />
        ) : table.isError ? (
          <StateMessage
            title="가이드라인을 불러오지 못했어요"
            action={{ label: "다시 시도", onPress: () => table.refetch() }}
          />
        ) : (
          <>
            <Text variant="body-md" color={semantic.mutedForeground}>
              관리 가이드라인 v{table.data.version}
              {table.data.effectiveFrom ? ` · ${table.data.effectiveFrom} 적용` : ""}
              {table.data.isDraft ? " (예시)" : ""}
            </Text>
            <View style={styles.table}>
              <View style={styles.headRow}>
                {["생애 단계", "항목", "주기", "기록", "근거"].map((h, i) => (
                  <View key={h} style={[styles.headCell, { flex: COLUMNS[i] }]}>
                    <Text variant="body-md" color={semantic.secondaryText}>
                      {h}
                    </Text>
                  </View>
                ))}
              </View>
              {species.lifeStages.map((stage) => {
                const rows = table.data.standards.filter((s) => s.lifeStageCode === stage.code);
                return (
                  <Fragment key={stage.code}>
                    {rows.map((row, i) => (
                      <View key={row.careItem} style={styles.bodyRow}>
                        <View style={[styles.cell, { flex: COLUMNS[0] }]}>
                          <Text variant="body-lg">{i === 0 ? stage.name : ""}</Text>
                        </View>
                        <View style={[styles.cell, { flex: COLUMNS[1] }]}>
                          <Text variant="body-lg">{row.careItemName}</Text>
                          {row.defaultEnabled ? null : (
                            <Text variant="body-md" color={semantic.mutedForeground}>
                              기본 꺼짐
                            </Text>
                          )}
                        </View>
                        <View style={[styles.cell, { flex: COLUMNS[2] }]}>
                          <Text variant="body-lg">{formatInterval(row.intervalDays)}</Text>
                        </View>
                        <View style={[styles.cell, { flex: COLUMNS[3] }]}>
                          <Text variant="body-lg">{RECORD_KIND_LABEL[row.recordKind]}</Text>
                        </View>
                        <View style={[styles.cell, { flex: COLUMNS[4] }]}>
                          <Text variant="body-md" color={semantic.secondaryText}>
                            {row.evidenceLevel ? EVIDENCE_LEVEL_LABEL[row.evidenceLevel] : "-"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </Fragment>
                );
              })}
            </View>
            {/* 성체로 보는 기준 (v1.2 명세 S04): 참고 체중·최소 나이는 프론트 상수 [백엔드 확인 필요] */}
            <View style={[styles.box, { marginTop: 16 }]}>
              <Text variant="body-md" weight="bold">
                성체로 보는 기준
              </Text>
              <Text variant="body-md" color={semantic.secondaryText} style={styles.relaxed}>
                체중이 더 늘지 않거나 {species.adultWeightG}g을 넘으면 다 자란 것으로 봐요.{" "}
                {species.adultCheckMinAgeMonths}개월 전에는 묻지 않아요.
              </Text>
            </View>
            <View style={[styles.box, { marginTop: 12 }]}>
              <Text variant="body-md" weight="bold">
                이렇게 만들었어요
              </Text>
              {table.data.references.map((ref) => (
                <View key={ref.title} style={styles.reference}>
                  <Text variant="body-md" color={semantic.secondaryText}>
                    {ref.title}
                  </Text>
                  <ArrowUpRightIcon size={14} color={semantic.secondaryText} />
                </View>
              ))}
              {table.data.reviewNote ? (
                <Text variant="body-md" color={semantic.primary} style={{ marginTop: 4 }}>
                  {table.data.reviewNote}
                </Text>
              ) : null}
            </View>
            <Text
              variant="body-md"
              color={semantic.mutedForeground}
              style={[styles.relaxed, { marginTop: 12 }]}
            >
              {CARE_DISCLAIMER}
            </Text>
          </>
        )}
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  table: { marginTop: 12 },
  headRow: { flexDirection: "row", backgroundColor: semantic.muted },
  headCell: { paddingHorizontal: 6, paddingVertical: 8 },
  bodyRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: semantic.border },
  cell: { paddingHorizontal: 6, paddingVertical: 10 },
  box: { padding: 14, borderRadius: radius.lg, backgroundColor: semantic.muted },
  relaxed: { marginTop: 4, lineHeight: 20 },
  reference: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
});
