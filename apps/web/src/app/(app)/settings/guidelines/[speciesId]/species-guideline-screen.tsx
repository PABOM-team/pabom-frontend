"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { speciesQueries } from "@/entities/species";
import { CARE_DISCLAIMER, formatInterval } from "@pabom/core/domain/care";
import { speciesIdSchema, type CareStandard, type EvidenceLevel } from "@pabom/core/domain/species";
import { cn } from "@/shared/lib/utils";
import { CareIcon } from "@/shared/ui/care-icons";
import { Badge, LoadError, Skeleton, StateMessage, type BadgeTone } from "@/shared/ui/display";
import { Group, GroupRow, RowText, SectionLabel } from "@/shared/ui/group";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenCenter } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { TopBar } from "@/shared/ui/top-bar";

/** 근거 배지 (Figma: 파봄 기준 회색 · 수의 자료 파랑) */
const EVIDENCE_BADGE: Record<EvidenceLevel, { label: string; tone: BadgeTone }> = {
  TEAM_JUDGMENT: { label: "파봄 기준", tone: "hint" },
  VET_SOURCE: { label: "수의 자료", tone: "info" },
  TEXTBOOK: { label: "교재 자료", tone: "info" },
};

/** 받침이 있으면 '은', 없으면 '는' (콩이는 · 달은) */
const topicParticle = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? "은" : "는";
};

const intervalLine = (row: CareStandard) =>
  row.minDays !== row.maxDays
    ? `${formatInterval(row.intervalDays)} · ${row.minDays}~${row.maxDays}일`
    : formatInterval(row.intervalDays);

const hostOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

/** 할 일 아이콘 상자 (36 · 회색 바탕 · 모서리 30% · 그림 61%, 앱 CareItemIcon 과 같다) */
function CareItemBox({ code, size = 36 }: { code: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center overflow-hidden bg-screen"
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
    >
      <CareIcon code={code} size={Math.round(size * 0.61)} />
    </span>
  );
}

/**
 * SCR-S04 2·3 종 가이드라인 (앱 species-guideline-screen.tsx 와 같다).
 * 생애 단계 탭 · 이렇게 돌봐 주세요 · 필요하면 추가해요 · 참고한 자료(시트 5).
 * 내 개체에서 들어오면(?petId) 그 개체의 단계로 열고 개체 이름으로 안내한다
 */
export function SpeciesGuidelineScreen() {
  const params = useParams<{ speciesId: string }>();
  const petId = useSearchParams().get("petId");
  const parsed = speciesIdSchema.safeParse(params.speciesId);
  const speciesList = useQuery(speciesQueries.list());
  const table = useQuery({
    ...speciesQueries.careStandards(parsed.success ? parsed.data : "crested_gecko"),
    enabled: parsed.success,
  });
  const pet = useQuery({ ...petQueries.detail(petId ?? ""), enabled: Boolean(petId) });
  const species = speciesList.data?.find((s) => s.id === params.speciesId);
  const [pickedStage, setPickedStage] = useState<string | null>(null);
  const [refsOpen, setRefsOpen] = useState(false);

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

  const stages = species?.lifeStages ?? [];
  const petStage = stages.find((s) => s.code === pet.data?.pet.lifeStageCode)?.code;
  const stage = pickedStage ?? petStage ?? stages[0]?.code;
  const rows = (table.data?.standards ?? []).filter((s) => s.lifeStageCode === stage);
  const basic = rows.filter((r) => r.defaultEnabled);
  const optional = rows.filter((r) => !r.defaultEnabled);
  const petName = pet.data?.pet.name;
  const stageLabel = stages.find((s) => s.code === petStage)?.name;

  const careRow = (row: CareStandard, index: number, action: "badge" | "add") => {
    const badge = row.evidenceLevel ? EVIDENCE_BADGE[row.evidenceLevel] : null;
    return (
      <GroupRow key={row.careItem} divider={index > 0} dividerInset={64}>
        <CareItemBox code={row.careItem} />
        <RowText title={row.careItemName} description={intervalLine(row)} />
        {action === "add" ? (
          petId ? (
            <Link
              href={`/pets/${petId}/routines`}
              className="-m-2 p-2 text-body-xl font-semibold text-primary"
            >
              추가
            </Link>
          ) : null
        ) : badge ? (
          <Badge tone={badge.tone} size="md" shape="square">
            {badge.label}
          </Badge>
        ) : null}
      </GroupRow>
    );
  };

  return (
    <Screen>
      <TopBar title={species?.commonName ?? "가이드라인"} fallbackHref="/settings/guidelines" />
      <ScreenBody flush className="px-4 pt-2.5 pb-10 *:shrink-0" gap={12}>
        {table.isPending || !species ? (
          <Skeleton height={320} className="rounded-2xl" />
        ) : table.isError ? (
          <LoadError onRetry={() => void table.refetch()} />
        ) : (
          <>
            <div role="tablist" aria-label="생애 단계" className="flex rounded-lg bg-border p-1">
              {stages.map((s) => {
                const selected = s.code === stage;
                return (
                  <button
                    key={s.code}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setPickedStage(s.code)}
                    className={cn(
                      "flex-1 rounded-md py-2 text-body-xl font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                      selected ? "bg-card text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
            <p className="text-body-md text-muted-foreground">
              {petName && stageLabel
                ? `${petName}${topicParticle(petName)} ${stageLabel}예요 · `
                : ""}
              체중이 {species.adultWeightG} g을 넘으면 성체로 봐요
            </p>

            {basic.length > 0 ? (
              <>
                <SectionLabel inGap>이렇게 돌봐 주세요</SectionLabel>
                <Group>{basic.map((row, i) => careRow(row, i, "badge"))}</Group>
              </>
            ) : null}

            {optional.length > 0 ? (
              <>
                <SectionLabel inGap>필요하면 추가해요</SectionLabel>
                <Group>{optional.map((row, i) => careRow(row, i, "add"))}</Group>
              </>
            ) : null}

            {table.data.references.length > 0 ? (
              <button
                type="button"
                onClick={() => setRefsOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-card px-4 py-3.5 text-left transition-opacity outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:opacity-70"
              >
                <span className="min-w-0 flex-1 text-body-xl font-semibold text-secondary-text">
                  참고한 자료 {table.data.references.length}개
                </span>
                <ChevronRightIcon className="size-5 text-foreground" />
              </button>
            ) : null}

            <p className="text-body-md leading-[18px] text-muted-foreground">{CARE_DISCLAIMER}</p>
            <p className="text-body-md text-subtle-foreground">
              관리 가이드라인 v{table.data.version}
              {table.data.effectiveFrom ? ` · ${table.data.effectiveFrom} 적용` : ""}
              {table.data.isDraft ? " (예시)" : ""}
            </p>
          </>
        )}
      </ScreenBody>

      <Sheet
        open={refsOpen}
        onOpenChange={setRefsOpen}
        title="참고한 자료"
        description={table.data?.reviewNote ?? "이 가이드라인을 만들 때 본 자료예요."}
      >
        {(table.data?.references ?? []).map((ref) => {
          const host = hostOf(ref.url);
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-body-xl font-semibold text-foreground">
                  {ref.title}
                </span>
                {host ? (
                  <span className="mt-0.5 block text-body-md text-muted-foreground">{host}</span>
                ) : null}
              </span>
              {ref.url ? <ChevronRightIcon className="size-5 text-subtle-foreground" /> : null}
            </>
          );
          return ref.url ? (
            <a
              key={ref.title}
              href={ref.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 py-3"
            >
              {body}
            </a>
          ) : (
            <div key={ref.title} className="flex items-center gap-2 py-3">
              {body}
            </div>
          );
        })}
      </Sheet>
    </Screen>
  );
}
