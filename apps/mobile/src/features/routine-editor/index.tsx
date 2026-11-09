import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { routineSummary } from "@/entities/routine";
import { routinesApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import { isRoutineFoodNameSupported } from "@pabom/core/config/env";
import { formatInterval, isFeedItem, RECORD_KIND_HINT } from "@pabom/core/domain/care";
import {
  ROUTINE_INTERVAL_MAX,
  ROUTINE_INTERVAL_MIN,
  type Routine,
} from "@pabom/core/domain/routine";
import { Button } from "@/shared/ui/button";
import { Badge, InfoBox } from "@/shared/ui/display";
import { Input, Switch } from "@/shared/ui/form";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";

function useRoutineMutation() {
  const queryClient = useQueryClient();
  return {
    refresh: () => invalidateCareData(queryClient),
  };
}

/** 체크 리스트 한 줄 (SCR-P03): 항목·주기·기록 방식 · 수정 · 켜기/끄기 */
export function RoutineRow({
  routine,
  fallbackFoodName,
  onEdit,
}: {
  routine: Routine;
  /** 루틴 응답에 먹이 이름이 없을 때 보여 줄 가이드라인 기본 먹이 */
  fallbackFoodName?: string | null;
  onEdit: () => void;
}) {
  const { refresh } = useRoutineMutation();
  const label = routine.careItemName;
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => routinesApi.update(routine.id, { enabled }),
    // 켜고 끈 결과는 스위치로 보이니 토스트는 실패할 때만 (C3-4)
    onError: (error) => toast(getErrorMessage(error, "저장하지 못했어요.")),
    onSettled: refresh,
  });
  const enabled = toggle.isPending ? Boolean(toggle.variables) : routine.enabled;

  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <View style={styles.rowTitle}>
          <Text variant="body-xl" weight="bold">
            {label}
          </Text>
          {routine.customized ? <Badge tone="primary">내가 정한 주기</Badge> : null}
        </View>
        <Text variant="body-md" color={semantic.mutedForeground} numberOfLines={1}>
          {routineSummary(routine, fallbackFoodName)}
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onEdit} style={styles.edit}>
        <Text variant="body-lg" color={semantic.primary}>
          수정
        </Text>
      </Pressable>
      <Switch
        checked={enabled}
        accessibilityLabel={`${label} 켜기`}
        onChange={(on) => toggle.mutate(on)}
      />
    </View>
  );
}

/** 체크 리스트 항목 수정 창 (Figma P03 수정 창): 주기(1~365일) · 먹이 이름 · 기록 방식 안내 */
export function RoutineEditSheet({
  routine,
  onOpenChange,
}: {
  routine: Routine | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { refresh } = useRoutineMutation();
  const [shown, setShown] = useState<Routine | null>(null);
  const [intervalText, setIntervalText] = useState("");
  const [food, setFood] = useState("");
  if (routine && routine.id !== shown?.id) {
    setShown(routine);
    setIntervalText(String(routine.intervalDays));
    setFood(routine.foodName ?? "");
  }
  const current = routine ?? shown;
  const label = current?.careItemName ?? "";
  // 먹이 이름 칸은 백엔드 일정 API에 없어 목업일 때만 보여 준다
  const feed = current ? isFeedItem(current.recordKind) && isRoutineFoodNameSupported : false;
  const days = Number(intervalText);
  const invalid =
    !Number.isInteger(days) || days < ROUTINE_INTERVAL_MIN || days > ROUTINE_INTERVAL_MAX;
  // 가이드라인 범위 안내 (v1.2 P03): 직접 바꾼 주기는 범위를 숨기고 되돌리기만 보여 준다
  const range =
    current && !current.customized && current.minDays && current.maxDays
      ? { min: current.minDays, max: current.maxDays }
      : null;
  const outOfRange = range !== null && !invalid && (days < range.min || days > range.max);

  const save = useMutation({
    mutationFn: () =>
      routinesApi.update(current!.id, {
        intervalDays: days,
        foodName: feed ? food.trim() || null : undefined,
      }),
    onSuccess: () => onOpenChange(false),
    onError: (error) => toast(getErrorMessage(error, "저장하지 못했어요.")),
    onSettled: refresh,
  });

  /** 직접 바꾼 주기를 가이드라인 기준값으로 되돌린다 (POST /routines/{id}/reset) */
  const reset = useMutation({
    mutationFn: () => routinesApi.reset(current!.id),
    onSuccess: (next) => {
      onOpenChange(false);
      toast(`가이드라인 주기(${formatInterval(next.intervalDays)})로 되돌렸어요`);
    },
    onError: (error) => toast(getErrorMessage(error, "되돌리지 못했어요.")),
    onSettled: refresh,
  });
  const pending = save.isPending || reset.isPending;

  return (
    <Sheet
      open={Boolean(routine)}
      onOpenChange={onOpenChange}
      title={`${label} 수정`}
      footer={
        <>
          {current?.customized ? (
            <Button variant="outline" size="xl" disabled={pending} onPress={() => reset.mutate()}>
              가이드라인 주기로 되돌리기
            </Button>
          ) : null}
          <Button
            size="xl"
            style={{ flex: 1 }}
            disabled={invalid || pending}
            onPress={() => save.mutate()}
          >
            저장
          </Button>
        </>
      }
    >
      <SheetLabel first>주기</SheetLabel>
      <Input
        inputMode="numeric"
        keyboardType="number-pad"
        maxLength={3}
        containerStyle={{ width: 140 }}
        suffix="일마다"
        value={intervalText}
        invalid={intervalText !== "" && invalid}
        onChangeText={(text) => setIntervalText(text.replace(/[^0-9]/g, "").slice(0, 3))}
      />
      {range ? (
        <Text
          variant="body-md"
          color={outOfRange ? semantic.primary : semantic.mutedForeground}
          style={{ marginTop: 6 }}
        >
          {outOfRange ? "가이드라인 범위 밖 · " : ""}가이드라인 범위: {range.min}~{range.max}일
        </Text>
      ) : null}
      {feed ? (
        <>
          <SheetLabel>먹이 이름</SheetLabel>
          <Input maxLength={20} placeholder="예: 인공 사료" value={food} onChangeText={setFood} />
        </>
      ) : null}
      {current ? (
        <InfoBox
          style={{ marginTop: 16 }}
        >{`기록 방식 · ${RECORD_KIND_HINT[current.recordKind]}`}</InfoBox>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  edit: { flexShrink: 0, paddingHorizontal: 4, minHeight: 44, justifyContent: "center" },
});
