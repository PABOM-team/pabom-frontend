"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon } from "@/shared/ui/icons";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { petQueries, petSpeciesLine } from "@/entities/pet";
import { RecordRow } from "@/entities/record";
import { routinesShortLine } from "@/entities/routine";
import { feedResultSetOf, speciesQueries, stageName, useSpeciesMap } from "@/entities/species";
import { ChangeStatusSheet, DeletePetDialog, useRevertPetStatus } from "@/features/pet-lifecycle";
import { EditRecordSheet } from "@/features/record-editor";
import { petsApi } from "@/shared/api/endpoints";
import { getErrorMessage, getHttpStatus } from "@/shared/api/errors";
import { invalidateCareData } from "@/shared/api/query-keys";
import { isPetStatusChangeSupported } from "@/shared/config/env";
import { isWeightItem } from "@/shared/domain/care";
import { END_REASON_LABEL, lifeStageIdOf, SEX_LABEL } from "@/shared/domain/pet";
import { isKnownStage, lifeStageFromWeight } from "@/shared/domain/species";
import { formatFullDate } from "@/shared/lib/date";
import { format, parseISO } from "date-fns";
import { Button } from "@/shared/ui/button";
import { Avatar, InfoBox, InfoRow, LoadError, Skeleton, StateMessage } from "@/shared/ui/display";
import { toast } from "@/shared/ui/toast";
import { Menu } from "@/shared/ui/menu";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-P04 개체 상세. 함께했던 개체면 맨 위 띠, 체크 리스트 줄 없음, 기록만 볼 수 있다 */
export function PetDetailScreen() {
  const { petId } = useParams<{ petId: string }>();
  const router = useRouter();
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
        <ScreenBody className="space-y-4">
          <Skeleton className="h-[72px]" />
          <Skeleton className="h-40" />
        </ScreenBody>
      </Screen>
    );
  }

  // 없는 개체(남의 개체 포함)는 E01, 그 밖의 실패는 C1-2
  if (isError && getHttpStatus(error) === 404) notFound();
  if (isError) {
    return (
      <Screen>
        <TopBar fallbackHref="/pets" />
        <LoadError className="flex-1 justify-center" onRetry={() => refetch()} />
      </Screen>
    );
  }

  const { pet, routines, recentRecords } = data;
  const ended = pet.status === "ended";
  const spec = species.get(pet.speciesId);
  const stageUnknown = !isKnownStage(pet.lifeStageCode);
  const lastWeight = recentRecords?.find((r) => isWeightItem(r.careItem) && r.weightG)?.weightG;
  const suggested = stageUnknown && spec ? lifeStageFromWeight(spec, lastWeight) : null;

  return (
    <Screen>
      <TopBar
        title={pet.name}
        fallbackHref={ended ? "/pets/archived" : "/pets"}
        trailing={
          <Menu
            label={`${pet.name} 메뉴`}
            items={
              ended
                ? [
                    { label: "키우는 중으로 되돌리기", onSelect: () => revert.mutate() },
                    { label: "개체 삭제", tone: "danger", onSelect: () => setDeleteOpen(true) },
                  ]
                : [
                    { label: "정보 수정", onSelect: () => router.push(`/pets/${pet.id}/edit`) },
                    ...(isPetStatusChangeSupported
                      ? [{ label: "함께했던 개체로 바꾸기", onSelect: () => setStatusOpen(true) }]
                      : []),
                    { label: "개체 삭제", tone: "danger", onSelect: () => setDeleteOpen(true) },
                  ]
            }
          />
        }
      />
      <ScreenBody>
        {ended && pet.endedOn && pet.endReason ? (
          <InfoBox className="mb-4 bg-muted text-body-lg text-secondary-text">
            {formatFullDate(pet.endedOn)} {END_REASON_LABEL[pet.endReason]} · 기록만 볼 수 있어요
          </InfoBox>
        ) : null}

        <div className="flex items-center gap-4">
          <Avatar src={pet.photoUrl} size={72} />
          <div className="min-w-0">
            <h2 className="text-title-sm font-bold">{pet.name}</h2>
            <p className="text-body-lg text-muted-foreground">{petSpeciesLine(pet)}</p>
          </div>
        </div>

        <div className="mt-3">
          <InfoRow label="생애 단계">
            {stageUnknown ? "확인 전" : stageName(spec, pet.lifeStageCode)}
            {/* 키우는 중일 때만 붙임말 (Figma P04·P08 · v1.2 명세: '(부화일·체중으로 제안)') */}
            {!ended ? (
              <span className="text-body-md text-subtle-foreground">
                {stageUnknown ? " (체중을 재면 제안해 드려요)" : " (부화일·체중으로 제안)"}
              </span>
            ) : null}
          </InfoRow>
          {suggested ? (
            <InfoBox tone="primary" className="my-2 flex items-center justify-between gap-3">
              <span>
                체중 {lastWeight}g으로 보면 <strong>{suggested.name}</strong>예요.
              </span>
              <Button
                size="sm"
                className="shrink-0"
                disabled={confirmStage.isPending}
                onClick={() => confirmStage.mutate(suggested.code)}
              >
                {suggested.name}로 정하기
              </Button>
            </InfoBox>
          ) : null}
          <InfoRow label="부화일">
            {pet.hatchedOn ? formatFullDate(pet.hatchedOn) : "몰라요"}
          </InfoRow>
          {!ended ? <InfoRow label="성별">{SEX_LABEL[pet.sex]}</InfoRow> : null}
        </div>

        {!ended ? (
          <Link
            href={`/pets/${pet.id}/routines`}
            className="mt-2 flex min-h-[52px] items-center gap-3 border-b border-border py-3"
          >
            <span className="shrink-0 text-body-xl font-bold">체크 리스트</span>
            <span className="min-w-0 flex-1 truncate text-right text-body-lg text-muted-foreground">
              {routinesShortLine(routines) || "아직 없어요"}
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ) : null}

        <h3 className="mt-4 mb-1 text-body-lg font-medium">최근 기록</h3>
        {recentRecords === null ? (
          <div className="rounded-xl border-[1.3px] border-input py-2">
            <StateMessage
              compact
              title="최근 기록을 불러오지 못했어요"
              action={{ label: "다시 시도", onClick: () => refetch(), variant: "outline" }}
            />
          </div>
        ) : null}
        {recentRecords?.length === 0 ? (
          <p className="py-3 text-body-lg text-muted-foreground">아직 기록이 없어요</p>
        ) : null}
        {(recentRecords ?? []).map((record) => (
          <RecordRow
            key={record.id}
            record={record}
            variant="list"
            prefix={format(parseISO(record.occurredAt), "M월 d일")}
            feedResultSet={feedResultSetOf(careStandards, record.careItem)}
            onClick={() => setEditRecordId(record.id)}
          />
        ))}
        {recentRecords?.length ? (
          <Link
            href={`/pets/${pet.id}/records`}
            className="mx-auto mt-3 flex w-fit items-center gap-0.5 py-2 text-body-lg font-bold text-primary"
          >
            전체 기록 보기
            <ChevronRightIcon className="size-3.5" />
          </Link>
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
