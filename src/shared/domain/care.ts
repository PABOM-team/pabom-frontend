import { z } from "zod";

/**
 * 관리 항목은 백엔드 코드(careItemCode·itemCode) 그대로 쓴다. 종마다 항목이 다르고 앞으로 늘어날 수 있어
 * 앱이 목록을 고정하지 않는다 (dev 백엔드 2026-11: CLEAN·FEED·FEED_INSECT·MIST·SHED_CHECK·UVB_LAMP·
 * WATER·WEIGHT·HUMID_HIDE·MULTIVITAMIN). 이름은 백엔드 careItemName·itemName을 쓰고,
 * 기록 방식은 recordType(OX·FEED·WEIGHT)으로 정한다.
 */

/** 몸무게 항목 코드. 체중 기록·단계 제안에 쓴다 */
export const WEIGHT_CODE = "WEIGHT";
/** 직접 기록에만 쓰는 메모. 백엔드 항목 목록에는 없다 [백엔드 확인 필요] */
export const MEMO_CODE = "MEMO";

/**
 * 기록 방식
 * - intake: 먹은 정도 칩(급여)
 * - weight: 숫자 g(체중)
 * - check: O/X, 체크하면 시트 없이 바로 완료
 * - memo: 메모·사진만
 */
export const RECORD_KINDS = ["intake", "weight", "check", "memo"] as const;
export const recordKindSchema = z.enum(RECORD_KINDS);
export type RecordKind = z.infer<typeof recordKindSchema>;

/** 백엔드 recordType·resultType → 기록 방식 */
const RECORD_KIND_OF_TYPE: Record<string, RecordKind> = {
  FEED: "intake",
  WEIGHT: "weight",
  OX: "check",
};

/** recordType이 없는 응답(루틴 수정·기록)에서 코드로 짐작하는 기록 방식 */
const RECORD_KIND_OF_CODE: Record<string, RecordKind> = {
  FEED: "intake",
  FEED_INSECT: "intake",
  [WEIGHT_CODE]: "weight",
  [MEMO_CODE]: "memo",
};

/**
 * 기록 방식을 정한다. recordType이 있으면 그걸로, 없으면 잘 아는 코드로, 그래도 모르면 기록 값으로
 * (먹은 정도가 있으면 급여형) 짐작하고 마지막엔 O/X
 */
export function recordKindOf(item: {
  code: string;
  recordType?: string | null;
  outcome?: unknown;
}): RecordKind {
  const byType = item.recordType ? RECORD_KIND_OF_TYPE[item.recordType] : undefined;
  if (byType) return byType;
  const byCode = RECORD_KIND_OF_CODE[item.code];
  if (byCode) return byCode;
  return item.outcome ? "intake" : "check";
}

/** 백엔드가 이름을 주지 않는 자리(메모·기록 요약)에 쓰는 잘 아는 코드의 앱 이름 */
export const CARE_ITEM_LABEL: Record<string, string> = {
  FEED: "급여",
  FEED_INSECT: "곤충 급여",
  MIST: "분무",
  [WEIGHT_CODE]: "체중",
  CLEAN: "청소",
  SHED_CHECK: "탈피",
  WATER: "물 갈기",
  UVB_LAMP: "UVB 램프 교체",
  HUMID_HIDE: "습식 은신처 적시기",
  MULTIVITAMIN: "종합 비타민",
  [MEMO_CODE]: "메모",
};

/** 체크 리스트(일정) 이름. 탈피는 일정일 때 '탈피 확인'으로 부른다 */
export const ROUTINE_LABEL: Record<string, string> = {
  ...CARE_ITEM_LABEL,
  SHED_CHECK: "탈피 확인",
};

/** 기록 요약 이름: 백엔드 이름 → 잘 아는 코드의 앱 이름 → 코드 */
export const careItemLabel = (code: string, name?: string | null) =>
  name?.trim() || CARE_ITEM_LABEL[code] || code;

/** 체크 리스트 이름: 백엔드 이름 → 잘 아는 코드의 앱 이름 → 코드 */
export const routineLabel = (code: string, name?: string | null) =>
  name?.trim() || ROUTINE_LABEL[code] || code;

/** 홈·체크 리스트에서 항목을 늘어놓는 순서. 모르는 코드는 뒤에 이름순 */
const CARE_ITEM_ORDER = [
  "FEED",
  "FEED_INSECT",
  "MIST",
  "WATER",
  WEIGHT_CODE,
  "CLEAN",
  "SHED_CHECK",
  "HUMID_HIDE",
  "MULTIVITAMIN",
  "UVB_LAMP",
  MEMO_CODE,
];

type Orderable = { careItem: string; careItemName: string };

export function compareCareItems(a: Orderable, b: Orderable) {
  const ia = CARE_ITEM_ORDER.indexOf(a.careItem);
  const ib = CARE_ITEM_ORDER.indexOf(b.careItem);
  if (ia === -1 && ib === -1) return a.careItemName.localeCompare(b.careItemName);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

export const isWeightItem = (code: string) => code === WEIGHT_CODE;
export const isMemoItem = (code: string) => code === MEMO_CODE;
/** 급여형(먹은 정도를 적는) 항목 */
export const isFeedItem = (kind: RecordKind) => kind === "intake";

export const RECORD_KIND_LABEL: Record<RecordKind, string> = {
  intake: "먹은 정도",
  weight: "숫자(g)",
  check: "O/X",
  memo: "메모",
};

export const RECORD_KIND_HINT: Record<RecordKind, string> = {
  intake: "먹은 정도(일부·전부·안 먹음·관찰 못함)",
  weight: "숫자(g) · 체크하면 몸무게를 입력해요",
  check: "O/X · 체크하면 바로 완료돼요",
  memo: "메모·사진",
};

/** 급여 결과. 미리 선택하지 않고 비워도 저장된다 (SCR-H02) */
export const INTAKES = ["partial", "all", "none", "unobserved"] as const;
export const intakeSchema = z.enum(INTAKES);
export type Intake = z.infer<typeof intakeSchema>;

export const INTAKE_LABEL: Record<Intake, string> = {
  partial: "일부 먹음",
  all: "전부 먹음",
  none: "안 먹음",
  unobserved: "관찰 못함",
};

export const SKIP_REASONS = ["개체 상태를 보고 쉬기로 함", "일정이 맞지 않음", "기타"] as const;

export function formatInterval(days: number) {
  return days === 1 ? "매일" : `${days}일마다`;
}

/** 할 일·기록 제목. 급여형 항목은 먹이 이름을 붙인다 (예: 급여 · 인공 사료) */
export function careTitle(name: string, kind: RecordKind, foodName?: string | null) {
  return isFeedItem(kind) && foodName ? `${name} · ${foodName}` : name;
}

/** 진단·치료 면책 문구. 체크 리스트·할 일 설명·가이드라인에 그대로 쓴다 */
export const CARE_DISCLAIMER =
  "파봄은 진단이나 치료를 대신하지 않아요. 개체 상태가 걱정되면 파충류를 진료하는 동물병원에 문의해 주세요.";
