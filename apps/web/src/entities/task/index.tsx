import { taskSubline, taskTitle } from "@pabom/core/entities/task";
import type { RecordKind } from "@pabom/core/domain/care";
import type { FeedResultSet } from "@pabom/core/domain/species";
import type { Task } from "@pabom/core/domain/today";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { CareIcon } from "@/shared/ui/care-icons";
import { Badge } from "@/shared/ui/display";
import { CheckIcon, MinusIcon, PlusIcon } from "@/shared/ui/icons";

// 조회·표시 로직은 웹·앱이 함께 쓰는 @pabom/core 에 있다. 여기는 웹 UI만
export { taskSubline, taskTitle, todayQueries } from "@pabom/core/entities/task";
export { careIconOf, type CareIconKind } from "@/shared/ui/care-icons";

/** 할 일 아이콘 (Figma '할 일 아이콘'): 회색 둥근 네모(36, 모서리 12) 안 22px 그림 */
export function TaskIcon({
  careItem,
  kind,
  className,
}: {
  careItem: string;
  kind?: RecordKind | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      <CareIcon code={careItem} recordKind={kind} size={22} />
    </span>
  );
}

/** 할 일 묶음 (Figma '할 일 묶음'): 흰 카드 하나에 할 일 줄을 구분선으로 잇는다 */
export function TaskGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-2xl bg-card", className)}>{children}</div>;
}

/** 줄 사이 구분선. 아이콘 오른쪽(64)부터 그린다 */
export function RowDivider() {
  return <span aria-hidden className="absolute top-0 right-4 left-16 h-px bg-border" />;
}

/**
 * 누를 수 있는 묶음 줄의 뼈대. 줄 전체가 버튼처럼 눌림 색을 내고(button 을 뒤에 깔아),
 * 오른쪽 체크처럼 따로 눌리는 것은 그 위에 올린다 (버튼 안에 버튼을 넣지 않으려고)
 */
export function PressableRow({
  label,
  onClick,
  disabled,
  divider,
  children,
}: {
  /** 줄 버튼의 화면 읽기 이름 */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-3 px-4 py-3.5">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled || !onClick}
        className="absolute inset-0 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted active:bg-muted disabled:pointer-events-none"
      />
      {divider ? <RowDivider /> : null}
      {children}
    </div>
  );
}

/** 미룸 · 건너뜀 테두리 꼬리표 */
function StateTag({ task }: { task: Task }) {
  if (task.state === "skipped") return <Badge tone="outline">건너뜀</Badge>;
  if (task.originalDueOn && (task.state === "todo" || task.state === "planned")) {
    return <Badge tone="primary">미룸</Badge>;
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
    <PressableRow label={`${title} 메뉴`} onClick={onOpen} divider={divider}>
      <TaskIcon
        careItem={task.careItem}
        kind={task.recordKind}
        className="pointer-events-none relative"
      />
      <div
        className={cn(
          "pointer-events-none relative flex min-w-0 flex-1 flex-col gap-0.5",
          task.state === "done" && "opacity-55",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-body-xl font-semibold text-foreground">{title}</span>
          <StateTag task={task} />
        </span>
        <span className="truncate text-body-md font-medium text-muted-foreground">
          {subline}
          {overdue ? (
            <span className="text-destructive">
              {subline ? " · " : ""}
              {overdue}
            </span>
          ) : null}
        </span>
      </div>
      <CheckButton task={task} title={title} onCheck={onCheck} checking={checking} />
    </PressableRow>
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
  const circle = (
    <span
      className={cn(
        "relative flex size-6.5 items-center justify-center overflow-hidden rounded-full bg-input text-white transition-transform duration-200",
        // 차오를 때 살짝 커졌다 돌아온다 (앱 bump)
        checking && "scale-110",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full bg-primary transition-[opacity,transform] duration-300 ease-out",
          filled ? "scale-100 opacity-100" : "scale-0 opacity-0",
        )}
      />
      {task.state === "skipped" ? (
        <MinusIcon className="relative size-4.5" strokeWidth={2.6} aria-hidden />
      ) : (
        <CheckIcon className="relative size-4.5" strokeWidth={2.6} aria-hidden />
      )}
    </span>
  );

  if (task.state !== "todo") {
    return (
      <span
        role="img"
        aria-label={task.state === "done" ? "완료" : task.state === "skipped" ? "건너뜀" : "예정"}
        className={cn(
          "pointer-events-none relative shrink-0",
          task.state === "planned" && "opacity-45",
        )}
      >
        {circle}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={`${task.petName} ${title} 완료 체크`}
      onClick={onCheck}
      disabled={checking || !onCheck}
      // 26px 동그라미 둘레로 눌리는 자리를 넓힌다 (앱 hitSlop 10)
      className="relative -m-2.5 shrink-0 rounded-full p-2.5 transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-90"
    >
      {circle}
    </button>
  );
}

/**
 * 제안 줄 (D1 변형). 생애 단계를 모르는(잘 모르겠어요) 개체에 '체중 재기'를 권한다.
 * Figma '할 일 카드 · 체중 재기' 처럼 체중 그림에 '제안' 꼬리표, 오른쪽 + 를 누르면 체중 기록.
 * [백엔드 확인 필요] 오늘 할 일(GET /today) 응답에는 제안 항목이 없어 홈에서 개체 단계로 만든다.
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
    <PressableRow label={`${petName} ${title}`} onClick={onOpen ?? onCheck} divider={divider}>
      <TaskIcon careItem={careItem} className="pointer-events-none relative" />
      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-body-xl font-semibold text-foreground">{title}</span>
          <Badge tone="primary">제안</Badge>
        </span>
        <span className="truncate text-body-md font-medium text-muted-foreground">
          {petName} · {subline}
        </span>
      </div>
      <button
        type="button"
        aria-label={`${petName} ${title} 기록하기`}
        onClick={onCheck}
        className="relative -m-2.5 shrink-0 rounded-full p-2.5 transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-90"
      >
        <span className="flex size-6.5 items-center justify-center rounded-full bg-primary text-white">
          <PlusIcon className="size-4" strokeWidth={2.6} aria-hidden />
        </span>
      </button>
    </PressableRow>
  );
}
