"use client";

import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon } from "@/shared/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { recordQueries } from "@/entities/record";
import { useDefaultFoodNameResolver, useFeedResultSetResolver } from "@/entities/species";
import { SuggestionCard, TaskCard, TaskGroup, todayQueries } from "@/entities/task";
import { AddRecordSheet, EditRecordSheet } from "@/features/record-editor";
import { useTaskActions } from "@/features/task-actions";
import { isWeightItem, WEIGHT_CODE } from "@pabom/core/domain/care";
import type { Pet } from "@pabom/core/domain/pet";
import { isKnownStage, type FeedResultSet, type SpeciesId } from "@pabom/core/domain/species";
import type { CareRecord } from "@pabom/core/domain/record";
import {
  formatDayLabel,
  formatRelativeDay,
  fromYmd,
  toYmd,
  todayYmd,
  ymdOf,
} from "@pabom/core/lib/date";
import { cn } from "@/shared/lib/utils";
import { LoadError, Skeleton } from "@/shared/ui/display";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { PastRecordRow } from "./past-record-row";
import { PetFilterRow, WeekStrip } from "./week-strip";

const weekStartOf = (ymd: string) => toYmd(startOfWeek(fromYmd(ymd), { weekStartsOn: 0 }));

/** (개체, 항목) → 급여 먹이 묶음. 먹은 정도 이름을 묶음에 맞춰 보여 주려고 */
type FeedResultSetFor = (petId: string, careItem: string) => FeedResultSet | null;
type FoodNameFor = (petId: string, careItem: string) => string | null;

/** SCR-H01 오늘 할 일(홈). 지난 날은 기록, 앞 날은 예정된 할 일 (IA 5번 C안) */
export function HomeScreen() {
  const router = useRouter();
  const today = todayYmd();
  const [selected, setSelected] = useState(today);
  const [weekStart, setWeekStart] = useState(weekStartOf(today));
  const [petId, setPetId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState<{ petId?: string; item?: string } | null>(null);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);

  const pets = useQuery(petQueries.list());
  const resolveFeedResultSet = useFeedResultSetResolver();
  const speciesOfPet = new Map<string, SpeciesId>(
    (pets.data ?? []).map((p) => [p.id, p.speciesId]),
  );
  const feedResultSetFor: FeedResultSetFor = (petId, careItem) =>
    resolveFeedResultSet(speciesOfPet.get(petId), careItem);
  const resolveFoodName = useDefaultFoodNameResolver();
  const foodNameFor: FoodNameFor = (petId, careItem) =>
    resolveFoodName(speciesOfPet.get(petId), careItem);
  const weekEnd = toYmd(addDays(fromYmd(weekStart), 6));
  const weekRecords = useQuery(recordQueries.list({ from: weekStart, to: weekEnd, limit: 200 }));
  const marked = new Set((weekRecords.data?.items ?? []).map((r) => ymdOf(r.occurredAt)));
  // 단계를 모르는(잘 모르겠어요) 개체 중 오늘 체중을 아직 안 잰 개체 → '체중 재기' 제안 카드 (v1.2 H01)
  const weighedToday = new Set(
    (weekRecords.data?.items ?? [])
      .filter((r) => isWeightItem(r.careItem) && ymdOf(r.occurredAt) === today)
      .map((r) => r.petId),
  );
  const stageUnknownPets = (pets.data ?? []).filter(
    (p) =>
      !isKnownStage(p.lifeStageCode) &&
      !weighedToday.has(p.id) &&
      (petId === null || p.id === petId),
  );

  const actions = useTaskActions({
    onEditRecord: setEditRecordId,
    onEditRoutine: (task) => router.push(`/pets/${task.petId}/routines?edit=${task.routineId}`),
  });

  const select = (ymd: string) => {
    setSelected(ymd);
    setWeekStart(weekStartOf(ymd));
  };
  const moveWeek = (days: number) => select(toYmd(addDays(fromYmd(selected), days)));

  const mode = selected === today ? "today" : selected < today ? "past" : "future";
  const noPets = pets.data?.length === 0;

  const relative = formatRelativeDay(selected);

  return (
    <Screen>
      <header className="flex shrink-0 items-center justify-between gap-2 px-5 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p
            className={cn(
              "text-body-lg font-semibold",
              mode === "today" ? "text-primary" : "text-muted-foreground",
            )}
          >
            {relative}
          </p>
          <h1 className="truncate text-title-sm text-foreground">
            {format(fromYmd(selected), "M월 d일 EEEE", { locale: ko })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {mode !== "today" ? (
            <button
              type="button"
              aria-label="오늘로 돌아가기"
              onClick={() => select(today)}
              className={cn(headerButton, "h-8 px-3.5 text-body-md font-medium text-primary")}
            >
              오늘로
            </button>
          ) : null}
          {!noPets ? (
            <button
              type="button"
              aria-label="기록 추가"
              onClick={() => setAddOpen({ petId: petId ?? undefined })}
              className={cn(headerButton, "size-10 justify-center text-primary")}
            >
              <PlusIcon className="size-5" />
            </button>
          ) : null}
        </div>
      </header>

      <ScreenBody flush gap={12} className="px-4">
        <WeekStrip
          weekStart={weekStart}
          selected={selected}
          today={today}
          marked={marked}
          onSelect={select}
          onSwipe={(direction) => moveWeek(direction * 7)}
        />
        <PetFilterRow
          pets={pets.data ?? []}
          selected={petId}
          onSelect={setPetId}
          loading={pets.isPending}
        />

        {pets.isPending ? (
          <TaskSkeleton />
        ) : noPets ? (
          <Link
            href="/pets/new"
            className={cn(stateCard, "transition-colors hover:bg-gray-50 active:bg-muted")}
          >
            <span className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-dashed border-input text-muted-foreground">
              <PlusIcon className="size-5" />
            </span>
            <span className="mt-3 text-body-xl font-semibold text-foreground">
              개체를 등록해 보세요
            </span>
            <span className="mt-1 text-body-lg text-muted-foreground">
              등록하면 오늘 할 일이 여기에 생겨요
            </span>
          </Link>
        ) : mode === "past" ? (
          <PastDay
            date={selected}
            petId={petId}
            feedResultSetFor={feedResultSetFor}
            onEdit={setEditRecordId}
            onAdd={() => setAddOpen({ petId: petId ?? undefined })}
          />
        ) : (
          <TaskList
            date={selected}
            petId={petId}
            mode={mode}
            actions={actions}
            feedResultSetFor={feedResultSetFor}
            foodNameFor={foodNameFor}
            suggestions={mode === "today" ? stageUnknownPets : []}
            onWeigh={(pet) => setAddOpen({ petId: pet.id, item: WEIGHT_CODE })}
          />
        )}
      </ScreenBody>

      {actions.sheets}
      <AddRecordSheet
        open={Boolean(addOpen)}
        onOpenChange={(open) => !open && setAddOpen(null)}
        defaultPetId={addOpen?.petId}
        defaultItem={addOpen?.item}
        defaultDate={mode === "future" ? today : selected}
      />
      <EditRecordSheet
        recordId={editRecordId}
        onOpenChange={(open) => !open && setEditRecordId(null)}
      />
    </Screen>
  );
}

/** 머리 오른쪽 흰 동그라미·알약 버튼 (오늘로 · 기록 추가) */
const headerButton =
  "flex shrink-0 items-center rounded-full bg-card transition-colors outline-none hover:bg-gray-200 focus-visible:ring-3 focus-visible:ring-ring/40 active:bg-gray-200";

/** 빈 상태·다 마침 카드 (흰 카드, 가운데 정렬) */
const stateCard = "flex flex-col items-center rounded-2xl bg-card px-4 py-6 text-center";

function TaskSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="불러오는 중">
      <Skeleton height={18} width={120} />
      <Skeleton height={190} className="rounded-2xl" />
    </div>
  );
}

function TaskList({
  date,
  petId,
  mode,
  actions,
  feedResultSetFor,
  foodNameFor,
  suggestions,
  onWeigh,
}: {
  date: string;
  petId: string | null;
  mode: "today" | "future";
  actions: ReturnType<typeof useTaskActions>;
  feedResultSetFor: FeedResultSetFor;
  foodNameFor: FoodNameFor;
  /** 단계를 모르는 개체: '체중 재기' 제안 카드 */
  suggestions: Pet[];
  onWeigh: (pet: Pet) => void;
}) {
  const [showFinished, setShowFinished] = useState(false);
  const { data, isPending, isError, refetch } = useQuery(
    todayQueries.byDate(date, petId ?? undefined),
  );

  if (isPending) return <TaskSkeleton />;
  if (isError) return <LoadError onRetry={() => refetch()} />;

  if (mode === "future") {
    return (
      <section className="flex flex-col gap-3">
        <Summary>{`예정된 할 일 ${data.items.length}개`}</Summary>
        {data.items.length ? (
          <>
            <TaskGroup>
              {data.items.map((task, i) => (
                <TaskCard
                  key={task.routineId}
                  task={task}
                  divider={i > 0}
                  feedResultSet={feedResultSetFor(task.petId, task.careItem)}
                  foodName={foodNameFor(task.petId, task.careItem)}
                  onOpen={() => actions.openMenu(task)}
                />
              ))}
            </TaskGroup>
            <p className="text-center text-body-md font-medium text-muted-foreground">
              체크는 그날이 되면 할 수 있어요
            </p>
          </>
        ) : null}
      </section>
    );
  }

  const todo = data.items.filter((t) => t.state === "todo");
  const finished = data.items.filter((t) => t.state === "done" || t.state === "skipped");
  const doneCount = finished.filter((t) => t.state === "done").length;
  const skipCount = finished.length - doneCount;

  const remaining = todo.length + suggestions.length;

  return (
    <section className="flex flex-col gap-3">
      {remaining > 0 ? (
        <>
          <Summary>{`할 일 ${remaining}개 남음`}</Summary>
          <TaskGroup>
            {suggestions.map((pet, i) => (
              <SuggestionCard
                key={`weigh-${pet.id}`}
                divider={i > 0}
                petName={pet.name}
                careItem={WEIGHT_CODE}
                title="체중 재기"
                subline="단계 미정 · 체중을 재면 생애 단계를 제안해 드려요"
                onCheck={() => onWeigh(pet)}
              />
            ))}
            {todo.map((task, i) => (
              <TaskCard
                key={task.routineId}
                task={task}
                divider={suggestions.length + i > 0}
                feedResultSet={feedResultSetFor(task.petId, task.careItem)}
                foodName={foodNameFor(task.petId, task.careItem)}
                checking={actions.checkingId === task.routineId}
                onCheck={() => actions.check(task)}
                onOpen={() => actions.openMenu(task)}
              />
            ))}
          </TaskGroup>
        </>
      ) : null}
      {remaining === 0 && finished.length > 0 ? (
        <div className={stateCard}>
          <CheckIcon className="size-5 text-foreground" aria-hidden />
          <p className="mt-3 text-body-lg font-semibold text-foreground">
            오늘 할 일을 모두 마쳤어요
          </p>
          <p className="mt-1 text-body-md font-medium text-muted-foreground">
            완료 {doneCount}
            {skipCount ? ` · 건너뜀 ${skipCount}` : ""}
          </p>
        </div>
      ) : null}
      {finished.length ? (
        <>
          <button
            type="button"
            aria-expanded={showFinished}
            onClick={() => setShowFinished((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-body-lg text-foreground transition-colors outline-none hover:bg-gray-50 focus-visible:ring-3 focus-visible:ring-ring/40 active:bg-muted"
          >
            완료·건너뜀 {finished.length}개 {showFinished ? "접기" : "보기"}
            {showFinished ? (
              <ChevronUpIcon className="size-4 text-subtle-foreground" />
            ) : (
              <ChevronDownIcon className="size-4 text-subtle-foreground" />
            )}
          </button>
          {showFinished ? (
            <TaskGroup>
              {finished.map((task, i) => (
                <TaskCard
                  key={task.routineId}
                  task={task}
                  divider={i > 0}
                  feedResultSet={feedResultSetFor(task.petId, task.careItem)}
                  foodName={foodNameFor(task.petId, task.careItem)}
                  onOpen={() => actions.openMenu(task)}
                />
              ))}
            </TaskGroup>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

/** 요약 한 줄 (Figma ④): 할 일 4개 남음 · 예정된 할 일 3개 · 이날 기록 4개 */
function Summary({ children }: { children: string }) {
  return <h2 className="text-body-lg font-semibold text-muted-foreground">{children}</h2>;
}

/** 지난 날짜: 그날 남긴 기록. 기록 없는 날에 '안 함'으로 표시하지 않는다 */
function PastDay({
  date,
  petId,
  feedResultSetFor,
  onEdit,
  onAdd,
}: {
  date: string;
  petId: string | null;
  feedResultSetFor: FeedResultSetFor;
  onEdit: (recordId: string) => void;
  onAdd: () => void;
}) {
  const [viewing, setViewing] = useState<CareRecord | null>(null);
  const { data, isPending, isError, refetch } = useQuery(
    recordQueries.list({ from: date, to: date, petId: petId ?? undefined, limit: 100 }),
  );

  if (isPending) return <TaskSkeleton />;
  if (isError) return <LoadError onRetry={() => refetch()} />;

  return (
    <section className="flex flex-col gap-3">
      <Summary>{`이날 기록 ${data.items.length}개`}</Summary>
      {data.items.length ? (
        <TaskGroup>
          {data.items.map((record, i) => (
            <PastRecordRow
              key={record.id}
              record={record}
              divider={i > 0}
              feedResultSet={feedResultSetFor(record.petId, record.careItem)}
              onClick={() => onEdit(record.id)}
              onPhotoClick={() => setViewing(record)}
            />
          ))}
        </TaskGroup>
      ) : null}
      {date >= toYmd(subDays(new Date(), 365)) ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-11 items-center gap-0.5 self-start text-body-lg font-semibold text-primary transition-opacity outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:opacity-70"
        >
          <PlusIcon className="size-4" />
          이날 기록 추가
        </button>
      ) : null}
      <PhotoViewer
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewing(null)}
        photos={viewing?.photos ?? []}
        caption={
          viewing ? (
            <>
              <p className="font-bold">
                {viewing.petName} · {viewing.careItemName} ·{" "}
                {formatDayLabel(ymdOf(viewing.occurredAt))}
              </p>
              {viewing.memo ? <p>{viewing.memo}</p> : null}
            </>
          ) : null
        }
      />
    </section>
  );
}
