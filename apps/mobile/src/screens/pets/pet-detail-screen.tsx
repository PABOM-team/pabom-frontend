import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { petQueries, petSpeciesLine } from "@/entities/pet";
import { RecordRow } from "@/entities/record";
import { routinesShortLine } from "@/entities/routine";
import { feedResultSetOf, speciesQueries, stageName, useSpeciesMap } from "@/entities/species";
import { ChangeStatusSheet, DeletePetDialog, useRevertPetStatus } from "@/features/pet-lifecycle";
import { EditRecordSheet } from "@/features/record-editor";
import { petsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage, getHttpStatus } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import { isPetStatusChangeSupported } from "@pabom/core/config/env";
import { isWeightItem } from "@pabom/core/domain/care";
import { END_REASON_LABEL, lifeStageIdOf, SEX_LABEL } from "@pabom/core/domain/pet";
import { isKnownStage, lifeStageFromWeight } from "@pabom/core/domain/species";
import { formatFullDate } from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { Avatar, InfoBox, InfoRow, LoadError, Skeleton, StateMessage } from "@/shared/ui/display";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Menu, type MenuItem } from "@/shared/ui/menu";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";
import { PetNotFound } from "./pet-not-found";

/** SCR-P04 개체 상세. 함께했던 개체면 맨 위 띠, 체크 리스트 줄 없음, 기록만 볼 수 있다 */
export function PetDetailScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const species = useSpeciesMap();
  const { data, isPending, isError, error, refetch } = useQuery(petQueries.detail(petId));
  const { data: careStandards } = useQuery({
    ...speciesQueries.careStandards(data?.pet.speciesId ?? "crested_gecko"),
    enabled: Boolean(data),
  });
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const revert = useRevertPetStatus(data?.pet);
  const queryClient = useQueryClient();
  // 단계를 모르는 개체는 최근 체중 기록으로 단계를 제안하고, 버튼 한 번으로 정한다 (Figma 댓글: 체중으로 단계 제안)
  const confirmStage = useMutation({
    mutationFn: (code: string) =>
      petsApi.update(petId, { lifeStageId: lifeStageIdOf(code), stageCertainty: "CONFIRMED" }),
    onSuccess: () => toast("생애 단계를 정했어요"),
    onError: (error) => toast(getErrorMessage(error, "단계를 정하지 못했어요.")),
    onSettled: () => invalidateCareData(queryClient),
  });

  if (isPending) {
    return (
      <Screen>
        <TopBar fallbackHref="/pets" />
        <ScreenBody gap={16}>
          <Skeleton height={72} />
          <Skeleton height={160} />
        </ScreenBody>
      </Screen>
    );
  }

  // 없는 개체(남의 개체 포함)는 E01, 그 밖의 실패는 C1-2
  if (isError && getHttpStatus(error) === 404) return <PetNotFound />;
  if (isError) {
    return (
      <Screen>
        <TopBar fallbackHref="/pets" />
        <LoadError style={{ flex: 1, justifyContent: "center" }} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const { pet, routines, recentRecords } = data;
  const ended = pet.status === "ended";
  const spec = species.get(pet.speciesId);
  const stageUnknown = !isKnownStage(pet.lifeStageCode);
  const lastWeight = recentRecords?.find((r) => isWeightItem(r.careItem) && r.weightG)?.weightG;
  const suggested = stageUnknown && spec ? lifeStageFromWeight(spec, lastWeight) : null;

  const menuItems: MenuItem[] = ended
    ? [
        { label: "키우는 중으로 되돌리기", onSelect: () => revert.mutate() },
        { label: "개체 삭제", tone: "danger", onSelect: () => setDeleteOpen(true) },
      ]
    : [
        {
          label: "정보 수정",
          onSelect: () =>
            router.push({ pathname: "/pets/[petId]/edit", params: { petId: pet.id } }),
        },
        {
          label: "함께했던 개체로 바꾸기",
          onSelect: () => setStatusOpen(true),
          hidden: !isPetStatusChangeSupported,
        },
        { label: "개체 삭제", tone: "danger", onSelect: () => setDeleteOpen(true) },
      ];

  return (
    <Screen>
      <TopBar
        title={pet.name}
        fallbackHref={ended ? "/pets/archived" : "/pets"}
        trailing={<Menu label={`${pet.name} 메뉴`} items={menuItems} />}
      />
      <ScreenBody>
        {ended && pet.endedOn && pet.endReason ? (
          <InfoBox textVariant="body-lg" style={{ marginBottom: 16 }}>
            {`${formatFullDate(pet.endedOn)} ${END_REASON_LABEL[pet.endReason]} · 기록만 볼 수 있어요`}
          </InfoBox>
        ) : null}

        <View style={styles.header}>
          <Avatar src={pet.photoUrl} size={72} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="title-sm">{pet.name}</Text>
            <Text variant="body-lg" color={semantic.mutedForeground}>
              {petSpeciesLine(pet)}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <InfoRow label="생애 단계">
            <Text variant="body-lg">
              {stageUnknown ? "확인 전" : stageName(spec, pet.lifeStageCode)}
              {/* 키우는 중일 때만 붙임말 (Figma P04·P08 · v1.2 명세: '(부화일·체중으로 제안)') */}
              {!ended ? (
                <Text variant="body-md" color={semantic.subtleForeground}>
                  {stageUnknown ? " (체중을 재면 제안해 드려요)" : " (부화일·체중으로 제안)"}
                </Text>
              ) : null}
            </Text>
          </InfoRow>
          {suggested ? (
            <InfoBox tone="primary" style={styles.suggestBox}>
              <Text variant="body-md" color={semantic.secondaryText} style={{ flex: 1 }}>
                체중 {lastWeight}g으로 보면{" "}
                <Text variant="body-md" weight="bold">
                  {suggested.name}
                </Text>
                예요.
              </Text>
              <Button
                size="sm"
                disabled={confirmStage.isPending}
                onPress={() => confirmStage.mutate(suggested.code)}
              >
                {`${suggested.name}로 정하기`}
              </Button>
            </InfoBox>
          ) : null}
          <InfoRow label="부화일">
            {pet.hatchedOn ? formatFullDate(pet.hatchedOn) : "몰라요"}
          </InfoRow>
          {!ended ? <InfoRow label="성별">{SEX_LABEL[pet.sex]}</InfoRow> : null}
        </View>

        {!ended ? (
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              router.push({ pathname: "/pets/[petId]/routines", params: { petId: pet.id } })
            }
            style={styles.routinesLink}
          >
            <Text variant="body-xl" weight="bold">
              체크 리스트
            </Text>
            <Text
              variant="body-lg"
              color={semantic.mutedForeground}
              align="right"
              numberOfLines={1}
              style={{ flex: 1, minWidth: 0 }}
            >
              {routinesShortLine(routines) || "아직 없어요"}
            </Text>
            <ChevronRightIcon size={16} color={semantic.mutedForeground} />
          </Pressable>
        ) : null}

        <Text variant="body-lg" weight="medium" style={styles.recentTitle}>
          최근 기록
        </Text>
        {recentRecords === null ? (
          <View style={styles.recentError}>
            <StateMessage
              compact
              title="최근 기록을 불러오지 못했어요"
              action={{ label: "다시 시도", onPress: () => refetch(), variant: "outline" }}
            />
          </View>
        ) : null}
        {recentRecords?.length === 0 ? (
          <Text variant="body-lg" color={semantic.mutedForeground} style={{ paddingVertical: 12 }}>
            아직 기록이 없어요
          </Text>
        ) : null}
        {(recentRecords ?? []).map((record) => (
          <RecordRow
            key={record.id}
            record={record}
            variant="list"
            prefix={format(parseISO(record.occurredAt), "M월 d일")}
            feedResultSet={feedResultSetOf(careStandards, record.careItem)}
            onPress={() => setEditRecordId(record.id)}
          />
        ))}
        {recentRecords?.length ? (
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              router.push({ pathname: "/pets/[petId]/records", params: { petId: pet.id } })
            }
            style={styles.allRecords}
          >
            <Text variant="body-lg" weight="bold" color={semantic.primary}>
              전체 기록 보기
            </Text>
            <ChevronRightIcon size={14} color={semantic.primary} />
          </Pressable>
        ) : null}
      </ScreenBody>

      {!ended ? (
        <ChangeStatusSheet pet={pet} open={statusOpen} onOpenChange={setStatusOpen} />
      ) : null}
      <DeletePetDialog pet={pet} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <EditRecordSheet
        recordId={editRecordId}
        speciesId={pet.speciesId}
        onOpenChange={(open) => !open && setEditRecordId(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 16 },
  suggestBox: {
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  routinesLink: {
    marginTop: 8,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  recentTitle: { marginTop: 16, marginBottom: 4 },
  recentError: {
    borderRadius: radius.xl,
    borderWidth: 1.3,
    borderColor: semantic.input,
    paddingVertical: 8,
  },
  allRecords: {
    alignSelf: "center",
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 8,
  },
});
