import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Task } from "@pabom/core/domain/today";
import { TaskIcon, taskSubline, taskTitle } from "@/entities/task";
import {
  ClockIcon,
  InformationCircleIcon,
  PencilIcon,
  RefreshIcon,
  TrashIcon,
  type IconProps,
} from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";
import { SheetFrame } from "./sheet-frame";

export type TaskMenuIcon = "postpone" | "skip" | "edit" | "undo" | "delete";

export type TaskMenuItem = {
  label: string;
  icon: TaskMenuIcon;
  onSelect: () => void;
  /** 삭제처럼 한 번 더 묻는 행동. 구분선 아래 회색으로 떨어뜨린다 */
  tone?: "default" | "danger";
};

/** 이번만 건너뛰기 (Figma 할 일 시트 '↪' 아이콘, 22px 선 1.65) */
const SkipIcon = ({ size = 22, color = semantic.mutedForeground }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <Path
      d="M3.66667 15.5833C5.04167 11 8.25 8.25 12.375 8.25H17.4167"
      strokeWidth={1.65}
      strokeLinecap="round"
      stroke={color}
    />
    <Path
      d="M14.2083 5.04167L17.4167 8.25L14.2083 11.4583"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke={color}
    />
  </Svg>
);

const ICONS: Record<TaskMenuIcon, (props: IconProps) => ReactNode> = {
  postpone: ClockIcon,
  skip: SkipIcon,
  edit: PencilIcon,
  undo: RefreshIcon,
  delete: TrashIcon,
};

/**
 * 할 일 시트 (SCR-H02 할 일 메뉴). 할 일 줄을 누르면 올라온다.
 * 머리(아이콘·이름·주기)를 누르면 '왜 이 할 일이 있나요?'(H04)
 */
export function TaskSheet({
  task,
  items,
  onOpenChange,
  onOpenBasis,
}: {
  task: Task | null;
  items: TaskMenuItem[];
  onOpenChange: (open: boolean) => void;
  onOpenBasis: (task: Task) => void;
}) {
  const [shown, setShown] = useState<{ task: Task; items: TaskMenuItem[] } | null>(null);
  if (task && (task !== shown?.task || items !== shown.items)) {
    setShown({ task, items });
  }
  const current = task ? { task, items } : shown;

  // 고른 행동은 바로 실행한다. 이 시트가 내려가는 동안 다음 시트가 그 위로 올라온다
  const choose = (run: () => void) => {
    onOpenChange(false);
    run();
  };

  const overdue =
    current && current.task.state === "todo" && !current.task.originalDueOn
      ? current.task.overdueDays
      : 0;
  const subline = current
    ? [current.task.petName, taskSubline(current.task), overdue > 0 ? `${overdue}일 지남` : null]
        .filter(Boolean)
        .join(" · ")
    : "";
  const main = current?.items.filter((item) => item.tone !== "danger") ?? [];
  const danger = current?.items.filter((item) => item.tone === "danger") ?? [];

  return (
    <SheetFrame open={Boolean(task)} onOpenChange={onOpenChange}>
      {current ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="이 할 일이 왜 있는지 보여 줘요"
            onPress={() => choose(() => onOpenBasis(current.task))}
            style={styles.head}
          >
            <TaskIcon careItem={current.task.careItem} kind={current.task.recordKind} />
            <View style={styles.headText}>
              <Text variant="title-xs" accessibilityRole="header" numberOfLines={1}>
                {taskTitle(current.task)}
              </Text>
              <Text variant="body-lg" color={semantic.mutedForeground} numberOfLines={1}>
                {subline}
              </Text>
            </View>
            <InformationCircleIcon size={20} color={semantic.subtleForeground} strokeWidth={1.8} />
          </Pressable>
          {main.map((item) => (
            <MenuRow key={item.label} item={item} onPress={() => choose(item.onSelect)} />
          ))}
          {danger.length ? <View style={styles.divider} /> : null}
          {danger.map((item) => (
            <MenuRow key={item.label} item={item} onPress={() => choose(item.onSelect)} />
          ))}
        </>
      ) : null}
    </SheetFrame>
  );
}

function MenuRow({ item, onPress }: { item: TaskMenuItem; onPress: () => void }) {
  const Icon = ICONS[item.icon];
  const danger = item.tone === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Icon
        size={22}
        color={danger ? semantic.subtleForeground : semantic.mutedForeground}
        strokeWidth={1.65}
      />
      <Text
        variant="body-xl"
        weight="medium"
        color={danger ? semantic.subtleForeground : semantic.foreground}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 16 },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  item: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 26, paddingVertical: 13 },
  pressed: { opacity: 0.6 },
  divider: { height: 1, backgroundColor: semantic.border },
});
