"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon } from "@/shared/ui/icons";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
import { TopBar } from "@/shared/ui/top-bar";

/**
 * SCR-P03 체크 리스트(기본 관리 일정) 확인·수정.
 * 등록 직후(?from=register)에는 '이대로 시작하기'로 오늘 할 일을 시작한다.
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
  const offCount = routines.data?.filter((r) => !r.enabled).length ?? 0;
  const stage = pet ? stageName(species.get(pet.speciesId), pet.lifeStageCode) : "";
  const stageUnknown = pet ? !isKnownStage(pet.lifeStageCode) : false;

  return (
    <Screen>
      <TopBar
        title={pet ? `${pet.name}의 체크 리스트` : "체크 리스트"}
        onLeading={fromRegister ? () => router.replace("/home") : undefined}
        fallbackHref={`/pets/${petId}`}
      />
      <ScreenBody>
        {detail.isPending || routines.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-[76px]" />
            <Skeleton className="h-60" />
          </div>
        ) : detail.isError || routines.isError || !pet ? (
          <StateMessage
            title="체크 리스트를 불러오지 못했어요"
            action={{ label: "다시 시도", onClick: () => (detail.refetch(), routines.refetch()) }}
          />
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-xl border-[1.3px] border-input p-3.5">
              <Avatar src={pet.photoUrl} size={52} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-title-xs font-bold">
                  {pet.name}
                  <span className="text-body-lg text-primary">{SEX_SYMBOL[pet.sex]}</span>
                </p>
                <p className="truncate text-body-md text-muted-foreground">
                  {petSpeciesLine(pet)} · {stage}
                </p>
              </div>
              <Link
                href={`/pets/${pet.id}/edit`}
                className="shrink-0 text-body-lg font-medium text-primary"
              >
                정보 수정
              </Link>
            </div>

            {routines.data.length ? (
              <>
                <p className="mt-3.5 text-body-lg leading-relaxed text-secondary-text">
                  {stageUnknown
                    ? `단계를 확인하기 전이라 ${SPECIES_LABEL[pet.speciesId]}·어린 개체 기준이에요. 체중을 재면 다시 제안해 드려요.`
                    : `${SPECIES_LABEL[pet.speciesId]}·${stage}에 맞춘 체크 리스트예요.`}{" "}
                  {offCount ? `${offCount}개 항목이 꺼져 있어요.` : "모두 켜져 있어요."} 필요 없는
                  항목만 꺼 주세요.
                </p>

                <ul className="mt-2">
                  {routines.data.map((routine) => (
                    <RoutineRow
                      key={routine.id}
                      routine={routine}
                      fallbackFoodName={defaultFoodOf(routine.careItem)}
                      onEdit={() => setEditId(routine.id)}
                    />
                  ))}
                </ul>
              </>
            ) : (
              // 개체 등록은 일정을 만들지 않는다. TODO 체크리스트 API가 생기면 문구를 정한다
              <StateMessage compact title="아직 체크 리스트가 없어요" />
            )}

            <p className="mt-4 text-body-md leading-relaxed text-muted-foreground">
              <Link
                href={`/settings/guidelines/${pet.speciesId}`}
                className="inline-flex items-center font-medium text-primary"
              >
                관리 가이드라인 보기
                <ChevronRightIcon className="size-3" />
              </Link>{" "}
              · {CARE_DISCLAIMER}
            </p>
          </>
        )}
      </ScreenBody>
      {fromRegister ? (
        <ScreenFooter>
          <Button size="xl" onClick={() => router.replace("/home")}>
            이대로 시작하기
          </Button>
        </ScreenFooter>
      ) : null}
      <RoutineEditSheet routine={editing} onOpenChange={(open) => !open && setEditId(null)} />
    </Screen>
  );
}
