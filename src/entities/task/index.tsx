import { queryOptions } from "@tanstack/react-query";
import { CheckIcon, PlusIcon } from "@/shared/ui/icons";
import { todayApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import { formatInterval, INTAKE_LABEL } from "@/shared/domain/care";
import type { Task } from "@/shared/domain/today";
import { formatMonthDay, formatTime, todayYmd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/display";
import { Menu, type MenuItem } from "@/shared/ui/menu";

export const todayQueries = {
  byDate: (date: string, petId?: string) =>
    queryOptions({
      queryKey: queryKeys.todayAt(date, petId),
      queryFn: () => todayApi.get(date, petId),
    }),
};

function TaskBadge({ task }: { task: Task }) {
  if (task.state === "skipped") return <Badge tone="hint">건너뜀</Badge>;
  if (task.originalDueOn && (task.state === "todo" || task.state === "planned")) {
    return <Badge tone="primary">미룸</Badge>;
  }
  if (task.state !== "todo") return null;
  if (task.overdueDays > 0) return <Badge tone="contrast">{task.overdueDays}일 지남</Badge>;
  return <Badge>오늘</Badge>;
}

function taskSubline(task: Task) {
  // 주기는 백엔드 오늘 할 일 응답에 아직 없어 비어 있을 수 있다
  const interval = task.intervalDays === null ? "" : formatInterval(task.intervalDays);
  if (task.state === "done" && task.record) {
    // 결과(먹은 정도·체중)가 있으면 완료 시각 앞에 같이 보여 준다
    const result = task.record.intake
      ? INTAKE_LABEL[task.record.intake]
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

/**
 * 할 일 카드 (D1): 할 일 · 미룸 · 완료 · 건너뜀 4상태 + 앞 날짜(planned).
 * 체크 동그라미는 할 일일 때만 누를 수 있다.
 */
export function TaskCard({
  task,
  onCheck,
  onOpen,
  menu,
  checking,
}: {
  task: Task;
  onCheck?: () => void;
  onOpen?: () => void;
  menu?: MenuItem[];
  checking?: boolean;
}) {
  const finished = task.state === "done" || task.state === "skipped";

  return (
    <article className="flex items-center gap-2.5 rounded-xl border-[1.3px] border-input bg-background py-2.5 pr-1 pl-3">
      <CheckCircle task={task} onCheck={onCheck} checking={checking} />
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className="flex min-w-0 flex-1 flex-col gap-0.5 py-1 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Badge tone="primary" className={cn(finished && "opacity-60")}>
            {task.petName}
          </Badge>
          <span
            className={cn(
              "truncate text-body-xl font-bold",
              task.state === "done" ? "text-subtle-foreground" : "text-foreground",
            )}
          >
            {task.title}
          </span>
          <TaskBadge task={task} />
        </span>
        <span
          className={cn(
            "truncate text-body-md",
            task.state === "done" ? "text-subtle-foreground" : "text-muted-foreground",
          )}
        >
          {taskSubline(task)}
        </span>
      </button>
      {menu && menu.length ? (
        <Menu items={menu} label={`${task.title} 메뉴`} />
      ) : (
        <span className="w-2" />
      )}
    </article>
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
  if (task.state === "done") {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <CheckIcon className="size-4" strokeWidth={3} aria-label="완료" />
      </span>
    );
  }
  if (task.state === "skipped") {
    return (
      <span
        aria-label="건너뜀"
        className="size-7 shrink-0 rounded-full border-[1.8px] border-dashed border-input"
      />
    );
  }
  if (task.state === "planned") {
    return (
      <span
        aria-label="예정"
        className="size-7 shrink-0 rounded-full border-[1.5px] border-input bg-muted"
      />
    );
  }
  return (
    <button
      type="button"
      aria-label={`${task.petName} ${task.title} 완료 체크`}
      onClick={onCheck}
      disabled={checking}
      className={cn(
        "size-7 shrink-0 rounded-full border-[1.8px] border-foreground transition-colors hover:bg-primary-soft",
        checking && "animate-pulse border-primary",
      )}
    />
  );
}

/**
 * 제안 카드 (D1 변형). 생애 단계를 모르는(잘 모르겠어요) 개체에 '체중 재기'를 권한다.
 * D1 와이어프레임에는 '제안' 상태가 따로 없어 일반 카드 모양에 '제안' 배지만 붙였다.
 * [백엔드 확인 필요] 오늘 할 일(GET /today) 응답에는 제안 항목이 없어 홈에서 개체 단계로 만든다.
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
    <article className="flex items-center gap-2.5 rounded-xl border-[1.3px] border-dashed border-input bg-background py-2.5 pr-3 pl-3">
      <button
        type="button"
        aria-label={`${petName} ${title} 기록하기`}
        onClick={onCheck}
        className="flex size-7 shrink-0 items-center justify-center rounded-full border-[1.8px] border-primary text-primary transition-colors hover:bg-primary-soft"
      >
        <PlusIcon className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onOpen ?? onCheck}
        className="flex min-w-0 flex-1 flex-col gap-0.5 py-1 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Badge tone="primary">{petName}</Badge>
          <span className="truncate text-body-xl font-bold text-foreground">{title}</span>
          <Badge>제안</Badge>
        </span>
        <span className="truncate text-body-md text-muted-foreground">{subline}</span>
      </button>
    </article>
  );
}
