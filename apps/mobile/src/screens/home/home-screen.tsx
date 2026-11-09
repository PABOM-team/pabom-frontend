import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { petQueries } from "@/entities/pet";
import { recordQueries, RecordRow } from "@/entities/record";
import { useDefaultFoodNameResolver, useFeedResultSetResolver } from "@/entities/species";
import { SuggestionCard, TaskCard, todayQueries } from "@/entities/task";
import { AddRecordSheet, EditRecordSheet } from "@/features/record-editor";
import { useTaskActions } from "@/features/task-actions";
import { isWeightItem, WEIGHT_CODE } from "@pabom/core/domain/care";
import type { Pet } from "@pabom/core/domain/pet";
import { isKnownStage, type FeedResultSet, type SpeciesId } from "@pabom/core/domain/species";
import type { CareRecord } from "@pabom/core/domain/record";
import { formatDayLabel, fromYmd, toYmd, todayYmd, ymdOf } from "@pabom/core/lib/date";
import { Card, LoadError, Skeleton } from "@/shared/ui/display";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  PlusIcon,
} from "@/shared/ui/icons";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { colors, radius, semantic, spacing } from "@/shared/ui/theme";
import { PetFilterRow, WeekStrip } from "./week-strip";

const weekStartOf = (ymd: string) => toYmd(startOfWeek(fromYmd(ymd), { weekStartsOn: 0 }));

/** (개체, 항목) → 급여 먹이 묶음. 먹은 정도 이름을 묶음에 맞춰 보여 주려고 */
type FeedResultSetFor = (petId: string, careItem: string) => FeedResultSet | null;
type FoodNameFor = (petId: string, careItem: string) => string | null;

/** SCR-H01 오늘 할 일(홈). 지난 날은 기록, 앞 날은 예정된 할 일 (IA 5번 C안) */
export function HomeScreen() {
  const today = todayYmd();
  const [selected, setSelected] = useState(today);
  const [weekStart, setWeekStart] = useState(weekStartOf(today));
  const [petId, setPetId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState<{ petId?: string; item?: string } | null>(null);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);

  const pets = useQuery(petQueries.list("active"));
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
    onEditRoutine: (task) =>
      router.push({
        pathname: "/pets/[petId]/routines",
        params: { petId: task.petId, edit: task.routineId },
      }),
  });

  const select = (ymd: string) => {
    setSelected(ymd);
    setWeekStart(weekStartOf(ymd));
  };
  const moveWeek = (days: number) => select(toYmd(addDays(fromYmd(selected), days)));

  const mode = selected === today ? "today" : selected < today ? "past" : "future";
  const noPets = pets.data?.length === 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title-xs" accessibilityRole="header">
          {format(fromYmd(selected), "yyyy년 M월")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 주"
          onPress={() => moveWeek(-7)}
          hitSlop={8}
          style={styles.weekNav}
        >
          <ChevronLeftIcon size={16} color={semantic.mutedForeground} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 주"
          onPress={() => moveWeek(7)}
          hitSlop={8}
          style={[styles.weekNav, { marginLeft: -4 }]}
        >
          <ChevronRightIcon size={16} color={semantic.mutedForeground} />
        </Pressable>
        <View style={styles.headerCenter}>
          {mode !== "today" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => select(today)}
              style={styles.todayPill}
            >
              <Text variant="body-md" weight="medium" color={semantic.primary}>
                오늘
              </Text>
            </Pressable>
          ) : null}
        </View>
        {!noPets ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAddOpen({ petId: petId ?? undefined })}
            style={styles.addButton}
          >
            <PlusIcon size={16} color={semantic.primary} />
            <Text variant="body-lg" weight="medium" color={semantic.primary}>
              기록
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScreenBody gap={12}>
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
          <Card dashed onPress={() => router.push("/pets/new")} style={styles.emptyCard}>
            <View style={styles.emptyCircle}>
              <PlusIcon size={20} color={semantic.mutedForeground} />
            </View>
            <Text variant="body-xl" weight="bold" align="center" style={{ marginTop: 12 }}>
              개체를 등록해 보세요
            </Text>
            <Text
              variant="body-lg"
              color={semantic.mutedForeground}
              align="center"
              style={{ marginTop: 6 }}
            >
              등록하면 오늘 할 일이 여기에 생겨요
            </Text>
          </Card>
        ) : mode === "past" ? (
          <PastDay
            date={selected}
            petId={petId}
            feedResultSetFor={feedResultSetFor}
            foodNameFor={foodNameFor}
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

function TaskSkeleton() {
  return (
    <View style={styles.section} accessibilityLabel="불러오는 중">
      <Skeleton height={20} width={160} />
      <Skeleton height={66} />
      <Skeleton height={66} />
      <Skeleton height={66} />
    </View>
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
      <View style={styles.section}>
        <Text variant="body-xl" weight="bold" accessibilityRole="header">
          {formatDayLabel(date)} · 예정된 할 일 {data.items.length}
        </Text>
        {data.items.map((task) => (
          <TaskCard
            key={task.routineId}
            task={task}
            feedResultSet={feedResultSetFor(task.petId, task.careItem)}
            foodName={foodNameFor(task.petId, task.careItem)}
            onOpen={() => actions.openBasis(task)}
            menu={actions.menuFor(task)}
          />
        ))}
        {data.items.length ? (
          <Text
            variant="body-md"
            color={semantic.mutedForeground}
            align="center"
            style={{ paddingTop: 4 }}
          >
            예정일이 되면 체크할 수 있어요
          </Text>
        ) : null}
      </View>
    );
  }

  const todo = data.items.filter((t) => t.state === "todo");
  const finished = data.items.filter((t) => t.state === "done" || t.state === "skipped");
  const doneCount = finished.filter((t) => t.state === "done").length;
  const skipCount = finished.length - doneCount;

  const remaining = todo.length + suggestions.length;

  return (
    <View style={styles.section}>
      {remaining > 0 ? (
        <Text variant="body-xl" weight="bold" accessibilityRole="header">
          오늘의 할 일{" "}
          <Text variant="body-xl" weight="bold" color={semantic.primary}>
            {remaining}개 남음
          </Text>
        </Text>
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
          feedResultSet={feedResultSetFor(task.petId, task.careItem)}
          foodName={foodNameFor(task.petId, task.careItem)}
          checking={actions.checkingId === task.routineId}
          onCheck={() => actions.check(task)}
          onOpen={() => actions.openBasis(task)}
          menu={actions.menuFor(task)}
        />
      ))}
      {remaining === 0 && finished.length > 0 ? (
        <Card style={styles.doneCard}>
          <CheckIcon size={28} color={semantic.foreground} strokeWidth={1.6} />
          <Text variant="body-xl" weight="bold" align="center" style={{ marginTop: 8 }}>
            오늘 할 일을 모두 마쳤어요
          </Text>
          <Text
            variant="body-lg"
            color={semantic.mutedForeground}
            align="center"
            style={{ marginTop: 4 }}
          >
            완료 {doneCount}
            {skipCount ? ` · 건너뜀 ${skipCount}` : ""}
          </Text>
        </Card>
      ) : null}
      {finished.length ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showFinished }}
            onPress={() => setShowFinished((v) => !v)}
            style={styles.finishedToggle}
          >
            <Text variant="body-lg" color={semantic.secondaryText}>
              완료·건너뜀 {finished.length}개 {showFinished ? "접기" : "보기"}
            </Text>
            {showFinished ? (
              <ChevronUpIcon size={16} color={semantic.mutedForeground} />
            ) : (
              <ChevronDownIcon size={16} color={semantic.mutedForeground} />
            )}
          </Pressable>
          {showFinished
            ? finished.map((task) => (
                <TaskCard
                  key={task.routineId}
                  task={task}
                  feedResultSet={feedResultSetFor(task.petId, task.careItem)}
                  foodName={foodNameFor(task.petId, task.careItem)}
                  onOpen={() => actions.openBasis(task)}
                  menu={actions.menuFor(task)}
                />
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}

/** 지난 날짜: 그날 남긴 기록. 기록 없는 날에 '안 함'으로 표시하지 않는다 */
function PastDay({
  date,
  petId,
  feedResultSetFor,
  foodNameFor: _foodNameFor,
  onEdit,
  onAdd,
}: {
  date: string;
  petId: string | null;
  feedResultSetFor: FeedResultSetFor;
  foodNameFor: FoodNameFor;
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
    <View>
      <Text variant="body-xl" weight="bold" accessibilityRole="header" style={{ marginBottom: 4 }}>
        {formatDayLabel(date)} · 기록 {data.items.length}
      </Text>
      {data.items.map((record) => (
        <RecordRow
          key={record.id}
          record={record}
          variant="day"
          feedResultSet={feedResultSetFor(record.petId, record.careItem)}
          onPress={() => onEdit(record.id)}
          onPhotoPress={() => setViewing(record)}
        />
      ))}
      {date >= toYmd(subDays(new Date(), 365)) ? (
        <Pressable accessibilityRole="button" onPress={onAdd} style={styles.addDayButton}>
          <PlusIcon size={16} color={semantic.primary} />
          <Text variant="body-lg" weight="bold" color={semantic.primary}>
            이날 기록 추가
          </Text>
        </Pressable>
      ) : null}
      <PhotoViewer
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewing(null)}
        photos={viewing?.photos ?? []}
        caption={
          viewing ? (
            <>
              <Text variant="body-lg" weight="bold" color={colors.white}>
                {viewing.petName} · {viewing.careItemName} ·{" "}
                {formatDayLabel(ymdOf(viewing.occurredAt))}
              </Text>
              {viewing.memo ? (
                <Text variant="body-lg" color={colors.white}>
                  {viewing.memo}
                </Text>
              ) : null}
            </>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.gutter,
  },
  weekNav: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: "row", justifyContent: "center" },
  todayPill: {
    height: 24,
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: semantic.primary,
    paddingHorizontal: 10,
  },
  addButton: { height: 44, flexDirection: "row", alignItems: "center", gap: 2 },
  section: { gap: 12 },
  emptyCard: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 24 },
  emptyCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: semantic.input,
  },
  doneCard: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 24 },
  finishedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.xl,
    borderWidth: 1.3,
    borderColor: semantic.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addDayButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    marginTop: 12,
  },
});
