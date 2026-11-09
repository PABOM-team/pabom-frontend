import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { petQueries, petSpeciesLine } from "@/entities/pet";
import { routineQueries } from "@/entities/routine";
import { speciesQueries, stageName, useSpeciesMap } from "@/entities/species";
import { RoutineEditSheet, RoutineRow } from "@/features/routine-editor";
import { CARE_DISCLAIMER } from "@pabom/core/domain/care";
import { SEX_SYMBOL, SPECIES_LABEL } from "@pabom/core/domain/pet";
import { isKnownStage } from "@pabom/core/domain/species";
import { Button } from "@/shared/ui/button";
import { Avatar, Skeleton, StateMessage } from "@/shared/ui/display";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";

/**
 * SCR-P03 체크 리스트(기본 관리 일정) 확인·수정.
 * 등록 직후(?from=register)에는 '이대로 시작하기'로 오늘 할 일을 시작한다.
 */
export function RoutinesScreen() {
  const { petId, from, edit } = useLocalSearchParams<{
    petId: string;
    from?: string;
    edit?: string;
  }>();
  const fromRegister = from === "register";
  const [editId, setEditId] = useState<string | null>(edit ?? null);

  const species = useSpeciesMap();
  const detail = useQuery(petQueries.detail(petId));
  const routines = useQuery(routineQueries.list(petId));
  const standards = useQuery({
    ...speciesQueries.careStandards(detail.data?.pet.speciesId ?? "crested_gecko"),
    enabled: Boolean(detail.data),
  });
  const defaultFoodOf = (careItem: string) =>
    standards.data?.standards.find((s) => s.careItem === careItem && s.defaultFoodName)
      ?.defaultFoodName ?? null;
  const pet = detail.data?.pet;

  const editing = routines.data?.find((r) => r.id === editId) ?? null;
  const offCount = routines.data?.filter((r) => !r.enabled).length ?? 0;
  const stage = pet ? stageName(species.get(pet.speciesId), pet.lifeStageCode) : "";
  const stageUnknown = pet ? !isKnownStage(pet.lifeStageCode) : false;

  return (
    <Screen>
      <TopBar
        title={pet ? `${pet.name}의 체크 리스트` : "체크 리스트"}
        onLeading={fromRegister ? () => router.replace("/home") : undefined}
        fallbackHref={{ pathname: "/pets/[petId]", params: { petId } }}
      />
      <ScreenBody>
        {detail.isPending || routines.isPending ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={76} />
            <Skeleton height={240} />
          </View>
        ) : detail.isError || routines.isError || !pet ? (
          <StateMessage
            title="체크 리스트를 불러오지 못했어요"
            action={{
              label: "다시 시도",
              onPress: () => {
                void detail.refetch();
                void routines.refetch();
              },
            }}
          />
        ) : (
          <>
            <View style={styles.petCard}>
              <Avatar src={pet.photoUrl} size={52} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.nameRow}>
                  <Text variant="title-xs">{pet.name}</Text>
                  <Text variant="body-lg" color={semantic.primary}>
                    {SEX_SYMBOL[pet.sex]}
                  </Text>
                </View>
                <Text variant="body-md" color={semantic.mutedForeground} numberOfLines={1}>
                  {petSpeciesLine(pet)} · {stage}
                </Text>
              </View>
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  router.push({ pathname: "/pets/[petId]/edit", params: { petId: pet.id } })
                }
                style={{ flexShrink: 0 }}
              >
                <Text variant="body-lg" weight="medium" color={semantic.primary}>
                  정보 수정
                </Text>
              </Pressable>
            </View>

            {routines.data.length ? (
              <>
                <Text variant="body-lg" color={semantic.secondaryText} style={styles.intro}>
                  {stageUnknown
                    ? `단계를 확인하기 전이라 ${SPECIES_LABEL[pet.speciesId]}·어린 개체 기준이에요. 체중을 재면 다시 제안해 드려요.`
                    : `${SPECIES_LABEL[pet.speciesId]}·${stage}에 맞춘 체크 리스트예요.`}{" "}
                  {offCount ? `${offCount}개 항목이 꺼져 있어요.` : "모두 켜져 있어요."} 필요 없는
                  항목만 꺼 주세요.
                </Text>

                <View style={{ marginTop: 8 }}>
                  {routines.data.map((routine) => (
                    <RoutineRow
                      key={routine.id}
                      routine={routine}
                      fallbackFoodName={defaultFoodOf(routine.careItem)}
                      onEdit={() => setEditId(routine.id)}
                    />
                  ))}
                </View>
              </>
            ) : (
              // 개체 등록은 일정을 만들지 않는다. TODO 체크리스트 API가 생기면 문구를 정한다
              <StateMessage compact title="아직 체크 리스트가 없어요" />
            )}

            <Text variant="body-md" color={semantic.mutedForeground} style={styles.disclaimer}>
              <Text
                variant="body-md"
                weight="medium"
                color={semantic.primary}
                accessibilityRole="link"
                onPress={() =>
                  router.push({
                    pathname: "/settings/guidelines/[speciesId]",
                    params: { speciesId: pet.speciesId },
                  })
                }
              >
                관리 가이드라인 보기 ›
              </Text>{" "}
              · {CARE_DISCLAIMER}
            </Text>
          </>
        )}
      </ScreenBody>
      {fromRegister ? (
        <ScreenFooter>
          <Button size="xl" onPress={() => router.replace("/home")}>
            이대로 시작하기
          </Button>
        </ScreenFooter>
      ) : null}
      <RoutineEditSheet routine={editing} onOpenChange={(open) => !open && setEditId(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  petCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.xl,
    borderWidth: 1.3,
    borderColor: semantic.input,
    padding: 14,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  intro: { marginTop: 14, lineHeight: 24 },
  disclaimer: { marginTop: 16, lineHeight: 20 },
});
