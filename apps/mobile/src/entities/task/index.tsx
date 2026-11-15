import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import type { FeedResultSet } from "@pabom/core/domain/species";
import type { Task } from "@pabom/core/domain/today";
import { taskSubline, taskTitle } from "@pabom/core/entities/task";
import { Badge, Card } from "@/shared/ui/display";
import { CheckIcon, PlusIcon } from "@/shared/ui/icons";
import { Menu, type MenuItem } from "@/shared/ui/menu";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";

// 조회·표시 로직은 웹·앱이 함께 쓰는 @pabom/core 에 있다. 여기는 앱 UI만
export { taskSubline, taskTitle, todayQueries } from "@pabom/core/entities/task";

function TaskBadge({ task }: { task: Task }) {
  if (task.state === "skipped") return <Badge tone="hint">건너뜀</Badge>;
  if (task.originalDueOn && (task.state === "todo" || task.state === "planned")) {
    return <Badge tone="primary">미룸</Badge>;
  }
  if (task.state !== "todo") return null;
  if (task.overdueDays > 0) return <Badge tone="contrast">{task.overdueDays}일 지남</Badge>;
  return <Badge>오늘</Badge>;
}

/**
 * 할 일 카드 (D1): 할 일 · 미룸 · 완료 · 건너뜀 4상태 + 앞 날짜(planned).
 * 체크 동그라미는 할 일일 때만 누를 수 있다.
 */
export function TaskCard({
  task,
  feedResultSet = null,
  foodName = null,
  onCheck,
  onOpen,
  menu,
  checking,
}: {
  task: Task;
  /** 급여 할 일의 먹이 묶음. 완료 결과(먹은 정도) 이름이 묶음에 맞춰 보인다 */
  feedResultSet?: FeedResultSet | null;
  /** 급여 할 일 제목에 붙일 먹이 이름 (오늘 할 일 응답에 없어 가이드라인 기본 먹이로 채운다) */
  foodName?: string | null;
  onCheck?: () => void;
  onOpen?: () => void;
  menu?: MenuItem[];
  checking?: boolean;
}) {
  const finished = task.state === "done" || task.state === "skipped";
  const title = taskTitle(task, foodName);
  const dim = task.state === "done";

  return (
    <Card style={styles.card}>
      <CheckCircle task={task} onCheck={onCheck} checking={checking} />
      <Pressable accessibilityRole="button" onPress={onOpen} disabled={!onOpen} style={styles.main}>
        <View style={styles.titleRow}>
          <Badge tone="primary" faded={finished}>
            {task.petName}
          </Badge>
          <Text
            variant="body-xl"
            weight="bold"
            numberOfLines={1}
            color={dim ? semantic.subtleForeground : semantic.foreground}
            style={{ flexShrink: 1 }}
          >
            {title}
          </Text>
          <TaskBadge task={task} />
        </View>
        <Text
          variant="body-md"
          numberOfLines={1}
          color={dim ? semantic.subtleForeground : semantic.mutedForeground}
        >
          {taskSubline(task, feedResultSet)}
        </Text>
      </Pressable>
      {menu && menu.length ? (
        <Menu items={menu} label={`${title} 메뉴`} />
      ) : (
        <View style={{ width: 8 }} />
      )}
    </Card>
  );
}

function CheckCircle({
  task,
  onCheck,
  checking,
}: {
  task: Task;
  onCheck?: () => void;
  checking?: boolean;
}) {
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!checking) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [checking, pulse]);

  if (task.state === "done") {
    return (
      <View
        style={[styles.circle, { backgroundColor: semantic.primary }]}
        accessibilityLabel="완료"
      >
        <CheckIcon size={16} color="#ffffff" strokeWidth={3} />
      </View>
    );
  }
  if (task.state === "skipped") {
    return (
      <View
        accessibilityLabel="건너뜀"
        style={[
          styles.circle,
          { borderWidth: 1.8, borderStyle: "dashed", borderColor: semantic.input },
        ]}
      />
    );
  }
  if (task.state === "planned") {
    return (
      <View
        accessibilityLabel="예정"
        style={[
          styles.circle,
          { borderWidth: 1.5, borderColor: semantic.input, backgroundColor: semantic.muted },
        ]}
      />
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${task.petName} ${task.title} 완료 체크`}
      onPress={onCheck}
      disabled={checking}
      hitSlop={8}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.circle,
            {
              borderWidth: 1.8,
              borderColor: checking ? semantic.primary : semantic.foreground,
              opacity: pulse,
            },
            pressed && { backgroundColor: semantic.primarySoft },
          ]}
        />
      )}
    </Pressable>
  );
}

/**
 * 제안 카드 (D1 변형). 생애 단계를 모르는(잘 모르겠어요) 개체에 '체중 재기'를 권한다.
 * D1 와이어프레임에는 '제안' 상태가 따로 없어 일반 카드 모양에 '제안' 배지만 붙였다.
 */
export function SuggestionCard({
  petName,
  title,
  subline,
  onCheck,
  onOpen,
}: {
  petName: string;
  title: string;
  subline: string;
  onCheck: () => void;
  onOpen?: () => void;
}) {
  return (
    <Card dashed style={[styles.card, { paddingRight: 12 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${petName} ${title} 기록하기`}
        onPress={onCheck}
        hitSlop={8}
        style={({ pressed }) => [
          styles.circle,
          { borderWidth: 1.8, borderColor: semantic.primary },
          pressed && { backgroundColor: semantic.primarySoft },
        ]}
      >
        <PlusIcon size={16} color={semantic.primary} />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onOpen ?? onCheck} style={styles.main}>
        <View style={styles.titleRow}>
          <Badge tone="primary">{petName}</Badge>
          <Text variant="body-xl" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          <Badge>제안</Badge>
        </View>
        <Text variant="body-md" color={semantic.mutedForeground} numberOfLines={1}>
          {subline}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 4,
  },
  main: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
