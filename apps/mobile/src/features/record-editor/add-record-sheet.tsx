import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { petQueries } from "@/entities/pet";
import { routineQueries } from "@/entities/routine";
import { useFeedResultSet } from "@/entities/species";
import { useWeightStageToast } from "@/features/pet-lifecycle";
import { recordsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import {
  careItemLabel,
  compareCareItems,
  intakeOptionsFor,
  MEMO_CODE,
  type Intake,
  type RecordKind,
} from "@pabom/core/domain/care";
import type { Routine } from "@pabom/core/domain/routine";
import { MEMO_MAX, type Photo } from "@pabom/core/domain/record";
import {
  formatShortDay,
  nowIso,
  todayYmd,
  yesterdaySameTimeIso,
  ymdWithNowTime,
} from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { DatePickerSheet } from "@/shared/ui/calendar";
import { Chip, ChipGroup } from "@/shared/ui/chip";
import { Input, Textarea } from "@/shared/ui/form";
import { PhotoInput } from "@/shared/ui/photo-input";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";

type ItemOption = { value: string; label: string; kind: RecordKind };

/** 항목 칩은 고른 개체의 체크 리스트(백엔드 항목) 순서대로, 마지막에 메모 (Figma R03) */
function itemOptions(routines: Routine[] | undefined): ItemOption[] {
  const fromRoutines = [...(routines ?? [])]
    .sort(compareCareItems)
    .map((r) => ({ value: r.careItem, label: r.careItemName, kind: r.recordKind }));
  return [...fromRoutines, { value: MEMO_CODE, label: careItemLabel(MEMO_CODE), kind: "memo" }];
}

type When = { kind: "now" } | { kind: "yesterday" } | { kind: "date"; ymd: string };

/** 기록 추가 시트 (SCR-R03). 할 일과 별개로 지난 날짜까지 직접 기록 */
export function AddRecordSheet({
  open,
  onOpenChange,
  defaultPetId,
  defaultItem,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPetId?: string;
  /** 홈 '체중 재기' 제안 카드처럼 항목(코드)을 정해 두고 열 때 */
  defaultItem?: string;
  /** 홈 지난 날짜에서 '+ 이날 기록 추가'로 열면 그 날짜 */
  defaultDate?: string;
}) {
  const queryClient = useQueryClient();
  const { data: pets } = useQuery({ ...petQueries.list("active"), enabled: open });
  const [petId, setPetId] = useState<string | null>(null);
  const [item, setItem] = useState<string | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [weight, setWeight] = useState("");
  const [when, setWhen] = useState<When>({ kind: "now" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [memo, setMemo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setPetId(defaultPetId ?? null);
      setItem(defaultItem ?? null);
      setIntake(null);
      setWeight("");
      setPhotos([]);
      setMemo("");
      setWhen(
        defaultDate && defaultDate !== todayYmd()
          ? { kind: "date", ymd: defaultDate }
          : { kind: "now" },
      );
    }
  }
  // 개체가 한 마리면 자동으로 고른다
  const selectedPet = petId ?? (pets?.length === 1 ? pets[0]!.id : null);
  const { data: routines } = useQuery({
    ...routineQueries.list(selectedPet ?? ""),
    enabled: open && Boolean(selectedPet),
  });
  const options = itemOptions(routines);
  // 개체를 바꾸면 그 개체에 없는 항목은 고른 상태에서 빠진다
  const selected = options.find((o) => o.value === item) ?? null;
  const kind = selected?.kind ?? null;
  // 급여 칩은 그 개체 종의 먹이 묶음(인공 사료·곤충·통먹이)에 맞춘다 (D2)
  const feedResultSet = useFeedResultSet(
    pets?.find((p) => p.id === selectedPet)?.speciesId,
    kind === "intake" ? selected?.value : null,
  );
  const suggestStage = useWeightStageToast();
  const weightValue = weight ? Number(weight) : null;
  const weightInvalid =
    kind === "weight" && (!weightValue || weightValue <= 0 || weightValue > 5000);
  const memoMissing = kind === "memo" && !memo.trim() && photos.length === 0;
  // 급여는 먹은 정도를 골라야 저장할 수 있다 (C2-3)
  const intakeMissing = kind === "intake" && !intake;

  const save = useMutation({
    mutationFn: () =>
      recordsApi.create({
        petId: selectedPet!,
        careItem: item!,
        occurredAt:
          when.kind === "now"
            ? nowIso()
            : when.kind === "yesterday"
              ? yesterdaySameTimeIso()
              : ymdWithNowTime(when.ymd),
        intake: kind === "intake" ? intake : null,
        weightG: kind === "weight" ? weightValue : null,
        memo: memo.trim() || null,
        photoFileIds: photos.map((p) => p.id),
      }),
    onSuccess: (saved) => {
      onOpenChange(false);
      // 체중을 남기면 단계 확인 전·성체 참고 체중·체중 정체에 맞춰 체크 리스트 바꾸기를 제안한다 (C3)
      if (saved.weightG) {
        void suggestStage({ petId: saved.petId, weightG: saved.weightG, recordId: saved.id });
      }
    },
    onError: (error) => toast(getErrorMessage(error, "저장하지 못했어요.")),
    onSettled: () => invalidateCareData(queryClient),
  });

  const canSave =
    selectedPet &&
    selected &&
    !weightInvalid &&
    !memoMissing &&
    !intakeMissing &&
    !uploading &&
    !save.isPending;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="기록 추가"
        footer={
          <View style={styles.footer}>
            <Button
              size="xl"
              disabled={!canSave}
              loading={save.isPending}
              accessibilityLabel={save.isPending ? "저장 중" : undefined}
              onPress={() => save.mutate()}
            >
              저장
            </Button>
            {uploading ? (
              <Text variant="body-md" color={semantic.mutedForeground} align="center">
                사진을 올리는 동안은 저장할 수 없어요
              </Text>
            ) : null}
          </View>
        }
      >
        <SheetLabel first>어느 개체인가요?</SheetLabel>
        <ChipGroup
          label="개체"
          options={(pets ?? []).map((p) => ({ value: p.id, label: p.name }))}
          value={selectedPet}
          onChange={setPetId}
        />
        <SheetLabel>무엇을 기록할까요?</SheetLabel>
        <ChipGroup
          label="항목"
          options={options.map(({ value, label }) => ({ value, label }))}
          value={selected?.value ?? null}
          onChange={setItem}
        />
        {kind === "intake" ? (
          <>
            <SheetLabel>얼마나 먹었나요?</SheetLabel>
            <ChipGroup
              label="먹은 정도"
              columns={2}
              allowDeselect
              options={intakeOptionsFor(feedResultSet)}
              value={intake}
              onChange={setIntake}
            />
          </>
        ) : null}
        {kind === "weight" ? (
          <>
            <SheetLabel>몸무게</SheetLabel>
            <Input
              accessibilityLabel="몸무게"
              inputMode="decimal"
              keyboardType="decimal-pad"
              placeholder="0.0"
              suffix="g"
              value={weight}
              onChangeText={(text) => setWeight(text.replace(/[^0-9.]/g, ""))}
            />
          </>
        ) : null}
        <SheetLabel>언제 있었던 일인가요?</SheetLabel>
        <View style={styles.chips}>
          <Chip selected={when.kind === "now"} onPress={() => setWhen({ kind: "now" })}>
            지금
          </Chip>
          <Chip selected={when.kind === "yesterday"} onPress={() => setWhen({ kind: "yesterday" })}>
            어제
          </Chip>
          <Chip selected={when.kind === "date"} onPress={() => setCalendarOpen(true)}>
            {when.kind === "date" ? formatShortDay(when.ymd) : "달력에서 고르기"}
          </Chip>
        </View>
        <SheetLabel>사진 (선택)</SheetLabel>
        <PhotoInput
          value={photos}
          onChange={setPhotos}
          onView={setViewer}
          onBusyChange={setUploading}
        />
        <SheetLabel>{kind === "memo" ? "메모" : "메모 (선택)"}</SheetLabel>
        <Textarea
          accessibilityLabel={kind === "memo" ? "메모" : "메모 (선택)"}
          placeholder="메모를 남겨 주세요"
          maxLength={MEMO_MAX}
          value={memo}
          onChangeText={setMemo}
        />
      </Sheet>
      <DatePickerSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        title="날짜 고르기"
        value={when.kind === "date" ? when.ymd : null}
        max={todayYmd()}
        hint="오늘 뒤 날짜는 고를 수 없어요"
        onConfirm={(ymd) => setWhen(ymd === todayYmd() ? { kind: "now" } : { kind: "date", ymd })}
      />
      <PhotoViewer
        open={viewer !== null}
        onOpenChange={(o) => !o && setViewer(null)}
        photos={photos}
        initialIndex={viewer ?? 0}
      />
    </>
  );
}

const styles = StyleSheet.create({
  footer: { flex: 1, gap: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
