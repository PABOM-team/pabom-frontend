import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SvgXml } from "react-native-svg";
import type { RecordKind } from "@pabom/core/domain/care";
import type { FeedResultSet } from "@pabom/core/domain/species";
import type { Task } from "@pabom/core/domain/today";
import { taskSubline, taskTitle } from "@pabom/core/entities/task";
import { CheckIcon, MinusIcon, PlusIcon } from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { colors, radius, semantic } from "@/shared/ui/theme";
import { CARE_ICON_XML, careIconOf } from "@/shared/ui/care-icons";

// 조회·표시 로직은 웹·앱이 함께 쓰는 @pabom/core 에 있다. 여기는 앱 UI만
export { taskSubline, taskTitle, todayQueries } from "@pabom/core/entities/task";
export { careIconOf, type CareIconKind } from "@/shared/ui/care-icons";

const CHECK_SIZE = 26;

/** 할 일 아이콘 (Figma '할 일 아이콘'): 회색 둥근 네모 안 22px 그림 */
export function TaskIcon({
  careItem,
  kind,
  style,
}: {
  careItem: string;
  kind?: RecordKind | null;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.icon, style]} accessibilityElementsHidden>
      <SvgXml xml={CARE_ICON_XML[careIconOf(careItem, kind)]} width={22} height={22} />
    </View>
  );
}

/** 할 일 묶음 (Figma '할 일 묶음'): 흰 카드 하나에 할 일 줄을 구분선으로 잇는다 */
export function TaskGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

/** 줄 사이 구분선. 아이콘 오른쪽부터 그린다 */
function RowDivider() {
  return <View style={styles.divider} accessibilityElementsHidden />;
}

/** 미룸 · 건너뜀 테두리 꼬리표 */
function StateTag({ task }: { task: Task }) {
  if (task.state === "skipped") {
    return (
      <View style={[styles.tag, { borderColor: semantic.subtleForeground }]}>
        <Text variant="body-md" weight="medium" color={semantic.secondaryText}>
          건너뜀
        </Text>
      </View>
    );
  }
  if (task.originalDueOn && (task.state === "todo" || task.state === "planned")) {
    return (
      <View style={[styles.tag, { borderColor: semantic.primary }]}>
        <Text variant="body-md" weight="medium" color={semantic.primary}>
          미룸
        </Text>
      </View>
    );
  }
  return null;
}

/**
 * 할 일 줄 (D1): 할 일 · 미룸 · 완료 · 건너뜀 4상태 + 앞 날짜(planned).
 * 줄을 누르면 할 일 시트, 오른쪽 동그라미는 할 일일 때만 눌린다 (H02)
 */
export function TaskCard({
  task,
  feedResultSet = null,
  foodName = null,
  onCheck,
  onOpen,
  checking,
  divider = false,
}: {
  task: Task;
  /** 급여 할 일의 먹이 묶음. 완료 결과(먹은 정도) 이름이 묶음에 맞춰 보인다 */
  feedResultSet?: FeedResultSet | null;
  /** 급여 할 일 제목에 붙일 먹이 이름 (오늘 할 일 응답에 없어 가이드라인 기본 먹이로 채운다) */
  foodName?: string | null;
  onCheck?: () => void;
  onOpen?: () => void;
  checking?: boolean;
  /** 묶음의 두 번째 줄부터 위에 구분선 */
  divider?: boolean;
}) {
  const title = taskTitle(task, foodName);
  const subline = [task.petName, taskSubline(task, feedResultSet)].filter(Boolean).join(" · ");
  const overdue =
    task.state === "todo" && !task.originalDueOn && task.overdueDays > 0
      ? `${task.overdueDays}일 지남`
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} 메뉴`}
      onPress={onOpen}
      disabled={!onOpen}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: semantic.muted }]}
    >
      {divider ? <RowDivider /> : null}
      <TaskIcon careItem={task.careItem} kind={task.recordKind} />
      <View style={[styles.main, task.state === "done" && styles.dim]}>
        <View style={styles.titleRow}>
          <Text variant="body-xl" weight="semibold" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <StateTag task={task} />
        </View>
        <Text variant="body-md" weight="medium" color={semantic.mutedForeground} numberOfLines={1}>
          {subline}
          {overdue ? (
            <Text variant="body-md" weight="medium" color={semantic.destructive}>
              {subline ? " · " : ""}
              {overdue}
            </Text>
          ) : null}
        </Text>
      </View>
      <CheckButton task={task} title={title} onCheck={onCheck} checking={checking} />
    </Pressable>
  );
}

/**
 * 오른쪽 체크 (Figma '체크'). 할 일은 회색 동그라미에 흰 ✓, 누르면 파랑이 안에서 차오른다.
 * 완료는 파랑 ✓, 건너뜀은 회색 −, 앞 날짜는 흐리게 잠근다 (U1)
 */
function CheckButton({
  task,
  title,
  onCheck,
  checking,
}: {
  task: Task;
  title: string;
  onCheck?: () => void;
  checking?: boolean;
}) {
  const filled = task.state === "done" || Boolean(checking);
  const [fill] = useState(() => new Animated.Value(filled ? 1 : 0));
  const [bump] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.spring(fill, {
      toValue: filled ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
    if (!filled) return;
    Animated.sequence([
      Animated.timing(bump, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.spring(bump, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
    ]).start();
  }, [filled, fill, bump]);

  const circle = (
    <Animated.View style={[styles.check, { transform: [{ scale: bump }] }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.checkFill,
          { opacity: fill, transform: [{ scale: fill }] },
        ]}
      />
      {task.state === "skipped" ? (
        <MinusIcon size={18} color={colors.white} strokeWidth={2.6} />
      ) : (
        <CheckIcon size={18} color={colors.white} strokeWidth={2.6} />
      )}
    </Animated.View>
  );

  if (task.state !== "todo") {
    return (
      <View
        accessibilityLabel={
          task.state === "done" ? "완료" : task.state === "skipped" ? "건너뜀" : "예정"
        }
        style={task.state === "planned" && styles.locked}
      >
        {circle}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${task.petName} ${title} 완료 체크`}
      onPress={onCheck}
      disabled={checking || !onCheck}
      hitSlop={10}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {circle}
    </Pressable>
  );
}

/**
 * 제안 줄 (D1 변형). 생애 단계를 모르는(잘 모르겠어요) 개체에 '체중 재기'를 권한다.
 * Figma '할 일 카드 · 체중 재기' 처럼 체중 그림에 '제안' 꼬리표, 오른쪽 + 를 누르면 체중 기록
 */
export function SuggestionCard({
  petName,
  title,
  subline,
  careItem,
  onCheck,
  onOpen,
  divider = false,
}: {
  petName: string;
  title: string;
  subline: string;
  careItem: string;
  onCheck: () => void;
  onOpen?: () => void;
  divider?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen ?? onCheck}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: semantic.muted }]}
    >
      {divider ? <RowDivider /> : null}
      <TaskIcon careItem={careItem} />
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <Text variant="body-xl" weight="semibold" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <View style={[styles.tag, { borderColor: semantic.primary }]}>
            <Text variant="body-md" weight="medium" color={semantic.primary}>
              제안
            </Text>
          </View>
        </View>
        <Text variant="body-md" weight="medium" color={semantic.mutedForeground} numberOfLines={1}>
          {petName} · {subline}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${petName} ${title} 기록하기`}
        onPress={onCheck}
        hitSlop={10}
        style={({ pressed }) => [styles.check, styles.suggest, pressed && styles.pressed]}
      >
        <PlusIcon size={16} color={colors.white} strokeWidth={2.6} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 36,
    height: 36,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: semantic.muted,
  },
  // 묶음 위아래 여백은 줄 안에 둔다. 묶음에 두면 맨 위·아래 줄을 누를 때 눌림 색이 가장자리까지 닿지 않는다
  group: {
    overflow: "hidden",
    borderRadius: radius["2xl"],
    backgroundColor: semantic.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    position: "absolute",
    top: 0,
    left: 64,
    right: 16,
    height: 1,
    backgroundColor: semantic.border,
  },
  main: { flex: 1, minWidth: 0, gap: 2 },
  dim: { opacity: 0.55 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  title: { flexShrink: 1 },
  tag: {
    height: 20,
    flexShrink: 0,
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 6,
  },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: CHECK_SIZE / 2,
    backgroundColor: semantic.input,
  },
  checkFill: { borderRadius: CHECK_SIZE / 2, backgroundColor: semantic.primary },
  suggest: { backgroundColor: semantic.primary },
  locked: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.9 }] },
});
