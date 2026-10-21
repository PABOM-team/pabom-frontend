import { z } from "zod";
import { SKIP_REASONS, type CareItem, type Intake } from "./care";

/**
 * 백엔드 응답·요청 모양 (스웨거 dev.api.pabom.app/v3/api-docs, components.schemas).
 * 화면은 이 모양을 직접 쓰지 않고 src/shared/api/adapters.ts가 화면용 도메인 모델로 바꾼다.
 * 백엔드는 숫자 ID와 대문자 코드를 쓰고, 프론트 도메인은 문자열 ID와 소문자 값을 쓴다.
 * 종·개체 응답은 src/shared/domain/species.ts·pet.ts에 있다.
 */

const id = z.number().int();
/** 백엔드 시각은 +09:00 오프셋이 붙거나(…Z) 오프셋 없이(meta.timestamp) 온다 */
const dateTime = z.iso.datetime({ offset: true, local: true });
const date = z.iso.date();
const json = z.record(z.string(), z.unknown());

// ── 공통 봉투 ─────────────────────────────────────────────

/** ApiResponseBody.meta */
export const backendMetaSchema = z.object({ timestamp: dateTime, path: z.string() });

// ── 코드 대응표 ───────────────────────────────────────────

/**
 * 관리 항목 코드(itemCode·careItemCode). 스웨거에서 확인한 값은 FEEDING(예시)·SHED(detail 설명)뿐이다.
 * [백엔드 확인 필요] MISTING·WEIGHT·CLEANING·MEMO는 스웨거에 전체 목록이 없어 이름을 추정했다
 */
export const CARE_ITEM_CODE: Record<CareItem, string> = {
  feeding: "FEEDING",
  misting: "MISTING",
  weight: "WEIGHT",
  cleaning: "CLEANING",
  shed: "SHED",
  memo: "MEMO",
};

export const backendOutcomeSchema = z.enum(["ATE_ALL", "ATE_PART", "REFUSED", "NOT_OBSERVED"]);
export type BackendOutcome = z.infer<typeof backendOutcomeSchema>;
export const OUTCOME_CODE: Record<Intake, BackendOutcome> = {
  all: "ATE_ALL",
  partial: "ATE_PART",
  none: "REFUSED",
  unobserved: "NOT_OBSERVED",
};

export const skipReasonCodeSchema = z.enum(["PET_CONDITION", "SCHEDULE", "OTHER"]);
export type SkipReasonCode = z.infer<typeof skipReasonCodeSchema>;
/** 건너뛰기 이유 칩(SKIP_REASONS) ↔ reasonCode. 순서가 같다 */
export const SKIP_REASON_CODE: Record<(typeof SKIP_REASONS)[number], SkipReasonCode> = {
  [SKIP_REASONS[0]]: "PET_CONDITION",
  [SKIP_REASONS[1]]: "SCHEDULE",
  [SKIP_REASONS[2]]: "OTHER",
};

export const backendRecordTypeSchema = z.enum(["DONE", "SKIPPED"]);
export const timePrecisionSchema = z.enum(["EXACT", "DATE_ONLY"]);
export const todayStatusSchema = z.enum(["OVERDUE", "DUE", "NEEDS_RESULT", "DONE", "SKIPPED"]);
export type TodayStatus = z.infer<typeof todayStatusSchema>;
export const cycleSourceSchema = z.enum(["GUIDELINE", "USER_CUSTOM"]);
/** 관리 루틴 수정 이유 (UpdateRoutineRequest.reason). 앱 화면에는 아직 이유 입력이 없다 */
export const routineReasonSchema = z.enum([
  "BOTHERSOME",
  "MISMATCH",
  "SPECIAL_CONDITION",
  "PREFERENCE",
]);

/** care-standards의 lifeStage → 앱 단계 code. [백엔드 확인 필요] 스웨거 설명에는 JUVENILE·ADULT만 있다 */
export const LIFE_STAGE_CODE_OF: Record<string, string> = {
  HATCHLING: "hatchling",
  JUVENILE: "juvenile",
  ADULT: "adult",
};

/** POST /files?purpose= (PET_PHOTO·RECORD_PHOTO만 업로드 가능) */
export const FILE_PURPOSE = { pet: "PET_PHOTO", record: "RECORD_PHOTO" } as const;
export type FilePurpose = keyof typeof FILE_PURPOSE;

/** {a: "A"} → {A: "a"} */
export function invert<K extends string, V extends string>(table: Record<K, V>) {
  return Object.fromEntries(Object.entries(table).map(([k, v]) => [v, k])) as Record<V, K>;
}

// ── 관리 루틴 ─────────────────────────────────────────────

/** GET /pets/{petId}/routines 한 줄 (PetRoutineResult) */
export const backendPetRoutineSchema = z.object({
  routineId: id,
  petId: id,
  careItemCode: z.string(),
  careItemName: z.string(),
  active: z.boolean(),
  intervalDays: z.number().int(),
  cycleSource: cycleSourceSchema,
  defaultCycleDays: z.number().int(),
  minDays: z.number().int(),
  maxDays: z.number().int(),
  isOutOfRange: z.boolean(),
  nextDueAt: dateTime,
  startDate: date,
  guidelineVersion: z.string(),
  recordType: z.string(),
  /** 적용 조건 설명 (H04 '적용 조건'에 그대로 보여 준다) */
  description: z.string().nullish(),
  // ── 백엔드에 아직 없는 값. [백엔드 요청] 급여 먹이 이름. 목업만 준다 ──
  foodName: z.string().nullish(),
});
export type BackendPetRoutine = z.infer<typeof backendPetRoutineSchema>;

/** PATCH /routines/{id}·POST /routines/{id}/reset 응답의 routine (RoutineDetailsResult) */
export const backendRoutineDetailsSchema = z.object({
  id,
  petId: id,
  itemCode: z.string(),
  itemName: z.string(),
  intervalDays: z.number().int(),
  isEnabled: z.boolean(),
  cycleSource: cycleSourceSchema,
  startDate: date,
  nextDueAt: dateTime,
  versionLabel: z.string(),
  defaultCycleDays: z.number().int(),
  minDays: z.number().int(),
  maxDays: z.number().int(),
  isOutOfRange: z.boolean(),
  reason: routineReasonSchema.nullish(),
  reasonNote: z.string().nullish(),
  modifiedAt: dateTime.nullish(),
  foodName: z.string().nullish(),
});
export type BackendRoutineDetails = z.infer<typeof backendRoutineDetailsSchema>;

/** RoutineMutationResult */
export const backendRoutineMutationSchema = z.object({
  routine: backendRoutineDetailsSchema,
  previous: z
    .object({
      intervalDays: z.number().int(),
      isEnabled: z.boolean(),
      startDate: date,
      cycleSource: cycleSourceSchema,
      versionLabel: z.string(),
    })
    .nullish(),
});

/** 완료·건너뛰기·미루기 뒤의 루틴 상태 (RoutineState) */
export const backendRoutineStateSchema = z.object({
  id,
  lastDoneOn: date.nullable(),
  nextDueOn: date.nullable(),
});
export type BackendRoutineState = z.infer<typeof backendRoutineStateSchema>;

/** 완료·건너뛰기 응답의 record (Record. 상세 RecordResponse보다 칸이 적다) */
export const backendRecordLiteSchema = z.object({
  id,
  recordType: backendRecordTypeSchema,
  itemCode: z.string(),
  occurredAt: dateTime,
  timePrecision: timePrecisionSchema,
  outcome: backendOutcomeSchema.nullable(),
  valueNum: z.number().nullable(),
  unit: z.string().nullable(),
  reasonCode: skipReasonCodeSchema.nullable(),
  memo: z.string().nullable(),
});
export type BackendRecordLite = z.infer<typeof backendRecordLiteSchema>;

/** RoutineActionResult (POST complete·skip) */
export const backendRoutineActionSchema = z.object({
  record: backendRecordLiteSchema,
  routine: backendRoutineStateSchema,
  todayStatus: todayStatusSchema.nullable(),
});

/** RoutinePostponeResult */
export const backendRoutinePostponeSchema = z.object({ routine: backendRoutineStateSchema });

/** PATCH /routines/{id} (UpdateRoutineRequest). 보낸 칸만 바뀐다 */
export type BackendRoutineUpdate = {
  intervalDays?: number;
  isEnabled?: boolean;
  startDate?: string;
  reason?: z.infer<typeof routineReasonSchema>;
  reasonNote?: string;
  /** [백엔드 요청] 급여 먹이 이름. 스웨거에 없어 목업만 받는다 */
  foodName?: string | null;
};

/** POST /routines/{id}/complete (CompleteRoutineRequest) */
export type BackendCompleteRequest = {
  clientRequestId: string;
  occurredAt?: string | null;
  timePrecision?: "EXACT" | "DATE_ONLY" | null;
  outcome?: BackendOutcome | null;
  valueNum?: number | null;
  detail?: Record<string, unknown> | null;
  memo?: string | null;
};

/** POST /routines/{id}/skip (SkipRoutineRequest) */
export type BackendSkipRequest = {
  clientRequestId: string;
  occurredOn?: string | null;
  reasonCode?: SkipReasonCode | null;
  memo?: string | null;
};

/** POST /routines/{id}/postpone (PostponeRoutineRequest). null이면 미루기 취소 */
export type BackendPostponeRequest = { postponeTo: string | null };

// ── 오늘 할 일 ────────────────────────────────────────────

/** Task */
export const backendTaskSchema = z.object({
  routineId: id,
  itemCode: z.string(),
  itemName: z.string(),
  status: todayStatusSchema,
  dueDate: date,
  overdueDays: z.number().int().default(0),
  resultType: z.string().nullish(),
  unit: z.string().nullish(),
  lastRecord: z
    .object({
      recordId: id,
      recordType: backendRecordTypeSchema,
      occurredAt: dateTime,
      outcome: backendOutcomeSchema.nullish(),
      value: z.number().nullish(),
      unit: z.string().nullish(),
    })
    .nullish(),
  // ── 백엔드에 아직 없는 값. [백엔드 요청] 화면(D1 카드 두 번째 줄)에 필요해 목업만 준다 ──
  /** N일마다 */
  intervalDays: z.number().int().nullish(),
  /** 미룬 할 일이면 원래 예정일 */
  originalDueDate: date.nullish(),
});
export type BackendTask = z.infer<typeof backendTaskSchema>;

/** PetTasks */
export const backendPetTasksSchema = z.object({
  petId: id,
  name: z.string(),
  speciesCommonName: z.string().nullish(),
  photo: z.object({ fileId: id.nullish() }).nullish(),
  stageNotice: z.string().nullish(),
  tasks: z.array(backendTaskSchema).default([]),
});
export type BackendPetTasks = z.infer<typeof backendPetTasksSchema>;

/** GET /today (TodayResult) */
export const backendTodaySchema = z.object({
  date,
  summary: z
    .object({
      dueCount: z.number().int(),
      overdueCount: z.number().int(),
      needsResultCount: z.number().int(),
      doneCount: z.number().int(),
      skippedCount: z.number().int(),
      reportCount: z.number().int(),
    })
    .nullish(),
  emptyReason: z.enum(["NO_PETS", "NOTHING_DUE", "ALL_DONE"]).nullish(),
  nextUpcoming: z
    .object({ routineId: id, petId: id, itemCode: z.string(), dueDate: date })
    .nullish(),
  pets: z.array(backendPetTasksSchema).default([]),
});
export type BackendToday = z.infer<typeof backendTodaySchema>;

// ── 기록 ──────────────────────────────────────────────────

/** RecordResponse (상세·생성·정정·복구 응답) */
export const backendRecordSchema = z.object({
  id,
  petId: id,
  petName: z.string(),
  routineId: id.nullable(),
  itemCode: z.string(),
  itemName: z.string(),
  recordType: backendRecordTypeSchema,
  /** 스웨거 enum은 MANUAL뿐이다. [백엔드 확인 필요] 할 일 체크로 만든 기록의 source 값 */
  source: z.string(),
  occurredAt: dateTime,
  timePrecision: timePrecisionSchema,
  createdAt: dateTime,
  updatedAt: dateTime,
  outcome: backendOutcomeSchema.nullable(),
  valueNum: z.number().nullable(),
  unit: z.string().nullable(),
  /** SHED: {stage, observedDirectly}. 그 밖의 항목은 [백엔드 확인 필요] */
  detail: json.nullish(),
  memo: z.string().nullable(),
  reasonCode: skipReasonCodeSchema.nullable(),
  photo: z.object({ fileId: id, url: z.string() }).nullable(),
  standardVersionLabel: z.string().nullish(),
  revisionNo: z.number().int(),
  deletedAt: dateTime.nullable(),
  restorableUntil: dateTime.nullish(),
});
export type BackendRecord = z.infer<typeof backendRecordSchema>;

/** RevisionResponse (정정 이력 한 줄) */
export const backendRevisionSchema = z.object({
  id,
  changeType: z.enum(["EDIT", "RESULT_ADDED", "DELETE", "RESTORE"]),
  changedFields: z.array(z.string()),
  before: json.nullish(),
  after: json.nullish(),
  createdAt: dateTime,
});
export type BackendRevision = z.infer<typeof backendRevisionSchema>;

/** GET /records/{id} (RecordDetailResponse) */
export const backendRecordDetailSchema = z.object({
  record: backendRecordSchema,
  revisions: z.array(backendRevisionSchema).default([]),
});

/** 기록 생성·정정·삭제 뒤 바뀐 루틴 (RoutineUpdatedResponse) */
export const backendRoutineUpdatedSchema = z.object({
  routineId: id,
  nextDueAt: dateTime.nullable(),
});

/** POST /records·PATCH /records/{id}·POST /records/{id}/restore (RecordMutationResponse) */
export const backendRecordMutationSchema = z.object({
  record: backendRecordSchema,
  routineUpdated: backendRoutineUpdatedSchema.nullish(),
});

/** DELETE /records/{id} (DeleteRecordResponse) */
export const backendRecordDeleteSchema = z.object({
  recordId: id,
  deletedAt: dateTime,
  restorableUntil: dateTime,
  routineUpdated: backendRoutineUpdatedSchema.nullish(),
});

/** GET /records 한 줄 (RecordListItemResponse). 요약형이라 사진 주소·정정 이력이 없다 */
export const backendRecordListItemSchema = z.object({
  id,
  petId: id,
  petName: z.string(),
  itemCode: z.string(),
  itemName: z.string(),
  recordType: backendRecordTypeSchema,
  occurredAt: dateTime,
  timePrecision: timePrecisionSchema,
  createdAt: dateTime,
  outcome: backendOutcomeSchema.nullable(),
  needsResult: z.boolean(),
  valueNum: z.number().nullable(),
  unit: z.string().nullable(),
  detailSummary: z.string().nullish(),
  memoPreview: z.string().nullable(),
  reasonCode: skipReasonCodeSchema.nullable(),
  hasPhoto: z.boolean(),
  isEdited: z.boolean(),
  source: z.string(),
  deletedAt: dateTime.nullable(),
});
export type BackendRecordListItem = z.infer<typeof backendRecordListItemSchema>;

/** GET /records (RecordListResponse). occurredAt DESC, id DESC 커서 */
export const backendRecordListSchema = z.object({
  items: z.array(backendRecordListItemSchema),
  nextCursor: z.string().nullable(),
  lastFeeding: z
    .object({ petId: id, recordId: id, occurredAt: dateTime, outcome: backendOutcomeSchema })
    .nullish(),
});

/** GET /records 조건 */
export type BackendRecordQuery = {
  petId?: number;
  /** 쉼표로 이은 itemCode */
  itemCodes?: string;
  recordType?: "DONE" | "SKIPPED";
  from?: string;
  to?: string;
  includeDeleted?: boolean;
  cursor?: string;
  /** 1~50 */
  size?: number;
};

/** POST /records (CreateRecordRequest) */
export type BackendRecordCreate = {
  clientRequestId: string;
  petId: number;
  itemCode: string;
  occurredAt: string;
  timePrecision?: "EXACT" | "DATE_ONLY" | null;
  outcome?: BackendOutcome | null;
  valueNum?: number | null;
  detail?: Record<string, unknown> | null;
  memo?: string | null;
  photoFileId?: number | null;
  uxDurationMs?: number | null;
};

/** PATCH /records/{id} (UpdateRecordRequest). revisionNo로 낙관적 잠금 */
export type BackendRecordUpdate = { revisionNo: number } & Partial<
  Pick<
    BackendRecordCreate,
    "occurredAt" | "timePrecision" | "outcome" | "valueNum" | "detail" | "memo" | "photoFileId"
  >
>;

// ── 관리 가이드라인 ───────────────────────────────────────

/** CareItemStandard */
export const backendCareItemStandardSchema = z.object({
  careItemCode: z.string(),
  careItemName: z.string(),
  defaultCycleDays: z.number().int(),
  minDays: z.number().int(),
  maxDays: z.number().int(),
  defaultEnabled: z.boolean(),
  recordType: z.string().nullish(),
  feedResultSet: z.string().nullish(),
  defaultFoodName: z.string().nullish(),
  /** [백엔드 확인 필요] 값 목록과 '권고/참고 정보' 대응이 스웨거에 없다 */
  evidenceLevel: z.string().nullish(),
  sourceRefs: z.string().nullish(),
  description: z.string().nullish(),
});
export type BackendCareItemStandard = z.infer<typeof backendCareItemStandardSchema>;

/** GET /species/{id}/care-standards (SpeciesCareStandardsResult) */
export const backendCareStandardsSchema = z.object({
  guidelineVersion: z.string(),
  speciesId: id,
  speciesCode: z.string(),
  speciesName: z.string(),
  lifeStages: z.array(
    z.object({
      lifeStage: z.string(),
      appliedLifeStage: z.string().nullish(),
      careItems: z.array(backendCareItemStandardSchema).default([]),
    }),
  ),
});
export type BackendCareStandards = z.infer<typeof backendCareStandardsSchema>;

// ── 파일 ──────────────────────────────────────────────────

/** POST /files 응답 data (스웨거 예시 값 기준. 스키마는 ApiResponseBody라 칸이 명시돼 있지 않다) */
export const backendFileSchema = z.object({
  id,
  url: z.string(),
  purpose: z.string().nullish(),
  contentType: z.string().nullish(),
  sizeBytes: z.number().int().nullish(),
  width: z.number().int().nullish(),
  height: z.number().int().nullish(),
  status: z.string().nullish(),
  tempExpiresAt: dateTime.nullish(),
});

/** GET /files/{id} 응답 data (10분 동안 쓸 수 있는 주소) */
export const backendFileUrlSchema = z.object({
  url: z.string(),
  expiresAt: dateTime.nullish(),
  contentType: z.string().nullish(),
});

// ── 서버 상태 ─────────────────────────────────────────────

/** GET /health (HealthResponse). 봉투 없이 바로 온다. 503이면 status가 UP이 아니다 */
export const backendHealthSchema = z.object({ status: z.string() });
