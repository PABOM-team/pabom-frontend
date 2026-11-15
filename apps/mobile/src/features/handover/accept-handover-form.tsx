import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSpeciesMap } from "@/entities/species";
import { handoverApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { invalidateCareData, queryKeys } from "@pabom/core/api/query-keys";
import type { HandoverPreview } from "@pabom/core/domain/handover";
import { SPECIES_LABEL } from "@pabom/core/domain/pet";
import { todayYmd } from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ChipGroup } from "@/shared/ui/chip";
import { Field, Input, Switch } from "@/shared/ui/form";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";

/** 생애 단계 칩의 '잘 모르겠어요' 값. 저장할 때는 null로 보낸다 */
const STAGE_UNKNOWN = "unknown";

/**
 * SCR-T03 인계 카드로 개체 등록 (2차). 카드 내용으로 미리 채우고, 종은 읽기 전용.
 * 생애 단계는 카드에 적힌 단계를 칩에 미리 골라 두고 바꿀 수 있다 (v1.2 개발 명세 3-1)
 */
export function AcceptHandoverForm({
  preview,
}: {
  preview: HandoverPreview & { pet: NonNullable<HandoverPreview["pet"]> };
}) {
  const queryClient = useQueryClient();
  const species = useSpeciesMap().get(preview.pet.speciesId);
  const [name, setName] = useState(preview.pet.name);
  const [hatchedOn, setHatchedOn] = useState(preview.pet.hatchedOn);
  const [acquiredOn, setAcquiredOn] = useState<string | null>(preview.pet.handedOverOn);
  const [stageCode, setStageCode] = useState(preview.pet.lifeStageCode || STAGE_UNKNOWN);
  const [importRoutines, setImportRoutines] = useState(preview.routines.length > 0);
  // 칩: 백엔드 단계(어린 개체·성체) + 잘 모르겠어요. 단계 이름은 종 API 값을 그대로 쓴다
  const stageOptions = [
    ...(species?.lifeStages ?? [])
      .filter((s) => s.id !== null)
      .map((s) => ({ value: s.code, label: s.name })),
    { value: STAGE_UNKNOWN, label: "잘 모르겠어요" },
  ];

  const accept = useMutation({
    mutationFn: () =>
      handoverApi.accept(preview.code, {
        name: name.trim(),
        hatchedOn,
        lifeStageCode: stageCode === STAGE_UNKNOWN ? null : stageCode,
        acquiredOn: acquiredOn!,
        importRoutines,
      }),
    onSuccess: async (pet) => {
      await invalidateCareData(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.handoverPreview(preview.code) });
      router.replace({
        pathname: "/pets/[petId]/routines",
        params: { petId: pet.id, from: "register" },
      });
    },
    onError: (error) => toast(getErrorMessage(error, "등록하지 못했어요.")),
  });

  return (
    <Screen>
      <TopBar
        title="인계 카드로 등록하기"
        fallbackHref={{ pathname: "/share/[token]", params: { token: preview.code } }}
      />
      <ScreenBody gap={16}>
        <Text variant="body-lg" color={semantic.secondaryText}>
          카드 내용을 미리 채웠어요. 확인하고 필요하면 고쳐 주세요.
        </Text>
        <Field label="이름">
          <Input maxLength={20} value={name} onChangeText={setName} />
        </Field>
        <Field label="종 · 모프">
          <View style={styles.readonly}>
            <Text variant="body-xl" color={semantic.secondaryText}>
              {[SPECIES_LABEL[preview.pet.speciesId], preview.pet.morph]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </Field>
        <Field label="부화일">
          <DateField title="부화일" value={hatchedOn} max={todayYmd()} onChange={setHatchedOn} />
        </Field>
        <Field label="생애 단계" hint="인계 카드에 적힌 단계예요. 다르면 바꿔 주세요.">
          <ChipGroup
            label="생애 단계"
            options={stageOptions}
            value={stageCode}
            onChange={(code) => code && setStageCode(code)}
          />
        </Field>
        <Field label="분양받은 날">
          <DateField
            title="분양받은 날"
            value={acquiredOn}
            max={todayYmd()}
            onChange={setAcquiredOn}
          />
        </Field>
        {preview.routines.length ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: importRoutines }}
            onPress={() => setImportRoutines(!importRoutines)}
            style={styles.switchRow}
          >
            <View style={styles.grow}>
              <Text variant="body-xl" weight="bold">
                체크 리스트도 가져오기
              </Text>
              <Text variant="body-md" color={semantic.mutedForeground}>
                항목 {preview.routines.length}개 · 다음 예정일은 오늘 기준으로 다시 계산해요
              </Text>
            </View>
            <Switch checked={importRoutines} onChange={setImportRoutines} />
          </Pressable>
        ) : null}
      </ScreenBody>
      <ScreenFooter>
        <Button
          size="xl"
          disabled={!name.trim() || !acquiredOn || accept.isPending}
          onPress={() => accept.mutate()}
        >
          {accept.isPending ? "등록 중…" : "등록하기"}
        </Button>
      </ScreenFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  readonly: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: semantic.muted,
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 8 },
  grow: { flex: 1, minWidth: 0 },
});
