import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
import { ChipGroup } from "@/shared/ui/chip";
import { Avatar, InfoBox, Skeleton, Spinner } from "@/shared/ui/display";
import { CheckboxRow, Field, Input } from "@/shared/ui/form";
import { pickImages, uploadPicked } from "@/shared/ui/photo-input";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";
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
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    const [asset] = await pickImages(1);
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value.url ? "사진 바꾸기" : "사진 추가"}
        onPress={() => void pick()}
      >
        {/* 등록(P02)은 점선 동그라미에 '+ 사진', 정보 수정(P05)은 동그라미만 */}
        <Avatar
          src={value.url}
          size={72}
          style={!value.url && variant !== "edit" ? styles.dashedAvatar : undefined}
        >
          {uploading ? (
            <Spinner />
          ) : variant === "edit" ? null : (
            <Text variant="body-sm">+ 사진</Text>
          )}
        </Avatar>
      </Pressable>
      <Text
        variant="body-md"
        weight={variant === "edit" ? "medium" : "regular"}
        color={variant === "edit" ? semantic.primary : semantic.mutedForeground}
      >
        {variant === "edit" ? "사진 바꾸기" : "사진 (선택)"}
      </Text>
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
    <View style={styles.stack3}>
      <Field label="부화일" error={error}>
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
      </Field>
      <CheckboxRow
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
      >
        부화일을 몰라요
      </CheckboxRow>

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
    <View style={styles.stack2}>
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
      {suggested ? (
        <InfoBox tone="primary" style={styles.suggestBox}>
          <Text variant="body-md" color={semantic.secondaryText} style={{ flex: 1 }}>
            체중 {weightG}g으로 보면{" "}
            <Text variant="body-md" weight="bold">
              {suggested.name}
            </Text>
            예요.
          </Text>
          <Button
            size="sm"
            onPress={() => onChange({ lifeStageCode: suggested.code, stageUncertain: false })}
          >
            {`${suggested.name}로 정하기`}
          </Button>
        </InfoBox>
      ) : null}
    </View>
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
  if (isPending) return <Skeleton height={160} />;

  return (
    <View style={styles.stack3}>
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
  photoPicker: { alignItems: "center", gap: 6 },
  dashedAvatar: { borderWidth: 1.5, borderStyle: "dashed", borderColor: semantic.input },
  stack3: { gap: 12 },
  stack2: { gap: 8 },
  suggestBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  counter: { marginTop: -4 },
});
