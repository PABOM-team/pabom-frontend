"use client";

import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  PlusIcon,
} from "@/shared/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { recordQueries, RecordRow } from "@/entities/record";
import { SuggestionCard, TaskCard, todayQueries } from "@/entities/task";
import { AddRecordSheet, EditRecordSheet } from "@/features/record-editor";
import { useTaskActions } from "@/features/task-actions";
import { CARE_ITEM_LABEL, type CareItem } from "@/shared/domain/care";
import type { Pet } from "@/shared/domain/pet";
import { isKnownStage } from "@/shared/domain/species";
import type { CareRecord } from "@/shared/domain/record";
import { formatDayLabel, fromYmd, toYmd, todayYmd, ymdOf } from "@/shared/lib/date";
import { LoadError, Skeleton } from "@/shared/ui/display";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { ScreenBody } from "@/shared/ui/screen";
import { PetFilterRow, WeekStrip } from "./week-strip";

const weekStartOf = (ymd: string) => toYmd(startOfWeek(fromYmd(ymd), { weekStartsOn: 0 }));

/** SCR-H01 오늘 할 일(홈). 지난 날은 기록, 앞 날은 예정된 할 일 (IA 5번 C안) */
export function HomeScreen() {
  const router = useRouter();
  const today = todayYmd();
  const [selected, setSelected] = useState(today);
  const [weekStart, setWeekStart] = useState(weekStartOf(today));
  const [petId, setPetId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState<{ petId?: string; item?: CareItem } | null>(null);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);

  const pets = useQuery(petQueries.list("active"));
  const weekEnd = toYmd(addDays(fromYmd(weekStart), 6));
  const weekRecords = useQuery(recordQueries.list({ from: weekStart, to: weekEnd, limit: 200 }));
  const marked = new Set((weekRecords.data?.items ?? []).map((r) => ymdOf(r.occurredAt)));
  // 단계를 모르는(잘 모르겠어요) 개체 중 오늘 체중을 아직 안 잰 개체 → '체중 재기' 제안 카드 (v1.2 H01)
  const weighedToday = new Set(
    (weekRecords.data?.items ?? [])
      .filter((r) => r.careItem === "weight" && ymdOf(r.occurredAt) === today)
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

  return (
    <>
      <header className="flex h-[52px] shrink-0 items-center gap-1 px-4">
        <h1 className="text-title-xs font-bold">{format(fromYmd(selected), "yyyy년 M월")}</h1>
        <button
          type="button"
          aria-label="이전 주"
          onClick={() => moveWeek(-7)}
          className="p-1 text-muted-foreground"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label="다음 주"
          onClick={() => moveWeek(7)}
          className="-ml-1 p-1 text-muted-foreground"
        >
          <ChevronRightIcon className="size-4" />
        </button>
        <div className="flex flex-1 justify-center">
          {mode !== "today" ? (
            <button
              type="button"
              onClick={() => select(today)}
              className="h-6 rounded-full border border-primary px-2.5 text-body-md font-medium text-primary"
            >
              오늘
            </button>
          ) : null}
        </div>
        {!noPets ? (
          <button
            type="button"
            onClick={() => setAddOpen({ petId: petId ?? undefined })}
            className="flex h-11 items-center gap-0.5 text-body-lg font-medium text-primary"
          >
            <PlusIcon className="size-4" />
            기록
          </button>
        ) : null}
      </header>

      <ScreenBody className="space-y-3">
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
            className="flex flex-col items-center rounded-xl border-[1.3px] border-dashed border-input px-4 py-6 text-center"
          >
            <span className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-dashed border-input text-muted-foreground">
              <PlusIcon className="size-5" />
            </span>
            <span className="mt-3 text-body-xl font-bold">개체를 등록해 보세요</span>
            <span className="mt-1.5 text-body-lg text-muted-foreground">
              등록하면 오늘 할 일이 여기에 생겨요
            </span>
          </Link>
        ) : mode === "past" ? (
          <PastDay
            date={selected}
            petId={petId}
            onEdit={setEditRecordId}
            onAdd={() => setAddOpen({ petId: petId ?? undefined })}
          />
        ) : (
          <TaskList
            date={selected}
            petId={petId}
            mode={mode}
            actions={actions}
            suggestions={mode === "today" ? stageUnknownPets : []}
            onWeigh={(pet) => setAddOpen({ petId: pet.id, item: "weight" })}
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
    </>
  );
}

function TaskSkeleton() {
  return (
    <div className="space-y-3" aria-label="불러오는 중">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-[66px]" />
      <Skeleton className="h-[66px]" />
      <Skeleton className="h-[66px]" />
    </div>
  );
}

function TaskList({
  date,
  petId,
  mode,
  actions,
  suggestions,
  onWeigh,
}: {
  date: string;
  petId: string | null;
  mode: "today" | "future";
  actions: ReturnType<typeof useTaskActions>;
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
      <section className="space-y-3">
        <h2 className="text-body-xl font-bold">
          {formatDayLabel(date)} · 예정된 할 일 {data.items.length}
        </h2>
        {data.items.map((task) => (
          <TaskCard
            key={task.routineId}
            task={task}
            onOpen={() => actions.openBasis(task)}
            menu={actions.menuFor(task)}
          />
        ))}
        {data.items.length ? (
          <p className="pt-1 text-center text-body-md text-muted-foreground">
            예정일이 되면 체크할 수 있어요
          </p>
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
    <section className="space-y-3">
      {remaining > 0 ? (
        <h2 className="text-body-xl font-bold">
          오늘의 할 일 <span className="text-primary">{remaining}개 남음</span>
        </h2>
      ) : null}
      {suggestions.map((pet) => (
        <SuggestionCard
          key={`weigh-${pet.id}`}
          petName={pet.name}
          title="체중 재기"
          subline="단계 미정 · 체중을 재면 생애 단계를 제안해 드려요"
          onCheck={() => onWeigh(pet)}
        />
      ))}
      {todo.map((task) => (
        <TaskCard
          key={task.routineId}
          task={task}
          checking={actions.checkingId === task.routineId}
          onCheck={() => actions.check(task)}
          onOpen={() => actions.openBasis(task)}
          menu={actions.menuFor(task)}
        />
      ))}
      {remaining === 0 && finished.length > 0 ? (
        <div className="flex flex-col items-center rounded-xl border-[1.3px] border-input px-4 py-6 text-center">
          <CheckIcon className="size-7 text-foreground" strokeWidth={1.6} aria-hidden />
          <p className="mt-2 text-body-xl font-bold">오늘 할 일을 모두 마쳤어요</p>
          <p className="mt-1 text-body-lg text-muted-foreground">
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
            className="flex w-full items-center justify-between rounded-xl border-[1.3px] border-input px-3.5 py-3 text-body-lg text-secondary-text"
          >
            완료·건너뜀 {finished.length}개 {showFinished ? "접기" : "보기"}
            {showFinished ? (
              <ChevronUpIcon className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            )}
          </button>
          {showFinished
            ? finished.map((task) => (
                <TaskCard
                  key={task.routineId}
                  task={task}
                  onOpen={() => actions.openBasis(task)}
                  menu={actions.menuFor(task)}
                />
              ))
            : null}
        </>
      ) : null}
    </section>
  );
}

/** 지난 날짜: 그날 남긴 기록. 기록 없는 날에 '안 함'으로 표시하지 않는다 */
function PastDay({
  date,
  petId,
  onEdit,
  onAdd,
}: {
  date: string;
  petId: string | null;
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
    <section>
      <h2 className="mb-1 text-body-xl font-bold">
        {formatDayLabel(date)} · 기록 {data.items.length}
      </h2>
      {data.items.map((record) => (
        <RecordRow
          key={record.id}
          record={record}
          variant="day"
          onClick={() => onEdit(record.id)}
          onPhotoClick={() => setViewing(record)}
        />
      ))}
      {date >= toYmd(subDays(new Date(), 365)) ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 flex items-center gap-0.5 text-body-lg font-bold text-primary"
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
                {viewing.petName} · {CARE_ITEM_LABEL[viewing.careItem]} ·{" "}
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
