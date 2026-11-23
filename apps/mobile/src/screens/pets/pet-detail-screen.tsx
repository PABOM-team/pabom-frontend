import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { PetName, PetPhoto, petQueries, petSpeciesLine } from "@/entities/pet";
import { CareItemIcon, RecordGroup, RecordRow } from "@/entities/record";
import { routinesShortLine } from "@/entities/routine";
import {
  feedResultSetOf,
  speciesQueries,
  stageName,
  useDefaultFoodNameResolver,
  useSpeciesMap,
} from "@/entities/species";
import { taskSubline, taskTitle, todayQueries } from "@/entities/task";
import { ActionSheet, DeletePetDialog, type ActionSheetItem } from "@/features/pet-lifecycle";
import { EditRecordSheet } from "@/features/record-editor";
import { useTaskActions } from "@/features/task-actions";
import { petsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage, getHttpStatus } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import { isWeightItem } from "@pabom/core/domain/care";
import { lifeStageIdOf, SPECIES_LABEL } from "@pabom/core/domain/pet";
import { isKnownStage, lifeStageFromWeight } from "@pabom/core/domain/species";
import type { Task } from "@pabom/core/domain/today";
import { differenceInCalendarDays, todayYmd } from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { InfoBox, LoadError, Skeleton, StateMessage } from "@/shared/ui/display";
import { CheckIcon, ChevronRightIcon, DotsHorizontalIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { IconButton, TopBar } from "@/shared/ui/top-bar";
import { PetNotFound } from "./pet-not-found";
import { ZoomLink, ZoomPressable, ZoomTarget } from "@/shared/ui/zoom-link";

/** Figma 본문 좌우 여백 */
const GUTTER = 16;

/** SCR-P04 개체 상세: 큰 사진 · 요약 · 오늘 할 일 · 체크 리스트 · 가이드라인 · 최근 기록 */
export function PetDetailScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const species = useSpeciesMap();
  const { data, isPending, isError, error, refetch } = useQuery(petQueries.detail(petId));
  const { data: careStandards } = useQuery({
    ...speciesQueries.careStandards(data?.pet.speciesId ?? "crested_gecko"),
    enabled: Boolean(data),
  });
  const [today] = useState(() => todayYmd());
  const todayList = useQuery({ ...todayQueries.byDate(today, petId), enabled: Boolean(data) });
  const resolveFoodName = useDefaultFoodNameResolver();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const actions = useTaskActions({
    onEditRecord: setEditRecordId,
    onEditRoutine: (task) =>
      router.push({
        pathname: "/pets/[petId]/routines",
        params: { petId: task.petId, edit: task.routineId },
      }),
  });
  // 단계를 모르는 개체는 최근 체중 기록으로 단계를 제안하고, 버튼 한 번으로 정한다 (Figma 댓글: 체중으로 단계 제안)
  const confirmStage = useMutation({
    mutationFn: (code: string) =>
      petsApi.update(petId, { lifeStageId: lifeStageIdOf(code), stageCertainty: "CONFIRMED" }),
    onSuccess: () => toast("생애 단계를 정했어요"),
    onError: (error) => toast(getErrorMessage(error, "단계를 정하지 못했어요.")),
    onSettled: () => invalidateCareData(queryClient),
  });

  if (isPending) {
    return (
      <Screen style={styles.screen}>
        <TopBar fallbackHref="/pets" />
        <ScreenBody gap={12} contentStyle={styles.content}>
          <Skeleton height={220} />
          <Skeleton height={77} />
          <Skeleton height={134} />
        </ScreenBody>
      </Screen>
    );
  }

  // 없는 개체(남의 개체 포함)는 E01, 그 밖의 실패는 C1-2
  if (isError && getHttpStatus(error) === 404) return <PetNotFound />;
  if (isError) {
    return (
      <Screen style={styles.screen}>
        <TopBar fallbackHref="/pets" />
        <LoadError style={{ flex: 1, justifyContent: "center" }} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const { pet, routines, recentRecords } = data;
  const spec = species.get(pet.speciesId);
  const stageUnknown = !isKnownStage(pet.lifeStageCode);
  const stage = stageName(spec, pet.lifeStageCode);
  const lastWeight = recentRecords?.find((r) => isWeightItem(r.careItem) && r.weightG)?.weightG;
  const suggested = stageUnknown && spec ? lifeStageFromWeight(spec, lastWeight) : null;
  const since = pet.acquiredOn ?? pet.createdAt.slice(0, 10);
  const togetherDays = differenceInCalendarDays(new Date(), parseISO(since)) + 1;
  const todos = (todayList.data?.items ?? []).filter(
    (t) => t.petId === pet.id && t.state === "todo",
  );

  const menuItems: ActionSheetItem[] = [
    {
      label: "정보 수정",
      description: "이름 · 성별 · 부화일 · 사진",
      onSelect: () => router.push({ pathname: "/pets/[petId]/edit", params: { petId: pet.id } }),
    },
    {
      label: "개체 삭제",
      description: "모든 기록이 사라지고 되돌릴 수 없어요",
      tone: "danger",
      onSelect: () => setDeleteOpen(true),
    },
  ];

  return (
    <Screen style={styles.screen}>
      <TopBar
        title={pet.name}
        fallbackHref="/pets"
        trailing={
          <IconButton accessibilityLabel={`${pet.name} 메뉴`} onPress={() => setMenuOpen(true)}>
            <DotsHorizontalIcon />
          </IconButton>
        }
      />
      <ScreenBody gap={12} contentStyle={styles.content}>
        <View style={styles.head}>
          {/* 목록의 사진 카드와 맞춰지는 자리. 밀어서 돌아갈 때 이 사진이 카드 사진으로 작아진다 */}
          <ZoomTarget>
            <PetPhoto src={pet.photoUrl} style={styles.hero} />
          </ZoomTarget>
          <View style={{ height: 8 }} />
          <PetName pet={pet} variant="title-md" />
          <Text variant="body-lg" color={semantic.mutedForeground}>
            {[petSpeciesLine(pet), `함께한 지 ${togetherDays}일`].join(" · ")}
          </Text>
        </View>

        <View style={styles.summary}>
          <SummaryCell
            label="생애 단계"
            value={stageUnknown ? "확인 전" : stage}
            muted={stageUnknown}
          />
          <SummaryCell
            label="부화일"
            value={pet.hatchedOn ? format(parseISO(pet.hatchedOn), "M월 d일") : "모름"}
            muted={!pet.hatchedOn}
          />
          <SummaryCell
            label="체중"
            value={lastWeight ? `${lastWeight.toFixed(1)} g` : "아직 없음"}
            muted={!lastWeight}
          />
        </View>
        {stageUnknown && !suggested ? (
          <Text variant="body-md" color={semantic.mutedForeground}>
            체중을 처음 기록하면 생애 단계를 제안해 드려요
          </Text>
        ) : null}
        {suggested ? (
          <InfoBox tone="primary" style={styles.suggestBox}>
            <Text variant="body-md" color={semantic.secondaryText} style={{ flex: 1 }}>
              체중 {lastWeight}g으로 보면{" "}
              <Text variant="body-md" weight="bold">
                {suggested.name}
              </Text>
              예요.
            </Text>
            <Button
              size="sm"
              disabled={confirmStage.isPending}
              onPress={() => confirmStage.mutate(suggested.code)}
            >
              {`${suggested.name}로 정하기`}
            </Button>
          </InfoBox>
        ) : null}

        {todos.length ? (
          <>
            <SectionTitle>{`오늘 할 일 ${todos.length}`}</SectionTitle>
            <RecordGroup>
              {todos.map((task, index) => (
                <TaskRow
                  key={task.routineId}
                  task={task}
                  first={index === 0}
                  title={taskTitle(task, resolveFoodName(pet.speciesId, task.careItem))}
                  subline={taskSubline(task, feedResultSetOf(careStandards, task.careItem))}
                  checking={actions.checkingId === task.routineId}
                  onCheck={() => actions.check(task)}
                  onOpen={() => actions.openBasis(task)}
                />
              ))}
            </RecordGroup>
          </>
        ) : null}

        <RecordGroup>
          <LinkRow
            title="체크 리스트"
            subline={routinesShortLine(routines) || "아직 없어요"}
            href={{ pathname: "/pets/[petId]/routines", params: { petId: pet.id } }}
          />
          <LinkRow
            first={false}
            title={`${SPECIES_LABEL[pet.speciesId]} 가이드라인`}
            subline={`${stageUnknown ? "어린 개체" : stage} 기준 · 주기와 근거`}
            href={{
              pathname: "/settings/guidelines/[speciesId]",
              params: { speciesId: pet.speciesId, petId: pet.id },
            }}
          />
        </RecordGroup>

        <SectionTitle>최근 기록</SectionTitle>
        {recentRecords === null ? (
          <RecordGroup>
            <StateMessage
              compact
              title="최근 기록을 불러오지 못했어요"
              action={{ label: "다시 시도", onPress: () => refetch(), variant: "outline" }}
              style={{ paddingVertical: 16 }}
            />
          </RecordGroup>
        ) : recentRecords.length === 0 ? (
          <RecordGroup style={styles.emptyRecords}>
            <Text variant="body-lg" color={semantic.mutedForeground} align="center">
              아직 기록이 없어요
            </Text>
          </RecordGroup>
        ) : (
          <RecordGroup>
            {recentRecords.map((record, index) => (
              <RecordRow
                key={record.id}
                record={record}
                variant="list"
                first={index === 0}
                date={format(parseISO(record.occurredAt), "M월 d일")}
                feedResultSet={feedResultSetOf(careStandards, record.careItem)}
                onPress={() => setEditRecordId(record.id)}
              />
            ))}
          </RecordGroup>
        )}
        {recentRecords?.length ? (
          <ZoomLink href={{ pathname: "/pets/[petId]/records", params: { petId: pet.id } }}>
            <Pressable accessibilityRole="link" hitSlop={8} style={styles.allRecords}>
              <Text variant="body-lg" weight="medium" color={semantic.primary}>
                전체 기록 보기 ›
              </Text>
            </Pressable>
          </ZoomLink>
        ) : null}
      </ScreenBody>

      {actions.sheets}
      <ActionSheet
        label={`${pet.name} 메뉴`}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        items={menuItems}
      />
      <DeletePetDialog pet={pet} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <EditRecordSheet
        recordId={editRecordId}
        speciesId={pet.speciesId}
        onOpenChange={(open) => !open && setEditRecordId(null)}
      />
    </Screen>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      variant="body-xl"
      weight="semibold"
      color={semantic.secondaryText}
      accessibilityRole="header"
      style={styles.sectionTitle}
    >
      {children}
    </Text>
  );
}

/** 요약 칸 (어린 개체 / 생애 단계). 모르는 값은 회색 */
function SummaryCell({ label, value, muted }: { label: string; value: string; muted: boolean }) {
  return (
    <View style={styles.cell}>
      <Text
        variant="body-xl"
        weight="bold"
        align="center"
        numberOfLines={1}
        color={muted ? semantic.subtleForeground : semantic.foreground}
      >
        {value}
      </Text>
      <Text variant="body-md" weight="medium" align="center" color={semantic.subtleForeground}>
        {label}
      </Text>
    </View>
  );
}

/** 흰 묶음 안 이동 줄 (체크 리스트 · 가이드라인) */
function LinkRow({
  title,
  subline,
  href,
  first = true,
}: {
  title: string;
  subline: string;
  href: Href;
  first?: boolean;
}) {
  // 이 줄에서 다음 화면이 커져 나온다 (iOS 줌 전환)
  return (
    <ZoomPressable
      href={href}
      accessibilityRole="link"
      style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
    >
      {first ? null : <View style={styles.linkDivider} />}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text variant="body-lg">{title}</Text>
        <Text variant="body-md" weight="medium" color={semantic.mutedForeground} numberOfLines={1}>
          {subline}
        </Text>
      </View>
      <ChevronRightIcon size={20} color={semantic.subtleForeground} />
    </ZoomPressable>
  );
}

/** 오늘 할 일 줄 (Figma 할 일 카드): 항목 아이콘 · 제목 + 배지 · 주기 · 오른쪽 체크 */
function TaskRow({
  task,
  title,
  subline,
  first,
  checking,
  onCheck,
  onOpen,
}: {
  task: Task;
  title: string;
  subline: string;
  first: boolean;
  checking: boolean;
  onCheck: () => void;
  onOpen: () => void;
}) {
  const badge = task.overdueDays > 0 ? `${task.overdueDays}일 지남` : "오늘";
  return (
    <View style={styles.taskRow}>
      {first ? null : <View style={styles.taskDivider} />}
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.taskMain}>
        <CareItemIcon code={task.careItem} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={styles.taskTitle}>
            <Text variant="body-xl" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {title}
            </Text>
            <Pill danger={task.overdueDays > 0}>{badge}</Pill>
          </View>
          {subline ? (
            <Text
              variant="body-md"
              weight="medium"
              color={semantic.mutedForeground}
              numberOfLines={1}
            >
              {subline}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} 완료 체크`}
        disabled={checking}
        hitSlop={10}
        onPress={onCheck}
        style={({ pressed }) => [
          styles.check,
          (pressed || checking) && { backgroundColor: semantic.primary },
        ]}
      >
        <CheckIcon size={16} color={semantic.card} strokeWidth={3} />
      </Pressable>
    </View>
  );
}

function Pill({ children, danger }: { children: ReactNode; danger: boolean }) {
  return (
    <View style={styles.pill}>
      <Text
        variant="body-md"
        weight="medium"
        color={danger ? semantic.destructive : semantic.secondaryText}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: semantic.screen },
  content: { paddingHorizontal: GUTTER, paddingBottom: 40 },
  head: { gap: 4 },
  hero: { width: "100%", height: 220 },
  summary: {
    flexDirection: "row",
    paddingVertical: 16,
    borderRadius: radius.xl,
    backgroundColor: semantic.card,
  },
  cell: { flex: 1, minWidth: 0, alignItems: "center", gap: 2 },
  suggestBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: { marginTop: 4 },
  linkRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkDivider: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 0,
    height: 1,
    backgroundColor: semantic.border,
  },
  pressed: { backgroundColor: semantic.muted },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  taskDivider: {
    position: "absolute",
    top: 0,
    left: 64,
    right: 16,
    height: 1,
    backgroundColor: semantic.border,
  },
  taskMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  taskTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  pill: {
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: semantic.muted,
  },
  check: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: semantic.input,
  },
  emptyRecords: { paddingVertical: 24 },
  allRecords: { alignSelf: "center", paddingVertical: 4 },
});
