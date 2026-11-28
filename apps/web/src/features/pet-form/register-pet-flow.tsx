"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { speciesQueries } from "@/entities/species";
import { newRequestId } from "@pabom/core/api/adapters";
import { petsApi, recordsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage, getFieldErrors } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import { WEIGHT_CODE } from "@pabom/core/domain/care";
import {
  isPetDraftReady,
  morphFields,
  serverFileId,
  SEX_LABEL,
  sexFields,
  sexSchema,
  stageFields,
  type Pet,
  type PetCreateInput,
  type Sex,
} from "@pabom/core/domain/pet";
import {
  SPECIES_GROUP_LABEL,
  type Morph,
  type Species,
  type SpeciesGroup,
  type SpeciesId,
} from "@pabom/core/domain/species";
import { nowIso, todayYmd } from "@pabom/core/lib/date";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ChipGroup } from "@/shared/ui/chip";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Badge, Skeleton, StepProgress } from "@/shared/ui/display";
import { Field, Input } from "@/shared/ui/form";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { toast } from "@/shared/ui/toast";
import { IconButton, TopBar } from "@/shared/ui/top-bar";
import { ChecklistBuilder } from "./checklist-builder";
import { LIZARD_FIGURE, PushIn, SectionLabel, SNAKE_FIGURE_DISABLED } from "./choice";
import { HatchFields, MorphPicker, PetPhotoPicker, type PhotoValue } from "./fields";

const STEPS = ["분류", "상세 종과 모프", "기본 정보"] as const;
const STEP_COUNT = STEPS.length;

/** 입력한 내용을 POST /pets 본문으로 */
function toCreateInput(
  draft: Draft,
  species: Species,
  morphs: Morph[],
  clientRequestId: string,
): PetCreateInput {
  return {
    clientRequestId,
    speciesId: species.serverId,
    name: draft.name.trim(),
    ...morphFields(draft.morph, morphs),
    ...stageFields(species, draft),
    adoptedAt: draft.acquiredOn,
    ...sexFields(draft.sex),
    photoFileId: serverFileId(draft.photo.fileId),
  };
}

type Draft = {
  group: SpeciesGroup | null;
  speciesId: SpeciesId | null;
  morph: string | null;
  name: string;
  photo: PhotoValue;
  hatchedOn: string | null;
  hatchUnknown: boolean;
  lifeStageCode: string | null;
  stageUncertain: boolean;
  /** '잘 모르겠어요'일 때 넣은 체중(g). 단계 제안에 쓰고, 등록 뒤 체중 기록으로 남긴다 */
  weightG: number | null;
  sex: Sex;
  acquiredOn: string | null;
};

const EMPTY: Draft = {
  group: null,
  speciesId: null,
  morph: null,
  name: "",
  photo: { fileId: null, url: null },
  hatchedOn: null,
  hatchUnknown: false,
  lifeStageCode: null,
  stageUncertain: false,
  weightG: null,
  sex: "unknown",
  acquiredOn: null,
};

/**
 * SCR-P02 개체 등록 3단계 (분류 · 상세 종과 모프 · 기본 정보, 앱 register-pet-flow.tsx 와 같다).
 * onboarding이면 가입 직후 안내(A04 A안): 뒤로 대신 '나중에 할게요'.
 * 등록이 끝나면 체크 리스트 만드는 중 → 준비 완료 화면을 보여 준 뒤 P03 으로 간다
 */
export function RegisterPetFlow({ onboarding }: { onboarding: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: speciesList, isPending: speciesPending } = useQuery(speciesQueries.list());
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Figma(A04 A안·P02 1/3) 모두 도마뱀이 골라진 채로 시작한다
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, group: "lizard" });
  const [exitOpen, setExitOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [created, setCreated] = useState<Pet | null>(null);
  // 같은 화면에서 다시 눌러도 한 마리만 등록되도록 요청 ID를 한 번만 만든다
  const [clientRequestId] = useState(newRequestId);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const species = speciesList?.find((s) => s.id === draft.speciesId);
  const { data: morphs } = useQuery(speciesQueries.morphs(species?.serverId));
  const dirty = JSON.stringify(draft) !== JSON.stringify({ ...EMPTY, group: draft.group });
  const exit = () => router.replace(onboarding ? "/home" : "/pets");
  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const create = useMutation({
    mutationFn: async () => {
      const pet = await petsApi.create(
        toCreateInput(draft, species!, morphs ?? [], clientRequestId),
      );
      // [백엔드 확인 필요] CreatePetRequest에 체중 칸이 없어, 넣은 체중은 체중 기록(WEIGHT)으로 남긴다.
      // 기록 저장이 실패해도 등록은 끝난 것이므로 조용히 넘어간다
      if (draft.weightG) {
        await recordsApi
          .create({
            petId: pet.id,
            careItem: WEIGHT_CODE,
            occurredAt: nowIso(),
            weightG: draft.weightG,
          })
          .catch(() => undefined);
      }
      return pet;
    },
    onSuccess: async (pet) => {
      await invalidateCareData(queryClient);
      setCreated(pet);
    },
    onError: (error) => {
      const fields = getFieldErrors(error);
      if (fields.name) setNameError(fields.name);
      toast(getErrorMessage(error, "등록하지 못했어요."));
    },
  });

  const canNext = (step === 1 && draft.group === "lizard") || (step === 2 && Boolean(species));
  // 필수는 종·이름뿐이다. 부화일·생애 단계·체중·더 자세한 정보는 비워도 등록된다
  // (비우면 단계는 UNKNOWN으로 보낸다, stageFields)
  const canSubmit = isPetDraftReady(draft) && Boolean(species) && !uploading && !create.isPending;

  const goBack = () => {
    if (step > 1) goTo(step - 1);
    else if (dirty) setExitOpen(true);
    else exit();
  };

  if (created) return <ChecklistBuilder pet={created} photoUrl={draft.photo.url} />;

  return (
    <Screen>
      <TopBar
        title="개체 등록"
        leading={step === 1 && onboarding ? "none" : "back"}
        onLeading={goBack}
        trailing={
          <IconButton
            aria-label="닫기"
            size={40}
            onClick={() => (dirty ? setExitOpen(true) : exit())}
          >
            <XIcon />
          </IconButton>
        }
      />
      <ScreenBody className="overflow-x-hidden px-4 *:shrink-0" gap={step === 3 ? 24 : 12}>
        <StepProgress step={step} total={STEP_COUNT} label={STEPS[step - 1]!} />
        <PushIn stepKey={step} direction={direction}>
          {step === 1 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-title-sm text-foreground">어떤 친구를 키우고 있나요?</h2>
              <div className="flex gap-3">
                <GroupCard
                  selected={draft.group === "lizard"}
                  title={SPECIES_GROUP_LABEL.lizard}
                  figure={LIZARD_FIGURE}
                  onClick={() => patch({ group: "lizard" })}
                />
                {/* 뱀(볼파이톤)은 MVP 범위 밖이라 고를 수 없다 (CLAUDE.md). Figma 그대로 흑백 카드로 두고,
                    왜 못 고르는지 보이게 '준비 중' 배지만 붙인다 (QA T02-01) */}
                <GroupCard
                  disabled
                  badge="준비 중"
                  title={SPECIES_GROUP_LABEL.snake}
                  figure={SNAKE_FIGURE_DISABLED}
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-title-sm text-foreground">상세 종과 모프를 골라 주세요</h2>
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap">
                  <PickedChip label={SPECIES_GROUP_LABEL.lizard} onClick={() => goTo(1)} />
                </div>
                <div className="flex flex-col gap-3">
                  <SectionLabel>상세 종</SectionLabel>
                  {speciesPending ? (
                    <Skeleton height={44} />
                  ) : (
                    <ChipGroup
                      label="상세 종"
                      options={(speciesList ?? [])
                        .filter((s) => s.group === "lizard")
                        .map((s) => ({ value: s.id, label: s.commonName }))}
                      value={draft.speciesId}
                      onChange={(id) => {
                        if (!id) return;
                        patch({
                          speciesId: id,
                          // 종을 바꾸면 모프 선택은 비운다 (Figma 메모 2/3)
                          morph: draft.speciesId === id ? draft.morph : null,
                          lifeStageCode: null,
                        });
                      }}
                    />
                  )}
                </div>
                {species ? (
                  <>
                    <div className="h-px bg-border" />
                    <div className="flex flex-col gap-3">
                      <SectionLabel>모프</SectionLabel>
                      <MorphPicker
                        species={species}
                        value={draft.morph}
                        onChange={(morph) => patch({ morph })}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-6">
              <PetPhotoPicker
                value={draft.photo}
                onChange={(photo) => patch({ photo })}
                onBusyChange={setUploading}
              />
              <Field label="이름" htmlFor="pet-name" error={nameError}>
                <Input
                  id="pet-name"
                  maxLength={20}
                  placeholder="이름을 지어 주세요"
                  value={draft.name}
                  invalid={Boolean(nameError)}
                  onChange={(e) => {
                    setNameError(null);
                    patch({ name: e.target.value });
                  }}
                />
              </Field>
              <HatchFields
                species={species}
                hatchedOn={draft.hatchedOn}
                hatchUnknown={draft.hatchUnknown}
                lifeStageCode={draft.lifeStageCode}
                stageUncertain={draft.stageUncertain}
                weightG={draft.weightG}
                onChange={patch}
              />
              <button
                type="button"
                aria-expanded={detailsOpen}
                onClick={() => setDetailsOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-2xl bg-card px-3.5 py-3 text-left transition-opacity outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:opacity-70"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body-lg font-medium text-foreground">
                    더 자세한 정보 (선택)
                  </span>
                  {!detailsOpen ? (
                    <span className="text-body-md text-muted-foreground">성별 · 데려온 날</span>
                  ) : null}
                </span>
                {detailsOpen ? (
                  <ChevronUpIcon className="size-3.5 text-primary" />
                ) : (
                  <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                )}
              </button>
              {detailsOpen ? (
                <>
                  <Field label="성별">
                    <ChipGroup
                      label="성별"
                      options={sexSchema.options.map((value) => ({
                        value,
                        label: SEX_LABEL[value],
                      }))}
                      value={draft.sex}
                      onChange={(sex) => patch({ sex: sex ?? "unknown" })}
                    />
                  </Field>
                  <Field label="데려온 날" htmlFor="pet-acquired">
                    <DateField
                      id="pet-acquired"
                      title="데려온 날"
                      value={draft.acquiredOn}
                      max={todayYmd()}
                      onChange={(acquiredOn) => patch({ acquiredOn })}
                    />
                  </Field>
                </>
              ) : null}
            </div>
          ) : null}
        </PushIn>
      </ScreenBody>

      <ScreenFooter className="pb-[max(26px,env(safe-area-inset-bottom))]">
        {step < STEP_COUNT ? (
          <Button size="xl" disabled={!canNext} onClick={() => goTo(step + 1)}>
            다음
          </Button>
        ) : (
          <Button
            size="xl"
            disabled={!canSubmit}
            loading={create.isPending || uploading}
            onClick={() => create.mutate()}
          >
            등록하기
          </Button>
        )}
        {onboarding && step === 1 ? (
          <button
            type="button"
            onClick={exit}
            className="self-center py-1 text-body-lg font-medium text-secondary-text"
          >
            나중에 할게요
          </button>
        ) : null}
      </ScreenFooter>

      <ConfirmDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title="작성 중인 내용이 있어요"
        description="나가면 입력한 내용이 사라져요."
        cancelLabel="계속 작성"
        confirmLabel="나가기"
        tone="inverse"
        onConfirm={exit}
      />
    </Screen>
  );
}

/**
 * 분류 큰 선택 카드 (Figma 종 고르기 · 도마뱀 카드/뱀 카드, 184px).
 * 고르면 연파랑 바탕 + 파란 2px 테두리, 아니면 흰 카드 + 그림자. 누르면 살짝 눌렸다 튄다
 */
function GroupCard({
  title,
  figure,
  badge,
  selected,
  disabled,
  onClick,
}: {
  title: string;
  figure: string;
  badge?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={badge ? `${title} (${badge})` : title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-46 min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl px-3 pt-4 pb-5 transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/40 enabled:active:scale-97",
        selected
          ? "border-2 border-primary bg-primary-soft"
          : "border border-border bg-card shadow-sm",
      )}
    >
      {/* 흰 배경 피규어 사진이라 곱하기로 카드 색에 섞는다 (Figma mix-blend multiply) */}
      <span className="relative h-25 w-33 shrink-0 mix-blend-multiply">
        <Image src={figure} alt="" fill sizes="132px" className="object-contain" />
      </span>
      <span className="flex flex-1 items-center gap-1.5">
        <span
          className={cn(
            "text-body-xl font-semibold",
            disabled ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {title}
        </span>
        {badge ? <Badge>{badge}</Badge> : null}
      </span>
    </button>
  );
}

/** 앞 단계에서 고른 값 (Figma 선택값 칩). 누르면 그 단계로 돌아가 다시 고를 수 있다 */
function PickedChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${label} 다시 고르기`}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-inverse px-3 py-2 text-inverse-foreground transition-opacity outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:opacity-70"
    >
      <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-card">
        <span className="absolute top-0.75 left-px h-4.5 w-5.5 mix-blend-multiply">
          <Image src={LIZARD_FIGURE} alt="" fill sizes="22px" className="object-contain" />
        </span>
      </span>
      <span className="text-body-lg font-semibold">{label}</span>
      <XIcon className="size-4" />
    </button>
  );
}
