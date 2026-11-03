"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from "@/shared/ui/icons";
import Link from "next/link";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { speciesQueries, stageName, useSpeciesMap } from "@/entities/species";
import { CARE_DISCLAIMER, formatInterval } from "@/shared/domain/care";
import type { Task } from "@/shared/domain/today";
import { cn } from "@/shared/lib/utils";
import { InfoBox } from "@/shared/ui/display";
import { Sheet } from "@/shared/ui/sheet";

/** 단계를 모르는(잘 모르겠어요) 개체의 적용 조건 표기 (v1.2 H04) */
const STAGE_UNKNOWN_LABEL = "단계 확인 전";

/**
 * 왜 이 할 일이 있나요? (SCR-H04)
 * 할 일 · 적용 조건(종 · 생애 단계) · 항목 설명 1줄, 펼치면 근거·출처와 종 가이드라인 링크
 */
export function BasisSheet({
  task,
  onOpenChange,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [shown, setShown] = useState<Task | null>(null);
  if (task && task.routineId !== shown?.routineId) {
    setShown(task);
    setExpanded(false);
  }
  const current = task ?? shown;
  const { data: detail } = useQuery({
    ...petQueries.detail(current?.petId ?? ""),
    enabled: Boolean(current),
  });
  const speciesMap = useSpeciesMap();
  const species = detail ? speciesMap.get(detail.pet.speciesId) : undefined;
  const { data: standards } = useQuery({
    ...speciesQueries.careStandards(detail?.pet.speciesId ?? "crested_gecko"),
    enabled: Boolean(detail),
  });
  const routine = detail?.routines.find((r) => r.id === current?.routineId);

  // 적용 조건은 개체의 종·단계로 그린다. 단계를 모르면 '단계 확인 전' (v1.2 H04)
  const stage = detail ? stageName(species, detail.pet.lifeStageCode) : "";
  const condition = species
    ? `${species.commonName} · ${stage || STAGE_UNKNOWN_LABEL}`
    : (routine?.basis.condition ?? "…");
  // 항목 설명 1줄은 종 가이드라인(care-standards)의 description (v1.2 개발 명세 5-2)
  const standard = standards?.standards.find(
    (s) =>
      s.careItem === current?.careItem &&
      (s.lifeStageCode === detail?.pet.lifeStageCode || !detail?.pet.lifeStageCode),
  );
  // 목업·백엔드가 description에 적용 조건만 넣으면 같은 글을 두 번 보이지 않는다 [백엔드 확인 필요]
  const description =
    standard?.description && standard.description !== condition ? standard.description : null;

  return (
    <Sheet open={Boolean(task)} onOpenChange={onOpenChange} title="왜 이 할 일이 있나요?">
      <dl className="text-body-lg">
        <div className="flex border-b border-border py-2.5">
          <dt className="w-[104px] shrink-0 text-muted-foreground">할 일</dt>
          <dd>
            {current?.title.split(" · ")[0]}
            {current?.intervalDays != null ? ` · ${formatInterval(current.intervalDays)}` : ""}
          </dd>
        </div>
        <div className="flex border-b border-border py-2.5">
          <dt className="w-[104px] shrink-0 text-muted-foreground">적용 조건</dt>
          <dd>{condition}</dd>
        </div>
      </dl>
      {description ? (
        <p className="mt-3 text-body-lg leading-relaxed text-secondary-text">{description}</p>
      ) : null}

      <div className={cn("mt-3 rounded-lg border", expanded ? "border-primary" : "border-input")}>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between px-3.5 py-3 text-body-lg"
        >
          자세히 보기
          {expanded ? (
            <ChevronUpIcon className="size-4 text-primary" />
          ) : (
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          )}
        </button>
        {/* 펼치면 근거 수준·출처(있을 때)와 종 가이드라인(S04-3) 링크 (Figma H04 펼침, v1.2 5-1) */}
        {expanded ? (
          <div className="space-y-1.5 px-3.5 pb-3.5 text-body-lg">
            {/* [백엔드 확인 필요] 근거 수준(교재 근거·수의 기관 자료·팀 판단)과 출처는 루틴 응답에 아직 없다 */}
            {routine?.basis.sourceText ? (
              <p className="text-secondary-text">{routine.basis.sourceText}</p>
            ) : null}
            {detail ? (
              <Link
                href={`/settings/guidelines/${detail.pet.speciesId}`}
                className="inline-flex min-h-11 items-center gap-0.5 font-medium text-primary"
              >
                이러한 기준을 기반으로 제안을 드렸어요
                <ChevronRightIcon className="size-3.5" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <InfoBox className="mt-3">{CARE_DISCLAIMER}</InfoBox>
    </Sheet>
  );
}
