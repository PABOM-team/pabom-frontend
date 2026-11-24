import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { petQueries, petSpeciesLine } from "@/entities/pet";
import { routineQueries } from "@/entities/routine";
import { speciesQueries, stageName, useSpeciesMap } from "@/entities/species";
import { FeedIntervalAsk, RoutineEditSheet, RoutineRow } from "@/features/routine-editor";
import { CARE_DISCLAIMER } from "@pabom/core/domain/care";
import { SEX_SYMBOL, SPECIES_LABEL } from "@pabom/core/domain/pet";
import { feedRoutineToAsk, type Routine } from "@pabom/core/domain/routine";
import { isKnownStage } from "@pabom/core/domain/species";
import { Button } from "@/shared/ui/button";
import { Avatar, Skeleton, StateMessage } from "@/shared/ui/display";
import { PencilIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";
import { ZoomPressable } from "@/shared/ui/zoom-link";

/**
 * SCR-P03 체크 리스트(기본 관리 일정) 확인·수정.
 * 회색 바탕 위 큰 제목(○○에게 맞는 할 일 N개) · 개체 줄 · 켜진 할 일 카드 · '필요하면 켜 보세요' 꺼진 할 일 카드.
 * 등록 직후(?from=register)에는 '할 일 N개로 시작하기'로 오늘 할 일을 시작한다.
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
  const stage = pet ? stageName(species.get(pet.speciesId), pet.lifeStageCode) : "";
  const stageUnknown = pet ? !isKnownStage(pet.lifeStageCode) : false;
  // 단계 확인 전이면 지금 먹이는 주기를 물어 급여 일정에 반영한다 (QA T03-06)
  const feedToAsk = stageUnknown ? feedRoutineToAsk(routines.data ?? []) : null;

  const enabledRoutines = routines.data?.filter((r) => r.enabled) ?? [];
  const disabledRoutines = routines.data?.filter((r) => !r.enabled) ?? [];
  const routineRow = (routine: Routine) => (
    <RoutineRow
      key={routine.id}
      routine={routine}
      fallbackFoodName={defaultFoodOf(routine.careItem)}
      onEdit={() => setEditId(routine.id)}
    />
  );

  return (
    <Screen>
      <TopBar
        leading="close"
        title=""
        onLeading={fromRegister ? () => router.replace("/home") : undefined}
        fallbackHref={{ pathname: "/pets/[petId]", params: { petId } }}
      />
      <ScreenBody gap={12} contentStyle={styles.body}>
        {detail.isPending || routines.isPending ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={111} />
            <Skeleton height={66} />
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
            <View style={styles.heading}>
              <Text variant="title-sm" style={styles.headingTitle}>
                {routines.data.length
                  ? `${pet.name}에게 맞는\n할 일 ${enabledRoutines.length}개`
                  : `${pet.name}의 체크 리스트`}
              </Text>
              <Text variant="body-xl" color={semantic.mutedForeground} style={styles.relaxed}>
                {stageUnknown
                  ? `단계를 확인하기 전이라 ${SPECIES_LABEL[pet.speciesId]}·어린 개체 기준이에요. 체중을 재면 다시 제안해 드려요.`
                  : "필요 없는 건 끄면 돼요"}
              </Text>
            </View>

            <View style={styles.petRow}>
              <Avatar src={pet.photoUrl} size={40} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text variant="body-xl" weight="bold" numberOfLines={1}>
                  {pet.name} {SEX_SYMBOL[pet.sex]}
                </Text>
                <Text variant="body-md" color={semantic.mutedForeground} numberOfLines={1}>
                  {petSpeciesLine(pet)} · {stage}
                </Text>
              </View>
              <ZoomPressable
                href={{ pathname: "/pets/[petId]/edit", params: { petId: pet.id } }}
                accessibilityRole="link"
                accessibilityLabel="정보 수정"
                hitSlop={6}
                style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.6 }]}
              >
                <PencilIcon size={18} color={semantic.foreground} />
              </ZoomPressable>
            </View>

            {routines.data.length ? (
              <>
                {feedToAsk ? <FeedIntervalAsk key={feedToAsk.id} routine={feedToAsk} /> : null}
                {enabledRoutines.length ? (
                  <View style={styles.card}>{enabledRoutines.map(routineRow)}</View>
                ) : null}
                {disabledRoutines.length ? (
                  <>
                    <Text
                      variant="body-lg"
                      weight="semibold"
                      color={semantic.mutedForeground}
                      style={styles.offTitle}
                    >
                      필요하면 켜 보세요
                    </Text>
                    <View style={styles.card}>{disabledRoutines.map(routineRow)}</View>
                  </>
                ) : null}
              </>
            ) : (
              // 개체 등록은 일정을 만들지 않는다. TODO 체크리스트 API가 생기면 문구를 정한다
              <StateMessage compact title="아직 체크 리스트가 없어요" />
            )}

            <Text variant="body-md" weight="medium" color={semantic.mutedForeground}>
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
        <ScreenFooter minBottom={26}>
          <Button size="xl" onPress={() => router.replace("/home")}>
            {enabledRoutines.length
              ? `할 일 ${enabledRoutines.length}개로 시작하기`
              : "이대로 시작하기"}
          </Button>
        </ScreenFooter>
      ) : null}
      <RoutineEditSheet routine={editing} onOpenChange={(open) => !open && setEditId(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16 },
  heading: { gap: 6, paddingTop: 4, paddingLeft: 4, paddingBottom: 8 },
  headingTitle: { lineHeight: 34 },
  relaxed: { lineHeight: 21 },
  petRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.xl,
    backgroundColor: semantic.card,
  },
  editButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: semantic.muted,
  },
  card: {
    overflow: "hidden",
    paddingVertical: 6,
    borderRadius: radius["2xl"],
    backgroundColor: semantic.card,
  },
  offTitle: { marginTop: 4 },
});
