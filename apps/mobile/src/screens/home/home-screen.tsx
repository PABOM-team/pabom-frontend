import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import { router } from "expo-router";
import { useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { petQueries } from "@/entities/pet";
import { recordQueries } from "@/entities/record";
import { useDefaultFoodNameResolver, useFeedResultSetResolver } from "@/entities/species";
import { SuggestionCard, TaskCard, TaskGroup, todayQueries } from "@/entities/task";
import { AddRecordSheet, EditRecordSheet } from "@/features/record-editor";
import { useTabBarInset } from "@/features/tab-bar";
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
import { LoadError, Skeleton } from "@/shared/ui/display";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon } from "@/shared/ui/icons";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { colors, radius, semantic } from "@/shared/ui/theme";
import { PastRecordRow } from "./past-record-row";
import { HOME_GUTTER, PetFilterRow, WeekStrip } from "./week-strip";
import { ZoomPressable } from "@/shared/ui/zoom-link";

const weekStartOf = (ymd: string) => toYmd(startOfWeek(fromYmd(ymd), { weekStartsOn: 0 }));

/** 목록이 바뀔 때(체크해서 완료로 옮겨 감, 펼치기·접기) 줄이 미끄러지듯 움직이게 */
const animateList = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

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
  const tabBarInset = useTabBarInset();

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
  const relative = formatRelativeDay(selected);

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text
            variant="body-lg"
            weight="semibold"
            color={mode === "today" ? semantic.primary : semantic.mutedForeground}
          >
            {relative}
          </Text>
          <Text variant="title-sm" accessibilityRole="header" numberOfLines={1}>
            {format(fromYmd(selected), "M월 d일 EEEE", { locale: ko })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {mode !== "today" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="오늘로 돌아가기"
              onPress={() => select(today)}
              style={({ pressed }) => [styles.todayPill, pressed && styles.pressed]}
            >
              <Text variant="body-md" weight="medium" color={semantic.primary}>
                오늘로
              </Text>
            </Pressable>
          ) : null}
          {!noPets ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="기록 추가"
              onPress={() => setAddOpen({ petId: petId ?? undefined })}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              <PlusIcon size={20} color={semantic.primary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScreenBody gap={12} flush contentStyle={[styles.body, { paddingBottom: tabBarInset }]}>
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
          <ZoomPressable
            href="/pets/new"
            accessibilityRole="link"
            style={({ pressed }) => [styles.stateCard, pressed && styles.pressed]}
          >
            <View style={styles.emptyCircle}>
              <PlusIcon size={20} color={semantic.mutedForeground} />
            </View>
            <Text variant="body-xl" weight="semibold" align="center" style={styles.mt12}>
              개체를 등록해 보세요
            </Text>
            <Text
              variant="body-lg"
              color={semantic.mutedForeground}
              align="center"
              style={styles.mt4}
            >
              등록하면 오늘 할 일이 여기에 생겨요
            </Text>
          </ZoomPressable>
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

function TaskSkeleton() {
  return (
    <View style={styles.section} accessibilityLabel="불러오는 중">
      <Skeleton height={18} width={120} />
      <Skeleton height={190} style={styles.skeletonCard} />
    </View>
  );
}

/** 요약 한 줄 (Figma ④): 할 일 4개 남음 · 예정된 할 일 3개 · 이날 기록 4개 */
function Summary({ children }: { children: string }) {
  return (
    <Text
      variant="body-lg"
      weight="semibold"
      color={semantic.mutedForeground}
      accessibilityRole="header"
    >
      {children}
    </Text>
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
  // 체크한 할 일이 완료·건너뜀으로 옮겨 갈 때 목록이 부드럽게 줄어들게 (상태 묶음이 바뀌면 다음 그리기에 애니메이션)
  const signature = (data?.items ?? []).map((t) => `${t.routineId}:${t.state}`).join(",");
  const [lastSignature, setLastSignature] = useState(signature);
  if (signature !== lastSignature) {
    if (lastSignature) animateList();
    setLastSignature(signature);
  }

  if (isPending) return <TaskSkeleton />;
  if (isError) return <LoadError onRetry={() => refetch()} />;

  if (mode === "future") {
    return (
      <View style={styles.section}>
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
            <Text variant="body-md" weight="medium" color={semantic.mutedForeground} align="center">
              체크는 그날이 되면 할 수 있어요
            </Text>
          </>
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
        <View style={styles.stateCard}>
          <CheckIcon size={20} color={semantic.foreground} strokeWidth={2} />
          <Text variant="body-lg" weight="semibold" align="center" style={styles.mt12}>
            오늘 할 일을 모두 마쳤어요
          </Text>
          <Text
            variant="body-md"
            weight="medium"
            color={semantic.mutedForeground}
            align="center"
            style={styles.mt4}
          >
            완료 {doneCount}
            {skipCount ? ` · 건너뜀 ${skipCount}` : ""}
          </Text>
        </View>
      ) : null}
      {finished.length ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showFinished }}
            onPress={() => {
              animateList();
              setShowFinished((v) => !v);
            }}
            style={({ pressed }) => [styles.finishedToggle, pressed && styles.pressed]}
          >
            <Text variant="body-lg">
              완료·건너뜀 {finished.length}개 {showFinished ? "접기" : "보기"}
            </Text>
            {showFinished ? (
              <ChevronUpIcon size={16} color={semantic.subtleForeground} />
            ) : (
              <ChevronDownIcon size={16} color={semantic.subtleForeground} />
            )}
          </Pressable>
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
    </View>
  );
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
    <View style={styles.section}>
      <Summary>{`이날 기록 ${data.items.length}개`}</Summary>
      {data.items.length ? (
        <TaskGroup>
          {data.items.map((record, i) => (
            <PastRecordRow
              key={record.id}
              record={record}
              divider={i > 0}
              feedResultSet={feedResultSetFor(record.petId, record.careItem)}
              onPress={() => onEdit(record.id)}
              onPhotoPress={() => setViewing(record)}
            />
          ))}
        </TaskGroup>
      ) : null}
      {date >= toYmd(subDays(new Date(), 365)) ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAdd}
          style={({ pressed }) => [styles.addDayButton, pressed && styles.pressed]}
        >
          <PlusIcon size={16} color={semantic.primary} />
          <Text variant="body-lg" weight="semibold" color={semantic.primary}>
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
  screen: { backgroundColor: semantic.screen },
  header: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  headerTitle: { flex: 1, minWidth: 0, gap: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayPill: {
    height: 32,
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: semantic.card,
    paddingHorizontal: 14,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: semantic.card,
  },
  pressed: { opacity: 0.7 },
  body: { paddingHorizontal: HOME_GUTTER, paddingTop: 8 },
  section: { gap: 12 },
  skeletonCard: { borderRadius: radius["2xl"] },
  stateCard: {
    alignItems: "center",
    borderRadius: radius["2xl"],
    backgroundColor: semantic.card,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
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
  mt12: { marginTop: 12 },
  mt4: { marginTop: 4 },
  finishedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius["2xl"],
    backgroundColor: semantic.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addDayButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
  },
});
