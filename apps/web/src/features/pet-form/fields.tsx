"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { speciesQueries } from "@/entities/species";
import { filesApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import {
  LIFE_STAGE_CHOICES,
  LIFE_STAGE_UNKNOWN,
  lifeStageFromHatch,
  lifeStageFromWeight,
  type Species,
} from "@pabom/core/domain/species";
import { todayYmd } from "@pabom/core/lib/date";
import { resizeImage } from "@/shared/lib/image";
import { useTouchDevice } from "@/shared/lib/use-touch-device";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ChipGroup } from "@/shared/ui/chip";
import { InfoBox, Skeleton, Spinner } from "@/shared/ui/display";
import { CheckboxRow, CheckToggle, Field, HelpMessage, Input } from "@/shared/ui/form";
import { CameraIcon } from "@/shared/ui/icons";
import { Menu } from "@/shared/ui/menu";
import { toast } from "@/shared/ui/toast";
import { FieldLabel, LIZARD_FIGURE } from "./choice";

export type PhotoValue = { fileId: string | null; url: string | null };

const PHOTO = 120;

/**
 * 동그란 개체 사진 칸 (Figma ⑤ 사진 · 프로필 사진 120, 앱 fields.tsx 와 같다).
 * 사진이 없으면 흰 원 안에 종 피규어, 오른쪽 아래 검은 카메라 배지. 고르면 줄여서 바로 올린다
 */
export function PetPhotoPicker({
  value,
  onChange,
  onBusyChange,
}: {
  value: PhotoValue;
  onChange: (value: PhotoValue) => void;
  /** 예전 호출부 호환용. 등록·수정 모두 같은 모양이다 */
  variant?: "register" | "edit";
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  // 카메라로 찍기는 휴대폰 브라우저에서만 고르게 한다. 데스크톱은 capture 를 무시하고 파일 창을 연다
  const touch = useTouchDevice();
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

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    void pick(e.target.files?.[0]);
    e.target.value = "";
  };

  const label = value.url ? "사진 바꾸기" : "사진 추가";
  const frame = (
    <span className="relative block" style={{ width: PHOTO, height: PHOTO }}>
      <span className="absolute inset-0 overflow-hidden rounded-full bg-card">
        {value.url ? (
          // 서명 URL 이라 next/image 최적화를 쓰지 않는다
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.url} alt="" className="size-full object-cover" />
        ) : (
          // 피규어는 원보다 살짝 넓게 (Figma 기본 이미지 133×91, 원 왼쪽 -5 · 위 14). 흰 배경 사진이라 곱하기로 섞는다
          <span className="absolute top-3.5 -left-1.25 h-[91px] w-[133px] mix-blend-multiply">
            <Image src={LIZARD_FIGURE} alt="" fill sizes="133px" className="object-contain" />
          </span>
        )}
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-gray-900/40">
            <Spinner />
          </span>
        ) : null}
      </span>
      <span className="absolute top-21 left-22 flex size-9 items-center justify-center rounded-full border-2 border-card bg-inverse text-inverse-foreground">
        <CameraIcon className="size-5" />
      </span>
    </span>
  );

  return (
    <div className="flex justify-center">
      {touch ? (
        // 휴대폰 브라우저에서는 앨범·카메라 중 고른다 (T08-04)
        <Menu
          label={label}
          trigger={frame}
          triggerClassName="size-auto rounded-full hover:bg-transparent active:bg-transparent data-[state=open]:bg-transparent"
          items={[
            { label: "앨범에서 고르기", onSelect: () => inputRef.current?.click() },
            { label: "카메라로 찍기", onSelect: () => cameraRef.current?.click() },
          ]}
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={label}
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          {frame}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFile}
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
 * 부화일(제목 줄 오른쪽 '✓ 몰라요') + 생애 단계 칩 3개 [어린 개체] [성체] [잘 모르겠어요] (P02 3/3 · P05 · U5).
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="pet-hatched">부화일</FieldLabel>
          <CheckToggle
            checked={hatchUnknown}
            onChange={(on) =>
              onChange({
                hatchUnknown: on,
                hatchedOn: null,
                lifeStageCode: null,
                stageUncertain: false,
                weightG: null,
              })
            }
          />
        </div>
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
        {error ? (
          <HelpMessage tone="error" role="alert">
            {error}
          </HelpMessage>
        ) : null}
      </div>

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
            <CheckboxRow
              checked={stageUncertain}
              onChange={(on) => onChange({ stageUncertain: on })}
            >
              정확하지 않아요
            </CheckboxRow>
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
    <div className="flex flex-col gap-2">
      {suggested ? (
        <InfoBox tone="primary" className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 font-normal text-secondary-text">
            체중으로 보면 <strong className="font-bold">{suggested.name}</strong>예요. 다르면 바꿔
            주세요.
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
    </div>
  );
}

const MORPH_MAX = 40;

/** 모프 칩(줄바꿈) + 기타(직접 입력) (P02 2/3 · U4). 모프 목록은 종별 모프 API로 불러온다. 모프는 선택이라 다시 누르면 비운다 */
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
  if (isPending) return <Skeleton height={148} />;

  return (
    <div className="flex flex-col gap-3">
      <ChipGroup
        label="모프"
        allowDeselect
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
