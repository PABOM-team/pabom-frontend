import { addDays, parseISO } from "date-fns";
import {
  CARE_ITEM_CODE,
  invert,
  OUTCOME_CODE,
  SKIP_REASON_CODE,
  type BackendOutcome,
  type BackendPetRoutine,
  type BackendRecord,
  type BackendRecordListItem,
  type BackendRecordLite,
  type BackendRevision,
  type BackendRoutineDetails,
  type BackendRoutineState,
  type BackendTask,
  type BackendToday,
  type SkipReasonCode,
  type TodayStatus,
} from "@/shared/domain/backend";
import { CARE_ITEM_LABEL, INTAKE_LABEL, ROUTINE_LABEL, SKIP_REASONS } from "@/shared/domain/care";
import type { z } from "zod";
import { lifeStageIdOf, petResponseSchema, toServerSex } from "@/shared/domain/pet";
import { LIFE_STAGE_UNKNOWN_ID, SPECIES_LABEL } from "@/shared/domain/species";
import type { Task } from "@/shared/domain/today";
import { CARE_STANDARD_VERSION, intervalRange, MORPHS, RECORD_TYPE_CODE, serverIdOf } from "./data";
import { db, type DbPet, type DbRecord, type DbRoutine } from "./db";
import {
  buildToday,
  dueOf,
  lastDoneOf,
  revisionNoOf,
  serializePet,
  stageCodeOf,
  stageNameOf,
} from "./logic";

/**
 * 목업 DB → 백엔드 응답 모양 (스웨거 components.schemas와 같은 칸 이름·대문자 코드·숫자 ID).
 * 화면용 모양으로 바꾸는 건 프론트 어댑터(src/shared/api/adapters.ts)가 하므로,
 * 목업 모드와 라이브 모드가 같은 어댑터를 탄다.
 */

export const CARE_ITEM_OF = invert(CARE_ITEM_CODE);
export const INTAKE_OF = invert(OUTCOME_CODE);
const SKIP_REASON_OF = invert(SKIP_REASON_CODE);

/** 스웨거 enum은 MANUAL뿐. 할 일 체크로 만든 기록은 ROUTINE으로 준다 [백엔드 확인 필요] */
const SOURCE = { manual: "MANUAL", routine: "ROUTINE" } as const;

/** 자정 기준 시각. 어댑터가 날짜만 꺼낸다 */
const atMidnight = (ymd: string) => parseISO(`${ymd}T00:00:00`).toISOString();

// ── 개체 ──────────────────────────────────────────────────

/** 백엔드가 보내는 모양 (zod 변환 전) */
type PetWire = z.input<typeof petResponseSchema>;

/**
 * PetResponse. 상태·오늘 할 일 수·기록 수는 백엔드에 아직 없지만 목업 화면을 위해 같이 준다
 * (petResponseSchema의 임시 값 칸)
 */
export function wirePet(pet: DbPet): PetWire {
  const serverId = serverIdOf(pet.speciesId);
  const morph = MORPHS[serverId]?.find((m) => m.name === pet.morph);
  const { status, endReason, endedOn, todayRemaining, recordCount, firstRecordOn } =
    serializePet(pet);
  const lifeStageId = lifeStageIdOf(stageCodeOf(pet));
  return {
    id: Number(pet.id),
    speciesId: serverId,
    name: pet.name,
    morphs: morph ? [{ id: morph.id, code: morph.code, name: morph.name }] : [],
    customMorph: morph ? null : pet.morph,
    hatchedAt: pet.hatchedOn,
    adoptedAt: pet.acquiredOn,
    // 해츨링은 백엔드 ID가 없어 UNKNOWN(4)으로 (LIFE_STAGES 참고)
    lifeStageId: lifeStageId ?? (pet.manualStageCode ? LIFE_STAGE_UNKNOWN_ID : null),
    stageCertainty:
      lifeStageId === null
        ? "UNKNOWN"
        : pet.manualStageCode && pet.stageUncertain
          ? "ESTIMATED"
          : "CONFIRMED",
    sex: toServerSex(pet.sex),
    photoFileId: pet.photoFileId ? Number(pet.photoFileId) : null,
    createdAt: pet.createdAt,
    status,
    endReason,
    endedOn,
    todayRemaining,
    recordCount,
    firstRecordOn,
  };
}

// ── 관리 루틴 ─────────────────────────────────────────────

const petOf = (routine: DbRoutine) => db.pets.find((p) => p.id === routine.petId)!;

/** PetRoutineResult (GET /pets/{id}/routines) */
export function wireRoutine(routine: DbRoutine): BackendPetRoutine {
  const pet = petOf(routine);
  return {
    routineId: Number(routine.id),
    petId: Number(routine.petId),
    careItemCode: CARE_ITEM_CODE[routine.careItem],
    careItemName: ROUTINE_LABEL[routine.careItem],
    active: routine.enabled,
    intervalDays: routine.intervalDays,
    cycleSource:
      routine.intervalDays === routine.standardIntervalDays ? "GUIDELINE" : "USER_CUSTOM",
    defaultCycleDays: routine.standardIntervalDays,
    ...intervalRange(routine.standardIntervalDays),
    isOutOfRange: false,
    nextDueAt: atMidnight(dueOf(routine).dueOn),
    startDate: routine.startDate,
    guidelineVersion: CARE_STANDARD_VERSION,
    recordType: RECORD_TYPE_CODE[routine.careItem],
    description: `${SPECIES_LABEL[pet.speciesId]} · ${stageNameOf(pet)}`,
    foodName: routine.foodName,
  };
}

/** RoutineDetailsResult (PATCH /routines/{id}·reset 응답의 routine) */
export function wireRoutineDetails(routine: DbRoutine): BackendRoutineDetails {
  return {
    id: Number(routine.id),
    petId: Number(routine.petId),
    itemCode: CARE_ITEM_CODE[routine.careItem],
    itemName: ROUTINE_LABEL[routine.careItem],
    intervalDays: routine.intervalDays,
    isEnabled: routine.enabled,
    cycleSource:
      routine.intervalDays === routine.standardIntervalDays ? "GUIDELINE" : "USER_CUSTOM",
    startDate: routine.startDate,
    nextDueAt: atMidnight(dueOf(routine).dueOn),
    versionLabel: CARE_STANDARD_VERSION,
    defaultCycleDays: routine.standardIntervalDays,
    ...intervalRange(routine.standardIntervalDays),
    isOutOfRange: false,
    reason: null,
    reasonNote: routine.reason,
    modifiedAt: new Date().toISOString(),
    foodName: routine.foodName,
  };
}

/** RoutineState (완료·건너뛰기·미루기 응답) */
export const wireRoutineState = (routine: DbRoutine): BackendRoutineState => ({
  id: Number(routine.id),
  lastDoneOn: lastDoneOf(routine),
  nextDueOn: dueOf(routine).dueOn,
});

/** Record (완료·건너뛰기 응답의 record. 상세보다 칸이 적다) */
export function wireRecordLite(record: DbRecord): BackendRecordLite {
  return {
    id: Number(record.id),
    recordType: record.type === "done" ? "DONE" : "SKIPPED",
    itemCode: CARE_ITEM_CODE[record.careItem],
    occurredAt: record.occurredAt,
    timePrecision: "EXACT",
    outcome: toOutcome(record),
    valueNum: record.weightG,
    unit: record.weightG === null ? null : "g",
    reasonCode: skipReasonCodeOf(record),
    memo: record.type === "skipped" ? skipMemoOf(record) : record.memo,
  };
}

// ── 오늘 할 일 ────────────────────────────────────────────

function todayStatusOf(task: Task): TodayStatus {
  if (task.state === "done") {
    return task.careItem === "feeding" && !task.record?.intake ? "NEEDS_RESULT" : "DONE";
  }
  if (task.state === "skipped") return "SKIPPED";
  return task.overdueDays > 0 ? "OVERDUE" : "DUE";
}

function wireTask(task: Task): BackendTask {
  const record = task.record;
  return {
    routineId: Number(task.routineId),
    itemCode: CARE_ITEM_CODE[task.careItem],
    itemName: ROUTINE_LABEL[task.careItem],
    status: todayStatusOf(task),
    dueDate: task.dueOn,
    overdueDays: task.overdueDays,
    resultType: RECORD_TYPE_CODE[task.careItem],
    unit: task.careItem === "weight" ? "g" : null,
    lastRecord: record
      ? {
          recordId: Number(record.id),
          recordType: task.state === "skipped" ? "SKIPPED" : "DONE",
          occurredAt: record.occurredAt,
          outcome: record.intake ? OUTCOME_CODE[record.intake] : null,
          value: record.weightG,
          unit: record.weightG === null ? null : "g",
        }
      : null,
    // 백엔드에 아직 없는 값 (backend.ts의 [백엔드 요청] 칸)
    intervalDays: task.intervalDays,
    originalDueDate: task.originalDueOn,
  };
}

/** TodayResult (GET /today) */
export function wireToday(userId: string, date: string, petId?: string): BackendToday {
  const { items } = buildToday(userId, date, petId);
  const pets = db.pets.filter(
    (p) =>
      p.userId === userId && p.status === "active" && !p.deletedAt && (!petId || p.id === petId),
  );
  const count = (state: Task["state"], extra: (t: Task) => boolean = () => true) =>
    items.filter((t) => t.state === state && extra(t)).length;
  const todo = count("todo") + count("planned");
  return {
    date,
    summary: {
      dueCount: count("todo", (t) => t.overdueDays === 0) + count("planned"),
      overdueCount: count("todo", (t) => t.overdueDays > 0),
      needsResultCount: items.filter((t) => todayStatusOf(t) === "NEEDS_RESULT").length,
      doneCount: count("done"),
      skippedCount: count("skipped"),
      reportCount: 0,
    },
    emptyReason:
      pets.length === 0
        ? "NO_PETS"
        : items.length === 0
          ? "NOTHING_DUE"
          : todo === 0
            ? "ALL_DONE"
            : null,
    nextUpcoming: null,
    pets: pets.map((pet) => ({
      petId: Number(pet.id),
      name: pet.name,
      speciesCommonName: SPECIES_LABEL[pet.speciesId],
      photo: pet.photoFileId ? { fileId: Number(pet.photoFileId) } : null,
      stageNotice: null,
      tasks: items.filter((t) => t.petId === pet.id).map(wireTask),
    })),
  };
}

// ── 기록 ──────────────────────────────────────────────────

const toOutcome = (record: DbRecord): BackendOutcome | null =>
  record.intake ? OUTCOME_CODE[record.intake] : null;

/** 건너뛴 이유 칩은 코드로, 칩에 없는 글은 OTHER + memo로 (어댑터 toSkipRequest와 반대) */
function skipReasonCodeOf(record: DbRecord): SkipReasonCode | null {
  if (record.type !== "skipped" || !record.skipReason) return null;
  return (SKIP_REASONS as readonly string[]).includes(record.skipReason)
    ? SKIP_REASON_CODE[record.skipReason as (typeof SKIP_REASONS)[number]]
    : "OTHER";
}

/** 칩에 없는 자유 글만 memo로 */
const skipMemoOf = (record: DbRecord) =>
  record.type === "skipped" &&
  record.skipReason &&
  !(SKIP_REASONS as readonly string[]).includes(record.skipReason)
    ? record.skipReason
    : null;

/** 건너뛰기 요청(reasonCode·memo) → 목업 DB의 skipReason 글 */
export function skipReasonOf(
  reasonCode: SkipReasonCode | null | undefined,
  memo: string | null | undefined,
) {
  if (!reasonCode) return null;
  return reasonCode === "OTHER" && memo ? memo : SKIP_REASON_OF[reasonCode];
}

/** RecordResponse (상세·생성·정정·복구) */
export function wireRecord(record: DbRecord): BackendRecord {
  const pet = db.pets.find((p) => p.id === record.petId);
  const photoId = record.photoIds[0];
  const photoUrl = photoId ? db.files.find((f) => f.id === photoId)?.url : null;
  const skipped = record.type === "skipped";
  return {
    id: Number(record.id),
    petId: Number(record.petId),
    petName: pet?.name ?? "",
    routineId: record.routineId ? Number(record.routineId) : null,
    itemCode: CARE_ITEM_CODE[record.careItem],
    itemName: CARE_ITEM_LABEL[record.careItem],
    recordType: skipped ? "SKIPPED" : "DONE",
    source: SOURCE[record.method],
    occurredAt: record.occurredAt,
    timePrecision: "EXACT",
    createdAt: record.createdAt,
    updatedAt: record.revisions.at(-1)?.at ?? record.createdAt,
    outcome: toOutcome(record),
    valueNum: record.weightG,
    unit: record.weightG === null ? null : "g",
    detail: record.foodName ? { foodName: record.foodName } : null,
    memo: skipped ? skipMemoOf(record) : record.memo,
    reasonCode: skipReasonCodeOf(record),
    photo: photoId && photoUrl ? { fileId: Number(photoId), url: photoUrl } : null,
    standardVersionLabel: CARE_STANDARD_VERSION,
    revisionNo: revisionNoOf(record),
    deletedAt: record.deletedAt,
    restorableUntil: record.deletedAt ? restorableUntil(record.deletedAt) : null,
  };
}

/** RevisionResponse 목록. 목업은 정정(EDIT)만 남긴다 */
export function wireRevisions(record: DbRecord): BackendRevision[] {
  return record.revisions.map((r, i) => ({
    id: i + 1,
    changeType: "EDIT",
    changedFields: r.changedFields,
    before: r.before,
    after: r.after,
    createdAt: r.at,
  }));
}

/** RecordListItemResponse (GET /records 한 줄) */
export function wireRecordListItem(record: DbRecord): BackendRecordListItem {
  const pet = db.pets.find((p) => p.id === record.petId);
  const skipped = record.type === "skipped";
  return {
    id: Number(record.id),
    petId: Number(record.petId),
    petName: pet?.name ?? "",
    itemCode: CARE_ITEM_CODE[record.careItem],
    itemName: CARE_ITEM_LABEL[record.careItem],
    recordType: skipped ? "SKIPPED" : "DONE",
    occurredAt: record.occurredAt,
    timePrecision: "EXACT",
    createdAt: record.createdAt,
    outcome: toOutcome(record),
    needsResult: record.careItem === "feeding" && record.type === "done" && !record.intake,
    valueNum: record.weightG,
    unit: record.weightG === null ? null : "g",
    detailSummary: record.intake ? INTAKE_LABEL[record.intake] : "",
    memoPreview: skipped ? skipMemoOf(record) : record.memo,
    reasonCode: skipReasonCodeOf(record),
    hasPhoto: record.photoIds.length > 0,
    isEdited: record.revisions.length > 0,
    source: SOURCE[record.method],
    deletedAt: record.deletedAt,
  };
}

/** 기록 정정에서 비교하는 칸 (백엔드 칸 이름) */
export function recordFields(record: DbRecord): Record<string, unknown> {
  return {
    occurredAt: record.occurredAt,
    outcome: toOutcome(record),
    valueNum: record.weightG,
    memo: record.memo,
    photoFileId: record.photoIds[0] ? Number(record.photoIds[0]) : null,
  };
}

/** 삭제한 기록은 30일 안에 복구할 수 있다 */
export const restorableUntil = (deletedAt: string) =>
  addDays(parseISO(deletedAt), 30).toISOString();
