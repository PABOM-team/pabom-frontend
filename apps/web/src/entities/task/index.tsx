import { taskSubline, taskTitle } from "@pabom/core/entities/task";
import type { FeedResultSet } from "@pabom/core/domain/species";
import type { Task } from "@pabom/core/domain/today";
import { CheckIcon, PlusIcon } from "@/shared/ui/icons";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/display";
import { Menu, type MenuItem } from "@/shared/ui/menu";

// 조회·표시 로직은 웹·앱이 함께 쓰는 @pabom/core 에 있다. 여기는 웹 UI만
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
            {title}
          </span>
          <TaskBadge task={task} />
        </span>
        <span
          className={cn(
            "truncate text-body-md",
            task.state === "done" ? "text-subtle-foreground" : "text-muted-foreground",
          )}
        >
          {taskSubline(task, feedResultSet)}
        </span>
      </button>
      {menu && menu.length ? (
        <Menu items={menu} label={`${title} 메뉴`} />
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
