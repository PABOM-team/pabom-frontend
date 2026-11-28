"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { routineQueries } from "@/entities/routine";
import { stageName, useSpeciesMap } from "@/entities/species";
import { SPECIES_LABEL, type Pet } from "@pabom/core/domain/pet";
import { isKnownStage } from "@pabom/core/domain/species";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/display";
import { CheckIcon } from "@/shared/ui/icons";
import { Screen, ScreenFooter } from "@/shared/ui/screen";
import { LIZARD_FIGURE } from "./choice";

/**
 * 만드는 중 화면의 단계 사이 시간 (Figma SCR-P02 체크 리스트 만드는 중 / 0~5 의 AFTER_TIMEOUT).
 * 0→1 0.3s, 그 뒤 0.45s 씩, 마지막 5→준비 완료 0.4s
 */
const PHASE_MS = [300, 450, 450, 450, 450, 400] as const;
const LAST_PHASE = 5;
/** 마지막 단계(할 일 N개 만들기)가 진행 중인 phase */
const MAKING_PHASE = 4;

/**
 * SCR-P02 · 체크 리스트 만드는 중 → 준비 완료 (앱 checklist-builder.tsx 와 같다).
 * 등록이 끝난 개체의 체크 리스트(백엔드가 등록 때 만든 루틴)를 불러오는 동안 네 단계를 차례로 체크하고,
 * 다 되면 '체크 리스트가 준비됐어요'와 '체크 리스트 보기'(P03)로 넘어간다
 */
export function ChecklistBuilder({ pet, photoUrl }: { pet: Pet; photoUrl: string | null }) {
  const species = useSpeciesMap();
  const routines = useQuery(routineQueries.list(pet.id));
  const [phase, setPhase] = useState(0);

  const count = routines.data?.filter((r) => r.enabled).length ?? null;
  const speciesLabel = SPECIES_LABEL[pet.speciesId];
  // 단계 확인 전 개체는 어린 개체 기준으로 만든다 (P03 '단계 확인 전')
  const stage = isKnownStage(pet.lifeStageCode)
    ? stageName(species.get(pet.speciesId), pet.lifeStageCode)
    : "어린 개체";
  // 루틴을 다 불러오기(실패 포함) 전에는 마지막 단계(할 일 N개 만들기)를 돌리며 기다린다
  const loaded = !routines.isPending;
  const ready = phase > LAST_PHASE;

  useEffect(() => {
    if (ready || (phase === MAKING_PHASE && !loaded)) return;
    const timer = setTimeout(() => setPhase((p) => p + 1), PHASE_MS[phase]);
    return () => clearTimeout(timer);
  }, [phase, loaded, ready]);

  const photo = photoUrl ?? pet.photoUrl;
  const steps = [
    `${speciesLabel} · ${stage} 기준 찾기`,
    "급여 · 분무 · 물 갈기 주기 맞추기",
    "체중 · 청소 · 탈피 일정 정하기",
    count ? `할 일 ${count}개 만들기` : "할 일 만들기",
  ];

  return ready ? (
    <ChecklistReady name={pet.name} photo={photo} count={count} petId={pet.id} />
  ) : (
    <Building
      name={pet.name}
      photo={photo}
      subtitle={`${speciesLabel} · ${stage} 기준이에요`}
      steps={steps}
      phase={phase}
    />
  );
}

/** 개체 사진 동그라미. 사진이 없으면 연파랑 원 안에 종 피규어 */
function PetCircle({ photo, size }: { photo: string | null; size: number }) {
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-full bg-primary-soft"
      style={{ width: size, height: size }}
    >
      {photo ? (
        // 서명 URL 이라 next/image 최적화를 쓰지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="size-full object-cover" />
      ) : (
        <span className="absolute top-[14%] -left-[6%] h-[72%] w-[112%] mix-blend-multiply">
          <Image src={LIZARD_FIGURE} alt="" fill sizes={`${size}px`} className="object-contain" />
        </span>
      )}
    </span>
  );
}

function Building({
  name,
  photo,
  subtitle,
  steps,
  phase,
}: {
  name: string;
  photo: string | null;
  subtitle: string;
  steps: string[];
  phase: number;
}) {
  return (
    <Screen tone="white">
      <div
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top)+74px)] pb-6"
      >
        <PetCircle photo={photo} size={72} />
        <h1 className="mt-5 text-title-sm leading-[34px] whitespace-pre-line text-foreground">
          {`${name}에게 꼭 맞는\n체크 리스트를 만들고 있어요`}
        </h1>
        <p className="mt-3 text-body-xl leading-[21px] text-muted-foreground">{subtitle}</p>
        <ol className="mt-10 flex flex-col gap-5.5 rounded-2xl bg-muted px-5 py-6">
          {steps.map((label, i) => {
            // phase 1이면 1단계 진행, 2면 1단계 완료·2단계 진행 … 5면 모두 완료
            const state = i < phase - 1 ? "done" : i === phase - 1 ? "active" : "waiting";
            return (
              <li key={label} className="flex items-center gap-3">
                <StepIcon state={state} />
                <span
                  className={cn(
                    "min-w-0 flex-1 text-body-xl",
                    state === "active" ? "font-semibold" : "font-medium",
                    state === "done"
                      ? "text-secondary-text"
                      : state === "active"
                        ? "text-foreground"
                        : "text-subtle-foreground",
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Screen>
  );
}

/** 생성 단계 아이콘 (Figma 대기 · 진행 · 완료) */
function StepIcon({ state }: { state: "waiting" | "active" | "done" }) {
  if (state === "done") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center">
        <Spinner label="만드는 중" />
      </span>
    );
  }
  return <span aria-hidden className="size-6 shrink-0 rounded-full border-2 border-input" />;
}

/** SCR-P02 체크 리스트 준비 완료. 사진이 살짝 커지며 체크 배지가 튀어나온다 (준비 완료/0 → 준비 완료, 0.35s) */
function ChecklistReady({
  name,
  photo,
  count,
  petId,
}: {
  name: string;
  photo: string | null;
  count: number | null;
  petId: string;
}) {
  const router = useRouter();
  return (
    <Screen tone="white">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
        <div className="relative animate-in duration-350 zoom-in-90 motion-reduce:animate-none">
          <PetCircle photo={photo} size={104} />
          <span className="absolute right-0 bottom-0 flex size-8.5 animate-in items-center justify-center rounded-full border-3 border-card bg-primary text-primary-foreground duration-350 zoom-in-0 motion-reduce:animate-none">
            <CheckIcon className="size-4.5" strokeWidth={3} />
          </span>
        </div>
        <h1 className="mt-6 text-center text-title-sm leading-9 whitespace-pre-line text-foreground">
          {`${name}의 체크 리스트가\n준비됐어요`}
        </h1>
        <p className="mt-3 text-center text-body-xl leading-[21px] whitespace-pre-line text-muted-foreground">
          {count ? `매일 챙길 할 일 ${count}개를 만들었어요.` : "매일 챙길 할 일을 만들었어요."}
          {"\n"}필요 없는 건 다음 화면에서 바로 끌 수 있어요.
        </p>
      </div>
      <ScreenFooter className="pb-[max(34px,env(safe-area-inset-bottom))]">
        <Button size="xl" onClick={() => router.replace(`/pets/${petId}/routines?from=register`)}>
          체크 리스트 보기
        </Button>
      </ScreenFooter>
    </Screen>
  );
}
