import { addDays, format } from "date-fns";
import { z } from "zod";
import { intakeSchema, recordKindSchema } from "./care";

export const taskStateSchema = z.enum(["todo", "done", "skipped", "planned"]);
export type TaskState = z.infer<typeof taskStateSchema>;

/** 오늘 할 일 한 장 (API-40). 앞 날짜를 조회하면 planned로 온다 */
export const taskSchema = z.object({
  routineId: z.string(),
  petId: z.string(),
  petName: z.string(),
  /** 백엔드 관리 항목 코드 */
  careItem: z.string(),
  careItemName: z.string(),
  recordKind: recordKindSchema,
  title: z.string(),
  /** 급여 할 일의 먹이 이름. 완료한 급여는 기록에 적은 이름. 없으면 가이드라인 기본 먹이로 보인다 */
  foodName: z.string().nullable(),
  /** N일마다. 백엔드 오늘 할 일 응답(Task)에는 아직 없어 null일 수 있다 [백엔드 요청] */
  intervalDays: z.number().int().nullable(),
  dueOn: z.iso.date(),
  /** 미룬 할 일이면 원래 예정일 */
  originalDueOn: z.iso.date().nullable(),
  /** 지난 할 일이면 며칠 지났는지. '안 함'으로 단정하지 않고 'n일 지남'으로만 보인다 */
  overdueDays: z.number().int().min(0),
  state: taskStateSchema,
  record: z
    .object({
      id: z.string(),
      occurredAt: z.iso.datetime(),
      intake: intakeSchema.nullable(),
      weightG: z.number().nullable(),
      skipReason: z.string().nullable(),
    })
    .nullable(),
});
export type Task = z.infer<typeof taskSchema>;

/** 미룬 할 일(원래 예정일이 있음)인가. 미룬 할 일은 다시 미루기만 할 수 있다 (U3, Q-50: 미루기 취소는 화면에서 뺀다) */
export const isPostponed = (task: Pick<Task, "originalDueOn">) => task.originalDueOn !== null;

/**
 * ⋯ 메뉴에서 미루기를 보일지. 오늘·지난 할 일(todo)은 언제나,
 * 앞 날짜(planned)는 이미 미룬 할 일만 다시 미룰 수 있다 (T06-04). 완료·건너뜀은 미루지 않는다
 */
export const canPostpone = (task: Pick<Task, "state" | "originalDueOn">) =>
  task.state === "todo" || (task.state === "planned" && isPostponed(task));

const QUICK_LABELS = ["", "내일", "모레", "글피"] as const;

/**
 * 미루기 시트의 빠른 날짜 칩 두 개 (내일·모레·글피 중). 지금 예정일과 같은 날은 빼서,
 * 이미 미룬 할 일을 같은 날로 다시 미루는 칩이 나오지 않게 한다
 */
export function postponeQuickDates(task: Pick<Task, "dueOn">, today: Date) {
  return [1, 2, 3]
    .map((n) => ({ value: format(addDays(today, n), "yyyy-MM-dd"), label: QUICK_LABELS[n]! }))
    .filter((option) => option.value !== task.dueOn)
    .slice(0, 2);
}

export const todaySchema = z.object({
  date: z.iso.date(),
  items: z.array(taskSchema),
});
export type Today = z.infer<typeof todaySchema>;
