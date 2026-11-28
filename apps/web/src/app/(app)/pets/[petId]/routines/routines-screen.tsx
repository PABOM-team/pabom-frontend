"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
import { TopBar } from "@/shared/ui/top-bar";

/**
 * SCR-P03 체크 리스트(기본 관리 일정) 확인·수정.
 * 회색 바탕 위 큰 제목(○○에게 맞는 할 일 N개) · 개체 줄 · 켜진 할 일 카드 · '필요하면 켜 보세요' 꺼진 할 일 카드.
 * 등록 직후(?from=register)에는 '할 일 N개로 시작하기'로 오늘 할 일을 시작한다.
 */
export function RoutinesScreen() {
  const { petId } = useParams<{ petId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const fromRegister = search.get("from") === "register";
  const [editId, setEditId] = useState<string | null>(search.get("edit"));

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
        fallbackHref={`/pets/${petId}`}
      />
      <ScreenBody gap={12} className="px-4 *:shrink-0">
        {detail.isPending || routines.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-[111px]" />
            <Skeleton className="h-[66px]" />
            <Skeleton className="h-60" />
          </div>
        ) : detail.isError || routines.isError || !pet ? (
          <StateMessage
            title="체크 리스트를 불러오지 못했어요"
            action={{
              label: "다시 시도",
              onClick: () => {
                void detail.refetch();
                void routines.refetch();
              },
            }}
          />
        ) : (
          <>
            <div className="flex flex-col gap-1.5 pt-1 pb-2 pl-1">
              <h2 className="text-title-sm leading-[34px] whitespace-pre-line text-foreground">
                {routines.data.length
                  ? `${pet.name}에게 맞는\n할 일 ${enabledRoutines.length}개`
                  : `${pet.name}의 체크 리스트`}
              </h2>
              <p className="text-body-xl leading-[21px] text-muted-foreground">
                {stageUnknown
                  ? `단계를 확인하기 전이라 ${SPECIES_LABEL[pet.speciesId]}·어린 개체 기준이에요. 체중을 재면 다시 제안해 드려요.`
                  : "필요 없는 건 끄면 돼요"}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-3">
              <Avatar src={pet.photoUrl} size={40} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-body-xl font-bold text-foreground">
                  {pet.name} {SEX_SYMBOL[pet.sex]}
                </p>
                <p className="truncate text-body-md text-muted-foreground">
                  {petSpeciesLine(pet)} · {stage}
                </p>
              </div>
              <Link
                href={`/pets/${pet.id}/edit`}
                aria-label="정보 수정"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-opacity active:opacity-60"
              >
                <PencilIcon className="size-4.5" />
              </Link>
            </div>

            {routines.data.length ? (
              <>
                {feedToAsk ? <FeedIntervalAsk key={feedToAsk.id} routine={feedToAsk} /> : null}
                {enabledRoutines.length ? (
                  <ul className="overflow-hidden rounded-2xl bg-card py-1.5">
                    {enabledRoutines.map(routineRow)}
                  </ul>
                ) : null}
                {disabledRoutines.length ? (
                  <>
                    <h3 className="mt-1 text-body-lg font-semibold text-muted-foreground">
                      필요하면 켜 보세요
                    </h3>
                    <ul className="overflow-hidden rounded-2xl bg-card py-1.5">
                      {disabledRoutines.map(routineRow)}
                    </ul>
                  </>
                ) : null}
              </>
            ) : (
              // 개체 등록은 일정을 만들지 않는다. TODO 체크리스트 API가 생기면 문구를 정한다
              <StateMessage compact title="아직 체크 리스트가 없어요" />
            )}

            <p className="text-body-md font-medium text-muted-foreground">
              <Link href={`/settings/guidelines/${pet.speciesId}?petId=${pet.id}`} className="text-primary">
                관리 가이드라인 보기 ›
              </Link>{" "}
              · {CARE_DISCLAIMER}
            </p>
          </>
        )}
      </ScreenBody>
      {fromRegister ? (
        <ScreenFooter className="pb-[max(26px,env(safe-area-inset-bottom))]">
          <Button size="xl" onClick={() => router.replace("/home")}>
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
