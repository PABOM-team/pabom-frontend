"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronUpIcon } from "@/shared/ui/icons";
import Link from "next/link";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { speciesQueries, stageName, useSpeciesMap } from "@/entities/species";
import { CARE_DISCLAIMER, formatInterval } from "@pabom/core/domain/care";
import { EVIDENCE_LEVEL_LABEL } from "@pabom/core/domain/species";
import type { Task } from "@pabom/core/domain/today";
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
  // 백엔드가 description에 적용 조건만 넣으면 같은 글을 두 번 보이지 않는다 [백엔드 확인 필요]
  const description =
    standard?.description && standard.description !== condition ? standard.description : null;

  // 펼친 칸의 한 줄: 근거 수준 · 출처 (v1.2 5-1). 누르면 그 개체 종의 가이드라인으로
  const sourceLine = [
    standard?.evidenceLevel ? `근거 수준 · ${EVIDENCE_LEVEL_LABEL[standard.evidenceLevel]}` : null,
    standard?.sourceRefs ? `출처 · ${standard.sourceRefs}` : (routine?.basis.sourceText ?? null),
  ]
    .filter(Boolean)
    .join("  |  ");

  return (
    <Sheet open={Boolean(task)} onOpenChange={onOpenChange} title="왜 이 할 일이 있나요?">
      <dl className="text-body-lg">
        <div className="flex gap-2 border-b border-border py-2">
          <dt className="w-24 shrink-0 text-muted-foreground">할 일</dt>
          <dd className="min-w-0 flex-1 text-foreground">
            {current?.title.split(" · ")[0]}
            {current?.intervalDays != null ? ` · ${formatInterval(current.intervalDays)}` : ""}
          </dd>
        </div>
        <div className="flex gap-2 py-2">
          <dt className="w-24 shrink-0 text-muted-foreground">적용 조건</dt>
          <dd className="min-w-0 flex-1 text-foreground">{condition}</dd>
        </div>
      </dl>
      {description ? <p className="mt-3 text-body-lg text-foreground">{description}</p> : null}

      {/* 펼치면 근거 수준·출처(있을 때)와 종 가이드라인(S04-3) 링크 (Figma H04 펼침, v1.2 5-1) */}
      <div className="mt-3 flex flex-col gap-2.5 rounded-2xl bg-muted px-3.5 py-3">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex min-h-6 w-full items-center gap-2 text-left text-body-lg font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <span className="min-w-0 flex-1">자세히 보기</span>
          {expanded ? (
            <ChevronUpIcon className="size-3.5 text-primary" />
          ) : (
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          )}
        </button>
        {expanded && detail ? (
          <Link
            href={`/settings/guidelines/${detail.pet.speciesId}`}
            onClick={() => onOpenChange(false)}
            className="min-h-6 text-body-lg font-medium whitespace-pre-wrap text-primary"
          >
            {sourceLine || "이러한 기준을 기반으로 제안을 드렸어요"} ›
          </Link>
        ) : null}
      </div>

      <InfoBox className="mt-3">{CARE_DISCLAIMER}</InfoBox>
    </Sheet>
  );
}
