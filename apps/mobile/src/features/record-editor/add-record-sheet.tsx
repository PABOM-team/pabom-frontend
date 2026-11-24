import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { PetPhoto, petQueries, petSpeciesLine } from "@/entities/pet";
import { CareItemIcon, recordQueries } from "@/entities/record";
import { routineQueries } from "@/entities/routine";
import { useDefaultFoodNameResolver, useFeedResultSet } from "@/entities/species";
import { useWeightStageToast } from "@/features/pet-lifecycle";
import { recordsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import {
  careItemLabel,
  compareCareItems,
  intakeOptionsFor,
  MEMO_CODE,
  WEIGHT_CODE,
  type Intake,
  type RecordKind,
} from "@pabom/core/domain/care";
import type { Pet } from "@pabom/core/domain/pet";
import { MEMO_MAX, type Photo } from "@pabom/core/domain/record";
import type { Routine } from "@pabom/core/domain/routine";
import {
  formatRelativeDay,
  formatShortDay,
  nowIso,
  todayYmd,
  ymdOf,
  ymdWithNowTime,
} from "@pabom/core/lib/date";
import { josa } from "@pabom/core/lib/josa";
import { Button } from "@/shared/ui/button";
import { DatePickerSheet } from "@/shared/ui/calendar";
import { Textarea } from "@/shared/ui/form";
import { ChevronDownIcon } from "@/shared/ui/icons";
import { PhotoInput } from "@/shared/ui/photo-input";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Sheet } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import {
  AddExtraLink,
  CheckDot,
  DetailRow,
  IntakeChoice,
  Keypad,
  pressKey,
  SheetDivider,
  StepView,
  WeightDisplay,
} from "./parts";

type ItemOption = { value: string; label: string; kind: RecordKind };

/** 항목 타일은 고른 개체들의 체크 리스트(백엔드 항목) 순서대로, 마지막에 메모 (Figma R03) */
function itemOptions(routines: Routine[]): ItemOption[] {
  const unique = [...new Map(routines.map((r) => [r.careItem, r])).values()];
  const fromRoutines = unique
    .sort(compareCareItems)
    .map((r) => ({ value: r.careItem, label: r.careItemName, kind: r.recordKind }));
  return [...fromRoutines, { value: MEMO_CODE, label: careItemLabel(MEMO_CODE), kind: "memo" }];
}

type When = { kind: "now" } | { kind: "date"; ymd: string };
type Step = "who" | "what" | "value";

/** 콩이 / 콩이 외 1마리 */
const petsLabel = (pets: Pet[]) =>
  pets.length > 1 ? `${pets[0]!.name} 외 ${pets.length - 1}마리` : (pets[0]?.name ?? "");

/**
 * 기록 추가 시트 (SCR-R03). 0 누구(체크로 고르기) → 1 무엇(타일) → 2·3 값 입력.
 * 개체가 1마리거나 미리 정해 두고 열면 0번을 건너뛴다. 할 일과 별개로 지난 날짜까지 직접 기록
 */
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
  const { data: pets } = useQuery({ ...petQueries.list(), enabled: open });
  const [petIds, setPetIds] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("who");
  // 타일 4칸이 시트 폭을 꽉 채운다 (좌우 여백 20 · 칸 사이 10). 넓은 폰에서 오른쪽이 비지 않게
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = Math.floor((screenWidth - 40 - 30) / 4);
  const [item, setItem] = useState<string | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [weight, setWeight] = useState("");
  const [when, setWhen] = useState<When>({ kind: "now" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [memo, setMemo] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setPetIds(defaultPetId ? [defaultPetId] : []);
      setStep(defaultPetId ? (defaultItem ? "value" : "what") : "who");
      setItem(defaultItem ?? null);
      setIntake(null);
      setWeight("");
      setPhotos([]);
      setMemo("");
      setExtraOpen(false);
      setWhen(
        defaultDate && defaultDate !== todayYmd()
          ? { kind: "date", ymd: defaultDate }
          : { kind: "now" },
      );
    }
  }

  // 개체가 한 마리면 자동으로 고르고 0번(누구)을 건너뛴다
  const onlyPet = pets?.length === 1 ? pets[0]! : null;
  const selectedIds = petIds.length ? petIds : onlyPet ? [onlyPet.id] : [];
  const selectedPets = (pets ?? []).filter((p) => selectedIds.includes(p.id));
  const current: Step = step === "who" && onlyPet ? (item ? "value" : "what") : step;
  const routineLists = useQueries({
    queries: selectedIds.map((id) => ({ ...routineQueries.list(id), enabled: open })),
  });
  const options = itemOptions(routineLists.flatMap((q) => q.data ?? []));
  // 개체를 바꾸면 그 개체에 없는 항목은 고른 상태에서 빠진다
  const selected = options.find((o) => o.value === item) ?? null;
  const kind = selected?.kind ?? null;
  const firstPet = selectedPets[0];
  const single = selectedPets.length === 1;
  // 급여 칩은 그 개체 종의 먹이 묶음(인공 사료·곤충·통먹이)에 맞춘다 (D2)
  const feedResultSet = useFeedResultSet(
    firstPet?.speciesId,
    kind === "intake" ? selected?.value : null,
  );
  const resolveFoodName = useDefaultFoodNameResolver();
  const foodName =
    kind === "intake" && selected ? resolveFoodName(firstPet?.speciesId, selected.value) : null;
  const { data: lastWeight } = useQuery({
    ...recordQueries.list({ petId: firstPet?.id, careItem: WEIGHT_CODE, limit: 1 }),
    enabled: open && single && kind === "weight",
  });
  const lastWeightRecord = lastWeight?.items[0];
  const suggestStage = useWeightStageToast();
  const weightValue = weight ? Number(weight) : null;
  const weightInvalid =
    kind === "weight" && (!weightValue || weightValue <= 0 || weightValue > 5000);
  const memoMissing = kind === "memo" && !memo.trim() && photos.length === 0;
  // 급여는 먹은 정도를 골라야 저장할 수 있다 (C2-3)
  const intakeMissing = kind === "intake" && !intake;

  const refresh = () => invalidateCareData(queryClient);
  const save = useMutation({
    mutationFn: () =>
      Promise.all(
        selectedPets.map((pet) =>
          recordsApi.create({
            petId: pet.id,
            careItem: item!,
            occurredAt: when.kind === "now" ? nowIso() : ymdWithNowTime(when.ymd),
            intake: kind === "intake" ? intake : null,
            weightG: kind === "weight" ? weightValue : null,
            memo: memo.trim() || null,
            photoFileIds: photos.map((p) => p.id),
          }),
        ),
      ),
    onSuccess: (saved) => {
      onOpenChange(false);
      // 기록 완료 토스트 · 되돌리기로 바로 취소 (Figma R03 4)
      toast(
        `${josa(petsLabel(selectedPets), "이/가")} ${selected?.label ?? ""} 기록을 저장했어요`,
        {
          action: {
            label: "되돌리기",
            onClick: () =>
              Promise.all(saved.map((r) => recordsApi.remove(r.id)))
                .then(() => toast("기록을 되돌렸어요"))
                .catch((error) => toast(getErrorMessage(error, "되돌리지 못했어요.")))
                .finally(refresh),
          },
        },
      );
      // 체중을 남기면 단계 확인 전·성체 참고 체중·체중 정체에 맞춰 체크 리스트 바꾸기를 제안한다 (C3)
      const first = saved[0];
      if (saved.length === 1 && first?.weightG) {
        void suggestStage({ petId: first.petId, weightG: first.weightG, recordId: first.id });
      }
    },
    onError: (error) => toast(getErrorMessage(error, "저장하지 못했어요.")),
    onSettled: refresh,
  });

  const canSave =
    selectedPets.length > 0 &&
    selected &&
    !weightInvalid &&
    !memoMissing &&
    !intakeMissing &&
    !uploading &&
    !save.isPending;

  const who = petsLabel(selectedPets);
  const whenLabel = when.kind === "now" ? "지금" : formatShortDay(when.ymd);
  const dayWord = when.kind === "now" ? "오늘" : `${formatShortDay(when.ymd)}에`;
  const title =
    current === "who"
      ? "누구의 기록인가요?"
      : current === "what"
        ? "무엇을 기록할까요?"
        : !selected
          ? "기록 추가"
          : kind === "weight"
            ? `${who}, 몸무게는 얼마인가요?`
            : kind === "intake"
              ? `${who}, ${dayWord} 먹었나요?`
              : kind === "memo"
                ? `${who}에게 무슨 일이 있었나요?`
                : `${who}, ${josa(selected.label, "을/를")} 했나요?`;

  const allChecked = Boolean(pets?.length) && petIds.length === pets?.length;
  const togglePet = (id: string) =>
    setPetIds(petIds.includes(id) ? petIds.filter((p) => p !== id) : [...petIds, id]);

  const footer =
    current === "who" ? (
      <Button
        size="xl"
        style={{ flex: 1 }}
        disabled={petIds.length === 0}
        onPress={() => setStep("what")}
      >
        {petIds.length ? `${petIds.length}마리 기록하기` : "기록할 개체를 골라 주세요"}
      </Button>
    ) : current === "value" ? (
      <View style={styles.footer}>
        <Button
          size="xl"
          disabled={!canSave}
          loading={save.isPending}
          accessibilityLabel={save.isPending ? "저장 중" : undefined}
          onPress={() => save.mutate()}
        >
          기록하기
        </Button>
        {uploading ? (
          <Text variant="body-md" color={semantic.mutedForeground} align="center">
            사진을 올리는 동안은 저장할 수 없어요
          </Text>
        ) : null}
      </View>
    ) : undefined;

  const extra = (
    <>
      {kind !== "memo" && !extraOpen ? (
        <AddExtraLink onPress={() => setExtraOpen(true)} />
      ) : (
        <View style={styles.extra}>
          {kind !== "memo" ? (
            <Textarea
              accessibilityLabel="메모 (선택)"
              placeholder="메모를 남겨 주세요"
              maxLength={MEMO_MAX}
              value={memo}
              onChangeText={setMemo}
            />
          ) : null}
          <PhotoInput
            value={photos}
            onChange={setPhotos}
            max={5}
            onView={setViewer}
            onBusyChange={setUploading}
          />
        </View>
      )}
    </>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title={title} footer={footer}>
        {current === "who" ? (
          <StepView key="who">
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allChecked }}
              onPress={() => setPetIds(allChecked ? [] : (pets ?? []).map((p) => p.id))}
              style={styles.allRow}
            >
              <Text variant="body-xl" weight="semibold" style={{ flex: 1 }}>
                {allChecked ? "전체 해제" : "전체 선택"}
              </Text>
              <CheckDot checked={allChecked} />
            </Pressable>
            <SheetDivider />
            {(pets ?? []).map((pet) => {
              const checked = petIds.includes(pet.id);
              return (
                <Pressable
                  key={pet.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={pet.name}
                  onPress={() => togglePet(pet.id)}
                  style={styles.petRow}
                >
                  <PetPhoto
                    src={pet.photoUrl}
                    rounded={radius.full}
                    iconSize={20}
                    style={styles.petPhoto}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="body-xl" weight="semibold" numberOfLines={1}>
                      {pet.name}
                    </Text>
                    <Text variant="body-lg" color={semantic.subtleForeground} numberOfLines={1}>
                      {petSpeciesLine(pet)}
                    </Text>
                  </View>
                  <CheckDot checked={checked} />
                </Pressable>
              );
            })}
          </StepView>
        ) : null}

        {current === "what" ? (
          <StepView key="what">
            {onlyPet ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${who}, 개체 다시 고르기`}
                onPress={() => {
                  setPetIds(selectedIds);
                  setStep("who");
                }}
                style={styles.petChip}
              >
                <PetPhoto
                  src={firstPet?.photoUrl ?? null}
                  rounded={radius.full}
                  iconSize={14}
                  style={styles.chipPhoto}
                />
                <Text variant="body-lg" weight="semibold">
                  {who}
                </Text>
                <ChevronDownIcon size={16} color={semantic.mutedForeground} />
              </Pressable>
            )}
            <View style={styles.tiles}>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  onPress={() => {
                    setItem(option.value);
                    setIntake(null);
                    setWeight("");
                    setStep("value");
                  }}
                  style={({ pressed }) => [
                    styles.tile,
                    { width: tileWidth },
                    pressed && styles.tilePressed,
                  ]}
                >
                  <CareItemIcon code={option.value} size={56} />
                  <Text
                    variant="body-lg"
                    weight="semibold"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={styles.tileLabel}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </StepView>
        ) : null}

        {current === "value" ? (
          <StepView key={`value-${item}`}>
            {kind === "weight" ? (
              <WeightDisplay
                value={weight}
                hint={
                  lastWeightRecord?.weightG
                    ? `지난번 ${lastWeightRecord.weightG.toFixed(1)}g · ${formatRelativeDay(ymdOf(lastWeightRecord.occurredAt))}`
                    : null
                }
              />
            ) : null}
            {kind === "intake" ? (
              <View style={{ paddingBottom: 16 }}>
                <IntakeChoice
                  options={intakeOptionsFor(feedResultSet)}
                  value={intake}
                  onChange={setIntake}
                />
              </View>
            ) : null}
            {kind === "memo" ? (
              <Textarea
                accessibilityLabel="메모"
                placeholder="무슨 일이 있었는지 남겨 주세요"
                maxLength={MEMO_MAX}
                value={memo}
                onChangeText={setMemo}
              />
            ) : null}
            {kind === "memo" ? <View style={{ height: 12 }} /> : null}
            {kind === "memo" ? extra : null}
            <SheetDivider />
            <DetailRow label="언제" value={whenLabel} onPress={() => setCalendarOpen(true)} />
            {foodName ? <DetailRow label="먹이" value={foodName} /> : null}
            {kind !== "memo" ? extra : null}
            {kind === "weight" ? (
              <Keypad onKey={(key) => setWeight(pressKey(weight, key))} />
            ) : null}
          </StepView>
        ) : null}

        {/* iOS 는 이미 모달을 띄운 화면에서 형제 Modal 을 또 띄우지 못한다(아무 반응 없음).
            달력 시트는 이 시트의 Modal 안에 그려 그 위로 뜨게 한다 */}
        <DatePickerSheet
          open={calendarOpen}
          onOpenChange={setCalendarOpen}
          title="언제 있었던 일인가요?"
          value={when.kind === "date" ? when.ymd : todayYmd()}
          max={todayYmd()}
          hint="오늘 뒤 날짜는 고를 수 없어요"
          onConfirm={(ymd) => setWhen(ymd === todayYmd() ? { kind: "now" } : { kind: "date", ymd })}
        />
      </Sheet>
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
  allRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 14 },
  petRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
  },
  petPhoto: { width: 44, height: 44 },
  petChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 16,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: semantic.secondary,
  },
  chipPhoto: { width: 24, height: 24 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 14 },
  tile: {
    height: 80,
    alignItems: "center",
    overflow: "hidden",
    borderRadius: radius.xl,
    backgroundColor: semantic.secondary,
  },
  tilePressed: { backgroundColor: semantic.border },
  tileLabel: { marginTop: -9, maxWidth: "100%", paddingHorizontal: 4 },
  extra: { gap: 12, paddingTop: 6, paddingBottom: 18 },
});
