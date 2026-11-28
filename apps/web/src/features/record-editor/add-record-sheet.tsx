"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
        className="flex-1"
        disabled={petIds.length === 0}
        onClick={() => setStep("what")}
      >
        {petIds.length ? `${petIds.length}마리 기록하기` : "기록할 개체를 골라 주세요"}
      </Button>
    ) : current === "value" ? (
      <div className="flex flex-1 flex-col gap-1.5">
        <Button
          size="xl"
          disabled={!canSave}
          loading={save.isPending}
          aria-label={save.isPending ? "저장 중" : undefined}
          onClick={() => save.mutate()}
        >
          기록하기
        </Button>
        {uploading ? (
          <p className="text-center text-body-md text-muted-foreground">
            사진을 올리는 동안은 저장할 수 없어요
          </p>
        ) : null}
      </div>
    ) : undefined;

  const extra =
    kind !== "memo" && !extraOpen ? (
      <AddExtraLink onClick={() => setExtraOpen(true)} />
    ) : (
      <div className="flex flex-col gap-3 pt-1.5 pb-4.5">
        {kind !== "memo" ? (
          <Textarea
            aria-label="메모 (선택)"
            placeholder="메모를 남겨 주세요"
            maxLength={MEMO_MAX}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        ) : null}
        <PhotoInput
          value={photos}
          onChange={setPhotos}
          max={5}
          onView={setViewer}
          onBusyChange={setUploading}
        />
      </div>
    );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title={title} footer={footer}>
        {current === "who" ? (
          <StepView key="who">
            <button
              type="button"
              role="checkbox"
              aria-checked={allChecked}
              onClick={() => setPetIds(allChecked ? [] : (pets ?? []).map((p) => p.id))}
              className="flex min-h-11 w-full items-center gap-3.5 text-left"
            >
              <span className="flex-1 text-body-xl font-semibold text-foreground">
                {allChecked ? "전체 해제" : "전체 선택"}
              </span>
              <CheckDot checked={allChecked} />
            </button>
            <SheetDivider />
            {(pets ?? []).map((pet) => {
              const checked = petIds.includes(pet.id);
              return (
                <button
                  key={pet.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={pet.name}
                  onClick={() => togglePet(pet.id)}
                  className="flex w-full items-center gap-3.5 py-2.5 text-left"
                >
                  <PetPhoto src={pet.photoUrl} iconSize={20} className="size-11 rounded-full" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-xl font-semibold text-foreground">
                      {pet.name}
                    </span>
                    <span className="truncate text-body-lg text-subtle-foreground">
                      {petSpeciesLine(pet)}
                    </span>
                  </span>
                  <CheckDot checked={checked} />
                </button>
              );
            })}
          </StepView>
        ) : null}

        {current === "what" ? (
          <StepView key="what">
            {onlyPet ? null : (
              <button
                type="button"
                aria-label={`${who}, 개체 다시 고르기`}
                onClick={() => {
                  setPetIds(selectedIds);
                  setStep("who");
                }}
                className="mb-4 flex items-center gap-1.5 rounded-full bg-secondary py-1 pr-2.5 pl-1 transition-colors hover:bg-gray-200"
              >
                <PetPhoto
                  src={firstPet?.photoUrl ?? null}
                  iconSize={14}
                  className="size-6 rounded-full"
                />
                <span className="text-body-lg font-semibold text-foreground">{who}</span>
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </button>
            )}
            <div className="grid grid-cols-4 gap-2.5 pb-3.5">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  onClick={() => {
                    setItem(option.value);
                    setIntake(null);
                    setWeight("");
                    setStep("value");
                  }}
                  className="flex h-20 min-w-0 flex-col items-center overflow-hidden rounded-xl bg-secondary transition-colors hover:bg-border active:bg-border"
                >
                  <CareItemIcon code={option.value} recordKind={option.kind} size={56} />
                  <span className="-mt-[9px] max-w-full truncate px-1 text-body-lg font-semibold text-foreground">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
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
              <div className="pb-4">
                <IntakeChoice
                  options={intakeOptionsFor(feedResultSet)}
                  value={intake}
                  onChange={setIntake}
                />
              </div>
            ) : null}
            {kind === "memo" ? (
              <>
                <Textarea
                  aria-label="메모"
                  placeholder="무슨 일이 있었는지 남겨 주세요"
                  maxLength={MEMO_MAX}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
                <div className="h-3" />
                {extra}
              </>
            ) : null}
            <SheetDivider />
            <DetailRow label="언제" value={whenLabel} onClick={() => setCalendarOpen(true)} />
            {foodName ? <DetailRow label="먹이" value={foodName} /> : null}
            {kind !== "memo" ? extra : null}
            {kind === "weight" ? (
              <Keypad onKey={(key) => setWeight((w) => pressKey(w, key))} />
            ) : null}
          </StepView>
        ) : null}
      </Sheet>
      <DatePickerSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        title="언제 있었던 일인가요?"
        value={when.kind === "date" ? when.ymd : todayYmd()}
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
