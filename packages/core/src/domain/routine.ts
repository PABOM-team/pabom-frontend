import { addDays, differenceInCalendarDays, isAfter, isBefore, startOfDay } from "date-fns";
import { z } from "zod";
import { formatInterval, isFeedItem, recordKindSchema } from "./care";
import { careLabelSchema } from "./species";

export const ROUTINE_INTERVAL_MIN = 1;
export const ROUTINE_INTERVAL_MAX = 365;

/** 개체의 관리 일정 한 줄 (API-30). 다음 예정일은 '마지막 완료일 + 주기'로 서버가 계산한다 */
export const routineSchema = z.object({
  id: z.string(),
  petId: z.string(),
  /** 백엔드 관리 항목 코드 (FEED·MIST·WEIGHT·…) */
  careItem: z.string(),
  /** 백엔드가 주는 항목 이름 (급여·탈피 확인·습식 은신처 적시기·…) */
  careItemName: z.string(),
  recordKind: recordKindSchema,
  /** N일마다 반복 */
  intervalDays: z.number().int().min(ROUTINE_INTERVAL_MIN).max(ROUTINE_INTERVAL_MAX),
  /** 기준표 값. 바꾸면 customized가 켜진다 */
  /** 기준표 값. 주기를 직접 바꾼 뒤에는 백엔드가 주지 않아 null 일 수 있다 */
  standardIntervalDays: z.number().int().min(1).nullable(),
  /** 가이드라인이 허용하는 주기 범위. 직접 바꾼 뒤에는 백엔드가 주지 않아 null 일 수 있다 */
  minDays: z.number().int().min(1).nullable(),
  maxDays: z.number().int().min(1).nullable(),
  customized: z.boolean(),
  enabled: z.boolean(),
  /** 꺼진 일정은 시작일·다음 예정일이 없다 */
  startDate: z.iso.date().nullable(),
  /** 급여일 때 먹이 이름 */
  foodName: z.string().nullable(),
  nextDueOn: z.iso.date().nullable(),
  /** 미룬 날짜. 미루기 전 예정일은 originalDueOn */
  postponedTo: z.iso.date().nullable(),
  originalDueOn: z.iso.date().nullable(),
  basis: z.object({
    label: careLabelSchema,
    /** 적용 조건 (예: 크레스티드 게코 · 어린 개체) */
    condition: z.string(),
    sourceText: z.string().nullable(),
    version: z.string(),
  }),
});
export type Routine = z.infer<typeof routineSchema>;

export type RoutineUpdateInput = {
  intervalDays?: number;
  enabled?: boolean;
  foodName?: string | null;
  reason?: string | null;
};

/**
 * 수정 창에 보여 줄 가이드라인 주기 범위 (v1.2 P03).
 * 직접 바꾼 주기는 범위를 숨기고 되돌리기만 보여 준다. 범위가 한 값뿐인 항목(청소 30~30일,
 * 분무·물 갈기 1~1일 같은 O/X 항목)은 고를 폭이 없으니 주기만 보여 준다 (QA T03-05)
 */
export function guidelineRange(
  routine: Pick<Routine, "customized" | "minDays" | "maxDays">,
): { min: number; max: number } | null {
  const { customized, minDays, maxDays } = routine;
  if (customized || !minDays || !maxDays || minDays >= maxDays) return null;
  return { min: minDays, max: maxDays };
}

/**
 * [from, to] 구간(양 끝 포함)에서 루틴이 돌아오는 날짜를 구한다.
 * 홈 캘린더의 미래 날짜 미리보기와 알림 예약에서 같이 쓴다.
 */
export function getOccurrences(
  routine: Pick<Routine, "intervalDays" | "startDate" | "enabled">,
  from: Date,
  to: Date,
): Date[] {
  if (!routine.enabled || !routine.startDate) return [];

  const start = startOfDay(new Date(`${routine.startDate}T00:00:00`));
  const rangeStart = startOfDay(from);
  const rangeEnd = startOfDay(to);
  if (isBefore(rangeEnd, rangeStart)) return [];

  let cursor = start;
  if (isBefore(start, rangeStart)) {
    const elapsed = differenceInCalendarDays(rangeStart, start);
    const steps = Math.ceil(elapsed / routine.intervalDays);
    cursor = addDays(start, steps * routine.intervalDays);
  }

  const result: Date[] = [];
  while (!isAfter(cursor, rangeEnd)) {
    result.push(cursor);
    cursor = addDays(cursor, routine.intervalDays);
  }
  return result;
}

/**
 * 단계 확인 전 개체의 체크 리스트(P03)에서 '지금 며칠마다 먹이고 있나요?'를 물을 급여 일정.
 * 켜진 급여형 일정 중 첫 번째. 없으면 묻지 않는다.
 */
export function feedRoutineToAsk<T extends Pick<Routine, "enabled" | "recordKind">>(
  routines: readonly T[],
): T | null {
  return routines.find((r) => r.enabled && isFeedItem(r.recordKind)) ?? null;
}

/** 급여 주기를 모를 때 잡는 주기 (P03 단계 확인 전: 모르면 매일) */
export const UNKNOWN_FEED_INTERVAL_DAYS = 1;

/**
 * '지금 며칠마다 먹이고 있나요?' 입력값 → 저장할 주기.
 * 비우면 모름으로 보고 매일, 범위를 벗어나거나 숫자가 아니면 null(저장 불가).
 */
export function feedIntervalFromAnswer(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return UNKNOWN_FEED_INTERVAL_DAYS;
  if (!/^[0-9]+$/.test(trimmed)) return null;
  const days = Number(trimmed);
  return days >= ROUTINE_INTERVAL_MIN && days <= ROUTINE_INTERVAL_MAX ? days : null;
}

/** 단계 확인 전 급여 주기 질문 문구 (P03) */
export const FEED_INTERVAL_ASK = {
  title: "지금 며칠마다 먹이고 있나요?",
  hint: "적어 주면 그 주기로 맞춰요. 모르면 비워 두고 저장하세요. 매일로 잡아요.",
} as const;

export const feedIntervalSavedMessage = (name: string, days: number) =>
  `${name} 주기를 ${formatInterval(days)}로 잡았어요`;
