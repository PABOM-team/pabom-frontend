"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { speciesQueries } from "@/entities/species";
import { filesApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import {
  LIFE_STAGE_CHOICES,
  LIFE_STAGE_UNKNOWN,
  lifeStageFromHatch,
  lifeStageFromWeight,
  type Species,
} from "@/shared/domain/species";
import { todayYmd } from "@/shared/lib/date";
import { resizeImage } from "@/shared/lib/image";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ChipGroup } from "@/shared/ui/chip";
import { Avatar, InfoBox, Skeleton, Spinner } from "@/shared/ui/display";
import { Checkbox, Field, Input } from "@/shared/ui/form";
import { toast } from "@/shared/ui/toast";

export type PhotoValue = { fileId: string | null; url: string | null };

/** 동그란 개체 사진 칸. 고르면 줄여서 바로 올린다 */
export function PetPhotoPicker({
  value,
  onChange,
  variant = "register",
  onBusyChange,
}: {
  value: PhotoValue;
  onChange: (value: PhotoValue) => void;
  variant?: "register" | "edit";
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    onBusyChange?.(true);
    try {
      const photo = await filesApi.upload(await resizeImage(file), "pet");
      onChange({ fileId: photo.id, url: photo.url });
    } catch (error) {
      toast(getErrorMessage(error, "사진을 올리지 못했어요."));
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={value.url ? "사진 바꾸기" : "사진 추가"}
        className="relative"
      >
        {/* 등록(P02)은 점선 동그라미에 '+ 사진', 정보 수정(P05)은 동그라미만 */}
        <Avatar
          src={value.url}
          size={72}
          className={cn(
            !value.url && variant !== "edit" && "border-[1.5px] border-dashed border-input",
          )}
        >
          {uploading ? (
            <Spinner />
          ) : variant === "edit" ? null : (
            <span className="flex items-center gap-0.5 text-body-sm">+ 사진</span>
          )}
        </Avatar>
      </button>
      <span
        className={cn(
          "text-body-md",
          variant === "edit" ? "font-medium text-primary" : "text-muted-foreground",
        )}
      >
        {variant === "edit" ? "사진 바꾸기" : "사진 (선택)"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export type HatchPatch = {
  hatchedOn?: string | null;
  hatchUnknown?: boolean;
  lifeStageCode?: string | null;
  stageUncertain?: boolean;
  weightG?: number | null;
};

const stageOf = (species: Species | undefined, code: string | null) =>
  species?.lifeStages.find((s) => s.code === code) ?? null;

/**
 * 부화일 + '부화일을 몰라요' + 생애 단계 칩 3개 [어린 개체] [성체] [잘 모르겠어요] (P02 4/4 · P05 · U5, Figma 댓글 #5~#17).
 * - 부화일을 넣으면 단계를 미리 골라 주고 "부화일로 보면 어린 개체예요. 다르면 바꿔 주세요." 안내
 * - 부화일을 모르면 직접 고른다. '정확하지 않아요'는 어린 개체일 때만
 * - '잘 모르겠어요'를 고르면 체중 칸(선택)이 나타나고, 체중을 넣으면 단계를 제안해 사용자가 확정한다
 */
export function HatchFields({
  species,
  hatchedOn,
  hatchUnknown,
  lifeStageCode,
  stageUncertain,
  weightG,
  variant = "register",
  onChange,
  error,
}: {
  species: Species | undefined;
  hatchedOn: string | null;
  hatchUnknown: boolean;
  lifeStageCode: string | null;
  stageUncertain: boolean;
  weightG: number | null;
  variant?: "register" | "edit";
  onChange: (patch: HatchPatch) => void;
  error?: string;
}) {
  const fromHatch = species && !hatchUnknown ? lifeStageFromHatch(species, hatchedOn) : null;
  const fromWeight = species && hatchUnknown ? lifeStageFromWeight(species, weightG) : null;
  const chosen = stageOf(species, lifeStageCode);
  const unknown = lifeStageCode === LIFE_STAGE_UNKNOWN.code;
  const showStage = hatchUnknown || Boolean(hatchedOn);

  // 제안 안내: 부화일이 있으면 부화일 기준, 체중으로 정했으면 체중 기준
  const suggestion = fromHatch
    ? `부화일로 보면 ${fromHatch.name}예요. 다르면 바꿔 주세요.`
    : fromWeight && chosen && !unknown
      ? `체중 ${weightG}g으로 보면 ${fromWeight.name}예요. 다르면 바꿔 주세요.`
      : variant === "edit"
        ? "부화일을 모르면 단계를 직접 고르세요. '정확하지 않아요'는 어린 개체일 때만 고를 수 있어요."
        : "'정확하지 않아요'는 어린 개체일 때만 보여요";

  return (
    <div className="space-y-3">
      <Field label="부화일" htmlFor="pet-hatched" error={error}>
        <DateField
          id="pet-hatched"
          title="부화일"
          value={hatchUnknown ? null : hatchedOn}
          placeholder={hatchUnknown ? "모름" : undefined}
          disabled={hatchUnknown}
          invalid={Boolean(error)}
          max={todayYmd()}
          hint="오늘 뒤 날짜는 고를 수 없어요 · 연·월을 눌러 빠르게 옮겨요"
          onChange={(ymd) =>
            // 부화일을 넣으면 제안값을 미리 골라 둔다 (사용자가 바꿀 수 있다)
            onChange({
              hatchedOn: ymd,
              lifeStageCode: species ? (lifeStageFromHatch(species, ymd)?.code ?? null) : null,
              stageUncertain: false,
              weightG: null,
            })
          }
        />
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-body-lg text-secondary-text">
        <Checkbox
          checked={hatchUnknown}
          onCheckedChange={(on) =>
            onChange({
              hatchUnknown: on === true,
              hatchedOn: null,
              lifeStageCode: null,
              stageUncertain: false,
              weightG: null,
            })
          }
        />
        부화일을 몰라요
      </label>

      {showStage ? (
        <>
          <Field
            label={hatchUnknown && !chosen && !unknown ? "생애 단계를 골라 주세요" : "생애 단계"}
            hint={suggestion}
          >
            <ChipGroup
              label="생애 단계"
              options={LIFE_STAGE_CHOICES}
              value={lifeStageCode}
              onChange={(code) =>
                onChange({
                  lifeStageCode: code,
                  stageUncertain: code === "juvenile" ? stageUncertain : false,
                })
              }
            />
          </Field>
          {lifeStageCode === "juvenile" ? (
            <label className="flex min-h-11 items-center gap-2 text-body-lg text-secondary-text">
              <Checkbox
                checked={stageUncertain}
                onCheckedChange={(on) => onChange({ stageUncertain: on === true })}
              />
              정확하지 않아요
            </label>
          ) : null}
          {unknown ? (
            <WeightSuggestField
              species={species}
              weightG={weightG}
              variant={variant}
              onChange={onChange}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * '잘 모르겠어요'일 때 체중 칸(선택) (Figma 댓글 #5·#17).
 * 체중을 넣으면 가이드라인 참고 체중으로 단계를 제안하고 사용자가 확정한다.
 * [백엔드 확인 필요] CreatePetRequest·UpdatePetRequest에 체중 칸이 없어 등록 때 체중 기록(WEIGHT)으로 남긴다
 */
function WeightSuggestField({
  species,
  weightG,
  variant,
  onChange,
}: {
  species: Species | undefined;
  weightG: number | null;
  variant: "register" | "edit";
  onChange: (patch: HatchPatch) => void;
}) {
  const [text, setText] = useState(weightG?.toString() ?? "");
  const suggested = species ? lifeStageFromWeight(species, weightG) : null;

  return (
    <div className="space-y-2">
      <Field
        label="체중 (선택)"
        htmlFor="pet-weight"
        hint={
          suggested
            ? undefined
            : variant === "register"
              ? "체중을 모르면 그대로 등록해요. 오늘 할 일에 '체중 재기'를 제안해 드려요."
              : "체중을 재면 단계를 제안해 드려요."
        }
      >
        <Input
          id="pet-weight"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          placeholder="예: 35"
          suffix="g"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            onChange({ weightG: e.target.value && n > 0 ? n : null });
          }}
        />
      </Field>
      {suggested ? (
        <InfoBox tone="primary" className="flex items-center justify-between gap-3">
          <span>
            체중 {weightG}g으로 보면 <strong>{suggested.name}</strong>예요.
          </span>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => onChange({ lifeStageCode: suggested.code, stageUncertain: false })}
          >
            {suggested.name}로 정하기
          </Button>
        </InfoBox>
      ) : null}
    </div>
  );
}

const MORPH_MAX = 40;

/** 모프 칩 2열 + 기타(직접 입력) (P02 3/4, U4). 모프 목록은 종별 모프 API로 불러온다 */
export function MorphPicker({
  species,
  value,
  onChange,
}: {
  species: Species | undefined;
  value: string | null;
  onChange: (morph: string | null) => void;
}) {
  const { data: morphs, isPending } = useQuery(speciesQueries.morphs(species?.serverId));
  const known = (morphs ?? []).map((m) => m.name);
  // 목록에 없는 이름이면 '기타'. 목록을 불러온 뒤에 정해지도록 고른 값만 상태로 둔다
  const [otherPicked, setOther] = useState<boolean | null>(null);
  const other = otherPicked ?? Boolean(value && !known.includes(value));
  const choice = other ? "__other" : value;

  // 모프를 못 불러오면(isPending이 풀리면) 기타(직접 입력)만 보인다
  if (isPending) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-3">
      <ChipGroup
        label="모프"
        columns={2}
        options={[
          ...known.map((m) => ({ value: m, label: m })),
          { value: "__other", label: "기타(직접 입력)" },
        ]}
        value={choice}
        onChange={(v) => {
          if (v === "__other") {
            setOther(true);
            onChange(value && !known.includes(value) ? value : "");
          } else {
            setOther(false);
            onChange(v);
          }
        }}
      />
      {other ? (
        <Field label="모프 이름" htmlFor="morph-other">
          <Input
            id="morph-other"
            autoFocus
            maxLength={MORPH_MAX}
            placeholder="모프 이름을 적어 주세요"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="-mt-1 text-right text-body-md text-subtle-foreground">
            {(value ?? "").length} / {MORPH_MAX}자
          </p>
        </Field>
      ) : null}
    </div>
  );
}
