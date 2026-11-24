import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { speciesQueries } from "@/entities/species";
import { getErrorMessage } from "@pabom/core/api/errors";
import {
  LIFE_STAGE_CHOICES,
  LIFE_STAGE_UNKNOWN,
  lifeStageFromHatch,
  lifeStageFromWeight,
  type Species,
} from "@pabom/core/domain/species";
import { todayYmd } from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { InfoBox, Skeleton, Spinner } from "@/shared/ui/display";
import { ChipGroup } from "@/shared/ui/chip";
import { CheckboxRow, CheckToggle, Field, HelpMessage, Input } from "@/shared/ui/form";
import { CameraIcon } from "@/shared/ui/icons";
import { Menu } from "@/shared/ui/menu";
import { pickImages, takePhoto, uploadPicked } from "@/shared/ui/photo-input";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import lizardFigure from "../../../assets/images/species-lizard.png";
import { FieldLabel } from "./choice";

export type PhotoValue = { fileId: string | null; url: string | null };

/** 분류 피규어 (Figma 이미지 원본 · 3D 피규어). MVP 는 도마뱀(게코)만 */
export const LIZARD_FIGURE = lizardFigure;

const PHOTO = 120;
const BADGE = 36;

/**
 * 동그란 개체 사진 칸 (Figma ⑤ 사진 · 프로필 사진 120).
 * 사진이 없으면 흰 원 안에 종 피규어, 오른쪽 아래 검은 카메라 배지. 누르면 앨범·카메라 중 고르고(T08-04) 줄여서 바로 올린다
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
  const [uploading, setUploading] = useState(false);

  const pick = async (source: "library" | "camera") => {
    const [asset] = source === "camera" ? await takePhoto() : await pickImages(1);
    if (!asset) return;
    setUploading(true);
    onBusyChange?.(true);
    try {
      const photo = await uploadPicked(asset, "pet");
      onChange({ fileId: photo.id, url: photo.url });
    } catch (error) {
      toast(getErrorMessage(error, "사진을 올리지 못했어요."));
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  return (
    <View style={styles.photoPicker}>
      <Menu
        label={value.url ? "사진 바꾸기" : "사진 추가"}
        triggerSize={PHOTO}
        trigger={
          <View style={styles.photoFrame}>
            <View style={styles.photoCircle}>
              {value.url ? (
                <Image source={{ uri: value.url }} alt="" resizeMode="cover" style={styles.fill} />
              ) : (
                <View style={styles.figure}>
                  <Image source={lizardFigure} alt="" resizeMode="contain" style={styles.fill} />
                </View>
              )}
              {uploading ? (
                <View style={styles.uploading}>
                  <Spinner />
                </View>
              ) : null}
            </View>
            <View style={styles.cameraBadge}>
              <CameraIcon size={20} color={semantic.inverseForeground} />
            </View>
          </View>
        }
        items={[
          { label: "앨범에서 고르기", onSelect: () => void pick("library") },
          { label: "카메라로 찍기", onSelect: () => void pick("camera") },
        ]}
      />
    </View>
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
    <View style={styles.stack24}>
      <View style={styles.stack8}>
        <View style={styles.titleRow}>
          <FieldLabel>부화일</FieldLabel>
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
        </View>
        <DateField
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
        {error ? <HelpMessage tone="error">{error}</HelpMessage> : null}
      </View>

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
    </View>
  );
}

/**
 * '잘 모르겠어요'일 때 체중 칸(선택) (U5 · Figma 댓글 #5·#17).
 * 체중을 넣으면 가이드라인 참고 체중으로 단계를 제안하고(파란 안내 상자) 사용자가 확정한다.
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
    <View style={styles.stack8}>
      {suggested ? (
        <InfoBox tone="primary" style={styles.suggestBox}>
          <Text variant="body-md" color={semantic.secondaryText} style={{ flex: 1 }}>
            체중으로 보면{" "}
            <Text variant="body-md" weight="bold">
              {suggested.name}
            </Text>
            예요. 다르면 바꿔 주세요.
          </Text>
          <Button
            size="sm"
            onPress={() => onChange({ lifeStageCode: suggested.code, stageUncertain: false })}
          >
            {`${suggested.name}로 정하기`}
          </Button>
        </InfoBox>
      ) : null}
      <Field
        label="체중 (선택)"
        hint={
          suggested
            ? undefined
            : variant === "register"
              ? "체중을 모르면 그대로 등록해요. 오늘 할 일에 '체중 재기'를 제안해 드려요."
              : "체중을 재면 단계를 제안해 드려요."
        }
      >
        <Input
          inputMode="decimal"
          keyboardType="decimal-pad"
          placeholder="예: 35"
          suffix="g"
          value={text}
          onChangeText={(next) => {
            setText(next);
            const n = Number(next);
            onChange({ weightG: next && n > 0 ? n : null });
          }}
        />
      </Field>
    </View>
  );
}

const MORPH_MAX = 40;
const OTHER = "__other";

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
  const choice = other ? OTHER : value;

  // 모프를 못 불러오면(isPending이 풀리면) 기타(직접 입력)만 보인다
  if (isPending) return <Skeleton height={148} />;

  return (
    <View style={styles.stack12}>
      <ChipGroup
        label="모프"
        allowDeselect
        options={[
          ...known.map((m) => ({ value: m, label: m })),
          { value: OTHER, label: "기타(직접 입력)" },
        ]}
        value={choice}
        onChange={(v) => {
          if (v === OTHER) {
            setOther(true);
            onChange(value && !known.includes(value) ? value : "");
          } else {
            setOther(false);
            onChange(v);
          }
        }}
      />
      {other ? (
        <Field label="모프 이름">
          <Input
            autoFocus
            maxLength={MORPH_MAX}
            placeholder="모프 이름을 적어 주세요"
            value={value ?? ""}
            onChangeText={onChange}
          />
          <Text
            variant="body-md"
            color={semantic.subtleForeground}
            align="right"
            style={styles.counter}
          >
            {(value ?? "").length} / {MORPH_MAX}자
          </Text>
        </Field>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  photoPicker: { alignItems: "center" },
  photoFrame: { width: PHOTO, height: PHOTO },
  photoCircle: {
    width: PHOTO,
    height: PHOTO,
    overflow: "hidden",
    borderRadius: PHOTO / 2,
    backgroundColor: semantic.card,
  },
  // 피규어는 원보다 살짝 넓게 (Figma 기본 이미지 133×91, 원 왼쪽 -5 · 위 14). 흰 배경 사진이라 곱하기로 섞는다
  figure: {
    position: "absolute",
    left: -5,
    top: 14,
    width: 133,
    height: 91,
    mixBlendMode: "multiply",
  },
  fill: { width: "100%", height: "100%" },
  uploading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.overlay,
  },
  cameraBadge: {
    position: "absolute",
    left: 88,
    top: 84,
    width: BADGE,
    height: BADGE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: semantic.card,
    backgroundColor: semantic.inverse,
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stack24: { gap: 24 },
  stack12: { gap: 12 },
  stack8: { gap: 8 },
  suggestBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  counter: { marginTop: -4 },
});
