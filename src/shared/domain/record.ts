import { z } from "zod";
import { intakeSchema, recordKindSchema } from "./care";

export const photoSchema = z.object({ id: z.string(), url: z.string() });
export type Photo = z.infer<typeof photoSchema>;

export const recordRevisionSchema = z.object({
  at: z.iso.datetime(),
  /** 바뀐 칸의 이전 값 → 이후 값 요약 */
  summary: z.string(),
});

/** 관리 기록 한 건 (care_records). 완료 체크·건너뜀·직접 기록이 모두 여기에 쌓인다 */
export const careRecordSchema = z.object({
  id: z.string(),
  petId: z.string(),
  petName: z.string(),
  routineId: z.string().nullable(),
  /** 백엔드 관리 항목 코드. 메모만 남긴 기록은 MEMO */
  careItem: z.string(),
  /** 요약에 보이는 항목 이름 */
  careItemName: z.string(),
  recordKind: recordKindSchema,
  type: z.enum(["done", "skipped"]),
  /** routine: 할 일 체크, manual: 직접 기록 */
  method: z.enum(["routine", "manual"]),
  /** 사건 시각과 입력 시각은 따로 저장한다 */
  occurredAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  intake: intakeSchema.nullable(),
  weightG: z.number().positive().nullable(),
  memo: z.string().nullable(),
  foodName: z.string().nullable(),
  skipReason: z.string().nullable(),
  photos: z.array(photoSchema),
  revisions: z.array(recordRevisionSchema),
  /** 정정할 때 보내는 낙관적 잠금 번호 (백엔드 revisionNo). 목록 아이템에는 없어서 null */
  revisionNo: z.number().int().nullable(),
});
export type CareRecord = z.infer<typeof careRecordSchema>;

/** 완료 체크·건너뛰기 결과 (API-41·42). 만들어진 기록 요약과 루틴의 다음 예정일 */
export type RoutineActionResult = {
  record: Pick<
    CareRecord,
    | "id"
    | "careItem"
    | "recordKind"
    | "type"
    | "occurredAt"
    | "intake"
    | "weightG"
    | "memo"
    | "skipReason"
  >;
  routine: RoutineState;
  todayState: "todo" | "done" | "skipped" | null;
};

/** 완료·건너뛰기·미루기 뒤의 루틴 상태 (백엔드 RoutineState) */
export type RoutineState = {
  id: string;
  lastDoneOn: string | null;
  nextDueOn: string | null;
};

export const recordPageSchema = z.object({
  items: z.array(careRecordSchema),
  nextCursor: z.string().nullable(),
});
export type RecordPage = z.infer<typeof recordPageSchema>;

export const MEMO_MAX = 200;

export type RecordQuery = {
  petId?: string;
  /** 관리 항목 코드 */
  careItem?: string;
  /** YYYY-MM-DD, 양 끝 포함 (최대 366일) */
  from?: string;
  to?: string;
  cursor?: string;
  /** 받을 개수. 백엔드 한 페이지(50)를 넘으면 이어서 받는다 */
  limit?: number;
};

export type RecordCreateInput = {
  petId: string;
  /** 관리 항목 코드 (백엔드 itemCode 그대로) */
  careItem: string;
  occurredAt: string;
  intake?: z.infer<typeof intakeSchema> | null;
  weightG?: number | null;
  memo?: string | null;
  photoFileIds?: string[];
};

export type RecordUpdateInput = Partial<Omit<RecordCreateInput, "petId" | "careItem">>;

export type CompleteInput = {
  occurredAt?: string;
  intake?: z.infer<typeof intakeSchema> | null;
  weightG?: number | null;
  memo?: string | null;
};
