import { queryOptions } from "@tanstack/react-query";
import { todayApi } from "../api/endpoints";
import { queryKeys } from "../api/query-keys";
import { formatInterval, intakeLabelFor, isFeedItem } from "../domain/care";
import type { FeedResultSet } from "../domain/species";
import type { Task } from "../domain/today";
import { formatMonthDay, formatTime, todayYmd } from "../lib/date";

export const todayQueries = {
  byDate: (date: string, petId?: string) =>
    queryOptions({
      queryKey: queryKeys.todayAt(date, petId),
      queryFn: () => todayApi.get(date, petId),
    }),
};

/** 할 일 카드 제목. 급여 할 일은 가이드라인 기본 먹이 이름을 붙인다 (오늘 할 일 응답에 먹이 이름이 없어서) */
export function taskTitle(
  task: Pick<Task, "title" | "recordKind">,
  foodName: string | null = null,
) {
  return foodName && isFeedItem(task.recordKind) && !task.title.includes(" · ")
    ? `${task.title} · ${foodName}`
    : task.title;
}

/** 할 일 카드 둘째 줄: 주기 · 결과 · 완료 시각 / 건너뜀 사유 / 미룬 날짜 */
export function taskSubline(task: Task, feedResultSet: FeedResultSet | null = null) {
  // 주기는 백엔드 오늘 할 일 응답에 아직 없어 비어 있을 수 있다
  const interval = task.intervalDays === null ? "" : formatInterval(task.intervalDays);
  if (task.state === "done" && task.record) {
    // 결과(먹은 정도·체중)가 있으면 완료 시각 앞에 같이 보여 준다
    const result = task.record.intake
      ? intakeLabelFor(feedResultSet, task.record.intake)
      : task.record.weightG !== null
        ? `${task.record.weightG} g`
        : "";
    return [interval, result, `${formatTime(task.record.occurredAt)} 완료`]
      .filter(Boolean)
      .join(" · ");
  }
  if (task.state === "skipped") {
    return [interval, task.record?.skipReason].filter(Boolean).join(" · ");
  }
  if (task.originalDueOn) {
    // 앞 날짜(U1)에서는 그날로 미뤄진 것이니 '원래 날짜'만, 오늘 이후로 옮겨 온 할 일은 화살표까지 (D1)
    const moved =
      task.state === "planned"
        ? `원래 ${formatMonthDay(task.originalDueOn)}`
        : `원래 ${formatMonthDay(task.originalDueOn)} → ${task.dueOn === todayYmd() ? "오늘" : formatMonthDay(task.dueOn)}`;
    return [moved, interval].filter(Boolean).join(" · ");
  }
  return interval;
}
