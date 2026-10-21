import { format, parseISO } from "date-fns";
import {
  CARE_ITEM_CODE,
  invert,
  LIFE_STAGE_CODE_OF,
  OUTCOME_CODE,
  SKIP_REASON_CODE,
  type BackendCareStandards,
  type BackendCompleteRequest,
  type BackendPetRoutine,
  type BackendRecord,
  type BackendRecordCreate,
  type BackendRecordLite,
  type BackendRecordListItem,
  type BackendRecordQuery,
  type BackendRecordUpdate,
  type BackendRevision,
  type BackendRoutineDetails,
  type BackendRoutineState,
  type BackendRoutineUpdate,
  type BackendSkipRequest,
  type BackendTask,
  type BackendToday,
  type TodayStatus,
} from "@/shared/domain/backend";
import {
  careTitle,
  INTAKE_LABEL,
  ROUTINE_CARE_ITEMS,
  SKIP_REASONS,
  type CareItem,
  type RoutineCareItem,
} from "@/shared/domain/care";
import type {
  CareRecord,
  CompleteInput,
  RecordCreateInput,
  RecordQuery,
  RecordUpdateInput,
  RoutineActionResult,
  RoutineState,
} from "@/shared/domain/record";
import type { Routine, RoutineUpdateInput } from "@/shared/domain/routine";
import type { CareStandard, CareStandardTable, SpeciesId } from "@/shared/domain/species";
import type { Task, TaskState, Today } from "@/shared/domain/today";

/**
 * 백엔드 모양(숫자 ID·대문자 코드) ↔ 화면 도메인 모양(문자열 ID·소문자 값).
 * 화면은 도메인 모양만 알고, 백엔드가 바뀌면 이 파일과 src/shared/domain/backend.ts만 고친다.
 * 개체·종 변환은 src/shared/domain/pet.ts·species.ts에 있다.
 */

const CARE_ITEM_OF = invert(CARE_ITEM_CODE);
const INTAKE_OF = invert(OUTCOME_CODE);
const SKIP_REASON_OF = invert(SKIP_REASON_CODE);

const toIso = (value: string) => new Date(value).toISOString();
const toYmd = (value: string) => format(parseISO(value), "yyyy-MM-dd");
const toId = (value: number | null | undefined) =>
  value === null || value === undefined ? null : String(value);
const toNumber = (value: string | null | undefined) =>
  value === null || value === undefined ? null : Number(value);

export function newRequestId() {
  return crypto.randomUUID();
}

/** 백엔드 관리 항목 코드 → 앱 항목. 모르는 코드면 바로 드러나게 던진다 */
function careItemOf(code: string): CareItem {
  const item = CARE_ITEM_OF[code];
  if (!item) throw new Error(`알 수 없는 관리 항목 코드예요 (${code})`);
  return item;
}

function routineCareItemOf(code: string): RoutineCareItem {
  const item = careItemOf(code);
  if (!(ROUTINE_CARE_ITEMS as readonly string[]).includes(item)) {
    throw new Error(`일정으로 쓸 수 없는 관리 항목이에요 (${code})`);
  }
  return item as RoutineCareItem;
}

// ── 관리 루틴 ─────────────────────────────────────────────

type RoutineFields = {
  id: number;
  petId: number;
  careItemCode: string;
  intervalDays: number;
  defaultCycleDays: number;
  cycleSource: "GUIDELINE" | "USER_CUSTOM";
  enabled: boolean;
  startDate: string;
  nextDueAt: string;
  version: string;
  description: string | null | undefined;
  foodName: string | null | undefined;
};

function routineOf(raw: RoutineFields): Routine {
  return {
    id: String(raw.id),
    petId: String(raw.petId),
    careItem: routineCareItemOf(raw.careItemCode),
    intervalDays: raw.intervalDays,
    standardIntervalDays: raw.defaultCycleDays,
    customized: raw.cycleSource === "USER_CUSTOM",
    enabled: raw.enabled,
    startDate: raw.startDate,
    foodName: raw.foodName ?? null,
    nextDueOn: toYmd(raw.nextDueAt),
    // 미룬 날짜·원래 예정일은 루틴 응답에 없다 [백엔드 확인 필요]. 오늘 할 일(Task)에서만 보인다
    postponedTo: null,
    originalDueOn: null,
    basis: {
      // 권고/참고 구분은 백엔드 응답에 없어 모두 '참고 정보' [백엔드 확인 필요]
      label: "reference",
      condition: raw.description ?? "",
      sourceText: null,
      version: raw.version,
    },
  };
}

/** GET /pets/{id}/routines 한 줄 → 앱 일정 */
export const toRoutine = (raw: BackendPetRoutine): Routine =>
  routineOf({
    id: raw.routineId,
    petId: raw.petId,
    careItemCode: raw.careItemCode,
    intervalDays: raw.intervalDays,
    defaultCycleDays: raw.defaultCycleDays,
    cycleSource: raw.cycleSource,
    enabled: raw.active,
    startDate: raw.startDate,
    nextDueAt: raw.nextDueAt,
    version: raw.guidelineVersion,
    description: raw.description,
    foodName: raw.foodName,
  });

/** PATCH /routines/{id}·reset 응답의 routine → 앱 일정 (적용 조건 설명은 없다) */
export const toRoutineFromDetails = (raw: BackendRoutineDetails): Routine =>
  routineOf({
    id: raw.id,
    petId: raw.petId,
    careItemCode: raw.itemCode,
    intervalDays: raw.intervalDays,
    defaultCycleDays: raw.defaultCycleDays,
    cycleSource: raw.cycleSource,
    enabled: raw.isEnabled,
    startDate: raw.startDate,
    nextDueAt: raw.nextDueAt,
    version: raw.versionLabel,
    description: null,
    foodName: raw.foodName,
  });

export const toRoutineState = (raw: BackendRoutineState): RoutineState => ({
  id: String(raw.id),
  lastDoneOn: raw.lastDoneOn,
  nextDueOn: raw.nextDueOn,
});

export function toRoutineUpdate(input: RoutineUpdateInput): BackendRoutineUpdate {
  const out: BackendRoutineUpdate = {};
  if (input.intervalDays !== undefined) out.intervalDays = input.intervalDays;
  if (input.enabled !== undefined) out.isEnabled = input.enabled;
  // 앱의 reason은 자유 글인데 백엔드 reason은 enum이라, 글은 reasonNote(100자)로 보낸다 [백엔드 확인 필요]
  if (input.reason) out.reasonNote = input.reason.slice(0, 100);
  if (input.foodName !== undefined) out.foodName = input.foodName;
  return out;
}

export function toCompleteRequest(input: CompleteInput): BackendCompleteRequest {
  return {
    clientRequestId: newRequestId(),
    occurredAt: input.occurredAt ?? null,
    timePrecision: "EXACT",
    outcome: input.intake ? OUTCOME_CODE[input.intake] : null,
    valueNum: input.weightG ?? null,
    memo: input.memo ?? null,
  };
}

/** 건너뛰기 이유 칩은 reasonCode로, 칩에 없는 글은 OTHER + memo로 */
export function toSkipRequest(reason: string | null): BackendSkipRequest {
  const known = (SKIP_REASONS as readonly string[]).includes(reason ?? "")
    ? SKIP_REASON_CODE[reason as (typeof SKIP_REASONS)[number]]
    : null;
  return {
    clientRequestId: newRequestId(),
    reasonCode: reason ? (known ?? "OTHER") : null,
    memo: reason && !known ? reason.slice(0, 200) : null,
  };
}

const skipReasonOf = (code: BackendRecordLite["reasonCode"], memo: string | null) =>
  code ? (code === "OTHER" && memo ? memo : SKIP_REASON_OF[code]) : null;

/** POST complete·skip 응답 → 기록 요약 + 루틴 상태 */
export function toRoutineActionResult(raw: {
  record: BackendRecordLite;
  routine: BackendRoutineState;
  todayStatus: TodayStatus | null;
}): RoutineActionResult {
  const careItem = careItemOf(raw.record.itemCode);
  const skipped = raw.record.recordType === "SKIPPED";
  return {
    record: {
      id: String(raw.record.id),
      careItem,
      type: skipped ? "skipped" : "done",
      occurredAt: toIso(raw.record.occurredAt),
      intake: raw.record.outcome ? INTAKE_OF[raw.record.outcome] : null,
      weightG: careItem === "weight" ? raw.record.valueNum : null,
      memo: skipped ? null : raw.record.memo,
      skipReason: skipped ? skipReasonOf(raw.record.reasonCode, raw.record.memo) : null,
    },
    routine: toRoutineState(raw.routine),
    // 오늘 기준이라 planned는 나오지 않는다
    todayState: raw.todayStatus
      ? (taskStateOf(raw.todayStatus, false) as RoutineActionResult["todayState"])
      : null,
  };
}

// ── 오늘 할 일 ────────────────────────────────────────────

/** NEEDS_RESULT는 체크는 했지만 결과(먹은 정도)를 아직 안 적은 것이라 완료로 본다 */
function taskStateOf(status: TodayStatus, future: boolean): TaskState {
  if (status === "DONE" || status === "NEEDS_RESULT") return "done";
  if (status === "SKIPPED") return "skipped";
  return future ? "planned" : "todo";
}

function toTask(pet: { petId: number; name: string }, raw: BackendTask, future: boolean): Task {
  const careItem = routineCareItemOf(raw.itemCode);
  const state = taskStateOf(raw.status, future);
  const last = raw.lastRecord;
  return {
    routineId: String(raw.routineId),
    petId: String(pet.petId),
    petName: pet.name,
    careItem,
    // 먹이 이름은 오늘 할 일 응답에 없어 항목 이름만 (급여 · 먹이 이름은 일정 화면에서) [백엔드 확인 필요]
    title: careTitle(careItem),
    intervalDays: raw.intervalDays ?? null,
    dueOn: raw.dueDate,
    originalDueOn: raw.originalDueDate ?? null,
    overdueDays: state === "todo" ? Math.max(0, raw.overdueDays) : 0,
    state,
    record:
      (state === "done" || state === "skipped") && last
        ? {
            id: String(last.recordId),
            occurredAt: toIso(last.occurredAt),
            intake: last.outcome ? INTAKE_OF[last.outcome] : null,
            weightG: careItem === "weight" ? (last.value ?? null) : null,
            // 건너뛴 이유는 lastRecord에 없다 [백엔드 확인 필요]
            skipReason: null,
          }
        : null,
  };
}

const TASK_ORDER: Record<TaskState, number> = { todo: 0, planned: 0, done: 1, skipped: 2 };

/** GET /today → 앱 오늘 할 일. 앞 날짜를 조회했으면 할 일을 '예정'으로 */
export function toToday(raw: BackendToday, today = format(new Date(), "yyyy-MM-dd")): Today {
  const future = raw.date > today;
  const items = raw.pets.flatMap((pet) => pet.tasks.map((task) => toTask(pet, task, future)));
  items.sort(
    (a, b) =>
      TASK_ORDER[a.state] - TASK_ORDER[b.state] ||
      b.overdueDays - a.overdueDays ||
      a.petName.localeCompare(b.petName) ||
      ROUTINE_CARE_ITEMS.indexOf(a.careItem) - ROUTINE_CARE_ITEMS.indexOf(b.careItem),
  );
  return { date: raw.date, items };
}

// ── 기록 ──────────────────────────────────────────────────

const text = (value: unknown) => (typeof value === "string" && value ? value : null);

const FIELD_LABEL: Record<string, string> = {
  occurredAt: "시각",
  timePrecision: "시각",
  outcome: "먹은 정도",
  valueNum: "값",
  memo: "메모",
  photoFileId: "사진",
  detail: "상세",
};

const CHANGE_LABEL: Record<BackendRevision["changeType"], string> = {
  EDIT: "정정",
  RESULT_ADDED: "결과 추가",
  DELETE: "삭제",
  RESTORE: "복구",
};

function formatValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "없음";
  if (field === "occurredAt" && typeof value === "string") {
    return format(parseISO(value), "M/d HH:mm");
  }
  if (field === "outcome" && typeof value === "string" && value in INTAKE_OF) {
    return INTAKE_LABEL[INTAKE_OF[value as keyof typeof INTAKE_OF]];
  }
  if (field === "memo") return `${String(value).length}자`;
  if (field === "photoFileId") return "있음";
  return String(value);
}

/** 정정 이력 한 줄: '시각 10/20 20:05 → 10/19 20:05 · 메모 없음 → 12자' */
function toRevision(revision: BackendRevision) {
  const parts = revision.changedFields.map((field) => {
    const label = FIELD_LABEL[field] ?? field;
    const before = revision.before?.[field];
    const after = revision.after?.[field];
    if (before === undefined && after === undefined) return label;
    return `${label} ${formatValue(field, before)} → ${formatValue(field, after)}`;
  });
  return {
    at: toIso(revision.createdAt),
    summary: parts.join(" · ") || CHANGE_LABEL[revision.changeType],
  };
}

/** 스웨거 source enum은 MANUAL뿐이라, 그 밖의 값(할 일 체크)은 routine으로 본다 [백엔드 확인 필요] */
const methodOf = (source: string) => (source === "MANUAL" ? "manual" : "routine");

export function toCareRecord(raw: BackendRecord, revisions: BackendRevision[] = []): CareRecord {
  const careItem = careItemOf(raw.itemCode);
  const skipped = raw.recordType === "SKIPPED";
  return {
    id: String(raw.id),
    petId: String(raw.petId),
    petName: raw.petName,
    routineId: toId(raw.routineId),
    careItem,
    type: skipped ? "skipped" : "done",
    method: methodOf(raw.source),
    occurredAt: toIso(raw.occurredAt),
    createdAt: toIso(raw.createdAt),
    intake: raw.outcome ? INTAKE_OF[raw.outcome] : null,
    weightG: careItem === "weight" ? raw.valueNum : null,
    memo: skipped ? null : raw.memo,
    // 먹이 이름은 기록 응답에 따로 없다 [백엔드 확인 필요]. detail에 오면 쓴다
    foodName: text(raw.detail?.foodName),
    skipReason: skipped ? skipReasonOf(raw.reasonCode, raw.memo) : null,
    photos: raw.photo ? [{ id: String(raw.photo.fileId), url: raw.photo.url }] : [],
    revisions: revisions
      .filter((r) => r.changeType === "EDIT" || r.changeType === "RESULT_ADDED")
      .map(toRevision),
    revisionNo: raw.revisionNo,
  };
}

/** 목록 아이템은 요약형이라 사진 주소·정정 이력이 없다. 사진이 있으면 endpoints가 상세를 부른다 */
export function toCareRecordFromListItem(raw: BackendRecordListItem): CareRecord {
  const careItem = careItemOf(raw.itemCode);
  const skipped = raw.recordType === "SKIPPED";
  return {
    id: String(raw.id),
    petId: String(raw.petId),
    petName: raw.petName,
    routineId: null,
    careItem,
    type: skipped ? "skipped" : "done",
    method: methodOf(raw.source),
    occurredAt: toIso(raw.occurredAt),
    createdAt: toIso(raw.createdAt),
    intake: raw.outcome ? INTAKE_OF[raw.outcome] : null,
    weightG: careItem === "weight" ? raw.valueNum : null,
    memo: skipped ? null : raw.memoPreview,
    foodName: null,
    skipReason: skipped ? skipReasonOf(raw.reasonCode, raw.memoPreview) : null,
    photos: [],
    revisions: [],
    revisionNo: null,
  };
}

export function toRecordQuery(query: RecordQuery, size: number): BackendRecordQuery {
  return {
    petId: toNumber(query.petId) ?? undefined,
    itemCodes: query.careItem ? CARE_ITEM_CODE[query.careItem] : undefined,
    from: query.from,
    to: query.to,
    cursor: query.cursor,
    size,
  };
}

export function toRecordCreate(input: RecordCreateInput): BackendRecordCreate {
  return {
    clientRequestId: newRequestId(),
    petId: Number(input.petId),
    itemCode: CARE_ITEM_CODE[input.careItem],
    occurredAt: input.occurredAt,
    timePrecision: "EXACT",
    outcome: input.intake ? OUTCOME_CODE[input.intake] : null,
    valueNum: input.weightG ?? null,
    memo: input.memo ?? null,
    // 백엔드는 기록당 사진 한 장
    photoFileId: toNumber(input.photoFileIds?.[0]),
  };
}

export function toRecordUpdate(revisionNo: number, input: RecordUpdateInput): BackendRecordUpdate {
  const out: BackendRecordUpdate = { revisionNo };
  if (input.occurredAt !== undefined) out.occurredAt = input.occurredAt;
  if (input.intake !== undefined) out.outcome = input.intake ? OUTCOME_CODE[input.intake] : null;
  if (input.weightG !== undefined) out.valueNum = input.weightG;
  if (input.memo !== undefined) out.memo = input.memo;
  if (input.photoFileIds !== undefined) out.photoFileId = toNumber(input.photoFileIds[0]);
  return out;
}

// ── 관리 가이드라인 ───────────────────────────────────────

/**
 * GET /species/{id}/care-standards → 기준표. 앱이 일정으로 쓰지 않는 항목(메모·모르는 코드)과
 * 앱에 없는 생애 단계는 표에서 뺀다
 */
export function toCareStandardTable(
  raw: BackendCareStandards,
  speciesId: SpeciesId,
): CareStandardTable {
  const standards: CareStandard[] = raw.lifeStages.flatMap((stage) => {
    const lifeStageCode = LIFE_STAGE_CODE_OF[stage.lifeStage];
    if (!lifeStageCode) return [];
    return stage.careItems.flatMap((item) => {
      const careItem = CARE_ITEM_OF[item.careItemCode];
      if (!careItem || !(ROUTINE_CARE_ITEMS as readonly string[]).includes(careItem)) return [];
      return [
        {
          lifeStageCode,
          careItem: careItem as RoutineCareItem,
          intervalDays: item.defaultCycleDays,
          minDays: item.minDays,
          maxDays: item.maxDays,
          // evidenceLevel ↔ 권고/참고 대응이 정해지지 않아 모두 '참고 정보' [백엔드 확인 필요]
          label: "reference" as const,
          description: item.description ?? null,
        },
      ];
    });
  });
  const sources = new Set(
    raw.lifeStages.flatMap((s) => s.careItems.map((i) => i.sourceRefs?.trim() || "")),
  );
  sources.delete("");
  return {
    speciesId,
    version: raw.guidelineVersion,
    effectiveFrom: null,
    isDraft: false,
    standards,
    references: [...sources].map((title) => ({ title, url: null })),
    reviewNote: null,
  };
}
