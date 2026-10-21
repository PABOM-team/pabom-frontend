import { z } from "zod";
import { env } from "@/shared/config/env";
import {
  backendCareStandardsSchema,
  backendFileSchema,
  backendFileUrlSchema,
  backendHealthSchema,
  backendPetRoutineSchema,
  backendRecordDeleteSchema,
  backendRecordDetailSchema,
  backendRecordListSchema,
  backendRecordMutationSchema,
  backendRoutineActionSchema,
  backendRoutineMutationSchema,
  backendRoutinePostponeSchema,
  backendTodaySchema,
  FILE_PURPOSE,
  type FilePurpose,
} from "@/shared/domain/backend";
import { successEnvelope } from "@/shared/domain/envelope";
import {
  handoverCardSchema,
  handoverPreviewSchema,
  type HandoverAcceptInput,
  type HandoverScope,
} from "@/shared/domain/handover";
import {
  petResponseSchema,
  petSchema,
  toPet,
  type Pet,
  type PetCreateInput,
  type PetResponse,
  type PetStatus,
  type PetStatusChangeInput,
  type PetUpdateInput,
} from "@/shared/domain/pet";
import type {
  CareRecord,
  CompleteInput,
  Photo,
  RecordCreateInput,
  RecordPage,
  RecordQuery,
  RecordUpdateInput,
} from "@/shared/domain/record";
import type { Routine, RoutineUpdateInput } from "@/shared/domain/routine";
import {
  morphSchema,
  speciesResponseSchema,
  toSpeciesList,
  type Species,
  type SpeciesId,
} from "@/shared/domain/species";
import {
  AGREEMENT_VERSION,
  AGREEMENTS,
  agreementCompletionSchema,
  loginUrlSchema,
  meSchema,
  oauthLoginSchema,
  type AgreementType,
  type AuthProvider,
} from "@/shared/domain/user";
import {
  toCareRecord,
  toCareRecordFromListItem,
  toCareStandardTable,
  toCompleteRequest,
  toRecordCreate,
  toRecordQuery,
  toRecordUpdate,
  toRoutine,
  toRoutineActionResult,
  toRoutineFromDetails,
  toRoutineState,
  toRoutineUpdate,
  toSkipRequest,
  toToday,
} from "./adapters";
import { api } from "./client";

/**
 * 서버 API 목록 (IA 8_개발 참고 API-01~84). 화면은 이 함수만 부르고 경로는 여기에만 둔다.
 * 응답은 zod 스키마로 검증해서 백엔드와 모양이 어긋나면 바로 드러나게 한다.
 * 일정·오늘 할 일·기록·파일·가이드라인은 백엔드 모양(src/shared/domain/backend.ts)으로 받아
 * adapters.ts가 화면용 도메인 모델로 바꾼다. 인계 카드·개체 상태 바꾸기는 스웨거에 아직 없어 목업이다.
 */

const noContent = () => undefined;

function searchParams(query: Record<string, string | number | boolean | undefined | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return params;
}

export const authApi = {
  /** API-01 카카오·구글 로그인 화면 주소. CSRF를 막는 state 쿠키도 함께 받는다 */
  loginUrl: (provider: AuthProvider) => api.get(`auth/${provider}/login-url`).json(loginUrlSchema),
  /**
   * API-01 인가 코드로 로그인·가입. 기존 회원은 refresh 쿠키도 받는다.
   * 인가 코드는 한 번만 쓸 수 있어서 다시 시도하지 않는다
   */
  callback: (provider: AuthProvider, query: { code: string; state: string }) =>
    api.get(`auth/${provider}/callback`, { searchParams: query, retry: 0 }).json(oauthLoginSchema),
  /** API-03 refresh 쿠키를 지운다. 쿠키가 없어도 204 */
  logout: () => api.post("auth/logout").then(noContent),
};

export const meApi = {
  /** API-04 */
  get: () => api.get("users/me").json(meSchema),
  /** API-05 약관 동의 → 가입 완료. 가입 토큰으로 부르고 access 토큰을 받는다 */
  agree: (agreed: AgreementType[], signupToken: string) =>
    api
      .post("me/agreements", {
        headers: { Authorization: `Bearer ${signupToken}` },
        json: {
          agreements: AGREEMENTS.map(({ type }) => ({
            type,
            version: AGREEMENT_VERSION,
            agreed: agreed.includes(type),
          })),
        },
        retry: 0,
      })
      .json(agreementCompletionSchema),
  /** API-07 회원 탈퇴. 파봄 회원 정보만 지우고 카카오·구글 연결은 끊지 않는다 (MVP) */
  withdraw: () => api.delete("users/me", { json: { confirm: true } }).then(noContent),
};

/** 개체·가이드라인 API에서 백엔드 종 ID ↔ 앱 종을 바꿀 때 쓰는 종 목록. 한 번만 불러 둔다 */
let speciesCache: Promise<Species[]> | undefined;
const loadSpecies = () => {
  speciesCache ??= speciesApi.list().catch((error: unknown) => {
    speciesCache = undefined;
    throw error;
  });
  return speciesCache;
};

const serverSpeciesId = async (speciesId: SpeciesId) => {
  const species = (await loadSpecies()).find((s) => s.id === speciesId);
  if (!species) throw new Error(`지원하지 않는 종이에요 (${speciesId})`);
  return species.serverId;
};

export const speciesApi = {
  /** API-10 종 목록. 로그인 없이 부른다. MVP 밖의 종(볼파이톤)은 뺀다 */
  list: () =>
    api
      .get("species")
      .json(successEnvelope(z.array(speciesResponseSchema)))
      .then(toSpeciesList),
  /** 종별 모프 목록. 로그인 없이 부른다. speciesId는 백엔드 종 ID(Species.serverId) */
  morphs: (serverId: number) =>
    api
      .get(`species/${serverId}/morphs`)
      .json(successEnvelope(z.array(morphSchema)))
      .then((morphs) => [...morphs].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))),
  /** API-11 종별 관리 가이드라인 (최신 PUBLISHED 버전의 준성체·성체 기준). 로그인 없이 부른다 */
  careStandards: async (speciesId: SpeciesId) =>
    api
      .get(`species/${await serverSpeciesId(speciesId)}/care-standards`)
      .json(successEnvelope(backendCareStandardsSchema))
      .then((raw) => toCareStandardTable(raw, speciesId)),
};

export const filesApi = {
  /** API-60 사진 업로드 (JPEG·PNG). purpose는 쿼리와 본문 둘 다에 싣는다 (스웨거가 둘 다 요구) */
  upload: async (file: Blob, purpose: FilePurpose): Promise<Photo> => {
    const body = new FormData();
    body.set("file", file);
    body.set("purpose", FILE_PURPOSE[purpose]);
    const saved = await api
      .post("files", { body, searchParams: { purpose: FILE_PURPOSE[purpose] }, timeout: 30_000 })
      .json(successEnvelope(backendFileSchema));
    return { id: String(saved.id), url: saved.url };
  },
  /** 파일 조회 주소 (Presigned URL). 10분 동안만 쓸 수 있다 */
  url: (fileId: number | string) =>
    api
      .get(`files/${fileId}`)
      .json(successEnvelope(backendFileUrlSchema))
      .then((file) => file.url),
};

/** 사진 주소를 못 받아도 개체는 보여 준다 */
const photoUrlOf = (fileId: number | null | undefined) =>
  fileId === null || fileId === undefined
    ? Promise.resolve(null)
    : filesApi.url(fileId).catch(() => null);

async function toPetWithPhoto(res: PetResponse): Promise<Pet> {
  const [species, photoUrl] = await Promise.all([loadSpecies(), photoUrlOf(res.photoFileId)]);
  return toPet(res, species, photoUrl);
}

const getPet = (petId: string) =>
  api.get(`pets/${petId}`).json(successEnvelope(petResponseSchema)).then(toPetWithPhoto);

export type PetDetail = { pet: Pet; routines: Routine[]; recentRecords: CareRecord[] };

/**
 * 개체(pets)는 진짜 백엔드인데 일정(routine)은 목업이거나 그 반대면, 일정 쪽이 그 개체를 몰라 404가 난다.
 * 그때는 일정을 빈 목록으로 둔다
 */
const routinesOrEmpty = (petId: string) =>
  env.apiMocking && env.apiLive.has("pets") !== env.apiLive.has("routine")
    ? routinesApi.list(petId).catch(() => [])
    : routinesApi.list(petId);

export const petsApi = {
  /**
   * API-20 내 개체 목록 (최근 등록 순). 백엔드는 아직 status 조건이 없어 모두 키우는 중으로 온다.
   * 그래서 받은 뒤 상태로 한 번 더 거른다 (목업은 status 조건을 받는다)
   */
  list: async (status: PetStatus = "active"): Promise<Pet[]> => {
    const rows = await api
      .get("pets", { searchParams: { status } })
      .json(successEnvelope(z.array(petResponseSchema)));
    const pets = await Promise.all(rows.map(toPetWithPhoto));
    return pets.filter((pet) => pet.status === status);
  },
  /** API-21 개체 등록 (기본 관리 일정을 만드는지는 [백엔드 확인 필요]. 목업은 만든다) */
  create: (input: PetCreateInput): Promise<Pet> =>
    api.post("pets", { json: input }).json(successEnvelope(petResponseSchema)).then(toPetWithPhoto),
  /** API-22 개체 상세. 체크 리스트(API-30)·최근 기록(API-50)은 따로 불러 합친다 */
  get: async (petId: string): Promise<PetDetail> => {
    const [pet, routines, recent] = await Promise.all([
      getPet(petId),
      routinesOrEmpty(petId),
      recordsApi.list({ petId, limit: 5 }),
    ]);
    return { pet, routines, recentRecords: recent.items };
  },
  /** API-23 보낸 칸만 바꾼다 */
  update: (petId: string, input: PetUpdateInput): Promise<Pet> =>
    api
      .patch(`pets/${petId}`, { json: input })
      .json(successEnvelope(petResponseSchema))
      .then(toPetWithPhoto),
  /** API-24 소프트 삭제 (개체의 활성 기록도 함께). 204 */
  remove: (petId: string) => api.delete(`pets/${petId}`).then(noContent),
  /** API-26 함께했던 개체로 바꾸기·되돌리기 (스웨거에 없어 목업) */
  changeStatus: (petId: string, input: PetStatusChangeInput) =>
    api.post(`pets/${petId}/status-changes`, { json: input }).json(petSchema),
};

export const routinesApi = {
  /** API-30 개체의 관리 루틴. 부화일을 모르는 개체는 백엔드가 준성체 기준을 쓴다 */
  list: (petId: string): Promise<Routine[]> =>
    api
      .get(`pets/${petId}/routines`)
      .json(successEnvelope(z.array(backendPetRoutineSchema)))
      .then((rows) => rows.map(toRoutine)),
  /** API-31 주기(1~365일)·켜고 끄기 수정 */
  update: (routineId: string, input: RoutineUpdateInput): Promise<Routine> =>
    api
      .patch(`routines/${routineId}`, { json: toRoutineUpdate(input) })
      .json(successEnvelope(backendRoutineMutationSchema))
      .then(({ routine }) => toRoutineFromDetails(routine)),
  /** API-32 기준표 값으로 되돌리기 */
  reset: (routineId: string): Promise<Routine> =>
    api
      .post(`routines/${routineId}/reset`)
      .json(successEnvelope(backendRoutineMutationSchema))
      .then(({ routine }) => toRoutineFromDetails(routine)),
  /** API-41 완료 체크 → 기록 생성. 같은 날 두 번이면 409 */
  complete: (routineId: string, input: CompleteInput = {}) =>
    api
      .post(`routines/${routineId}/complete`, { json: toCompleteRequest(input) })
      .json(successEnvelope(backendRoutineActionSchema))
      .then(toRoutineActionResult),
  /** API-42 이번 회차 건너뜀 → 건너뜀 기록 생성 */
  skip: (routineId: string, reason: string | null) =>
    api
      .post(`routines/${routineId}/skip`, { json: toSkipRequest(reason) })
      .json(successEnvelope(backendRoutineActionSchema))
      .then(toRoutineActionResult),
  /** API-43 다른 날로 미루기. date가 null이면 미루기 취소 */
  postpone: (routineId: string, date: string | null) =>
    api
      .post(`routines/${routineId}/postpone`, { json: { postponeTo: date } })
      .json(successEnvelope(backendRoutinePostponeSchema))
      .then(({ routine }) => toRoutineState(routine)),
};

export const todayApi = {
  /** API-40 오늘(또는 앞 날짜) 할 일. 앞 날짜면 예정(planned)으로 */
  get: (date: string, petId?: string) =>
    api
      .get("today", { searchParams: searchParams({ date, petId }) })
      .json(successEnvelope(backendTodaySchema))
      .then((raw) => toToday(raw)),
};

/** 백엔드 기록 목록은 한 번에 50개까지 */
const RECORD_PAGE_MAX = 50;

async function recordPage(query: RecordQuery, size: number): Promise<RecordPage> {
  const page = await api
    .get("records", { searchParams: searchParams(toRecordQuery(query, size)) })
    .json(successEnvelope(backendRecordListSchema));
  // 목록 아이템에는 사진 주소가 없어서, 사진이 있는 기록만 상세를 불러 채운다
  const items = await Promise.all(
    page.items.map((item) =>
      item.hasPhoto ? recordsApi.get(String(item.id)) : toCareRecordFromListItem(item),
    ),
  );
  return { items, nextCursor: page.nextCursor };
}

export const recordsApi = {
  /** API-50 기록 이력(커서 페이지). limit이 50을 넘으면 여러 페이지를 이어 받는다 */
  list: async (query: RecordQuery): Promise<RecordPage> => {
    const limit = query.limit ?? 20;
    const items: CareRecord[] = [];
    let cursor = query.cursor;
    let nextCursor: string | null = null;
    do {
      const page = await recordPage(
        { ...query, cursor },
        Math.min(RECORD_PAGE_MAX, limit - items.length),
      );
      items.push(...page.items);
      nextCursor = page.nextCursor;
      cursor = nextCursor ?? undefined;
    } while (nextCursor && items.length < limit);
    return { items, nextCursor };
  },
  /** API-51 직접 기록 (recordType=DONE, source=MANUAL) */
  create: (input: RecordCreateInput) =>
    api
      .post("records", { json: toRecordCreate(input) })
      .json(successEnvelope(backendRecordMutationSchema))
      .then(({ record }) => toCareRecord(record)),
  /** API-52 기록 상세 + 정정 이력 */
  get: (recordId: string) =>
    api
      .get(`records/${recordId}`)
      .json(successEnvelope(backendRecordDetailSchema))
      .then(({ record, revisions }) => toCareRecord(record, revisions)),
  /** API-53 정정(이전 값 보존). revisionNo가 없으면(목록에서 온 기록) 상세를 먼저 부른다 */
  update: async (record: Pick<CareRecord, "id" | "revisionNo">, input: RecordUpdateInput) => {
    const revisionNo = record.revisionNo ?? (await recordsApi.get(record.id)).revisionNo ?? 0;
    return api
      .patch(`records/${record.id}`, { json: toRecordUpdate(revisionNo, input) })
      .json(successEnvelope(backendRecordMutationSchema))
      .then(({ record: saved }) => toCareRecord(saved));
  },
  /** API-54 소프트 삭제. 30일 안에 복구할 수 있다 */
  remove: (recordId: string) =>
    api
      .delete(`records/${recordId}`)
      .json(successEnvelope(backendRecordDeleteSchema))
      .then(({ restorableUntil }) => ({ restorableUntil })),
  /** API-55 삭제 기록 복구. 기간이 지났으면 410 */
  restore: (recordId: string) =>
    api
      .post(`records/${recordId}/restore`)
      .json(successEnvelope(backendRecordMutationSchema))
      .then(({ record }) => toCareRecord(record)),
};

export const healthApi = {
  /** 서버 상태. 봉투 없이 {status}가 바로 온다. 의존성이 죽어 있으면 503 */
  get: () => api.get("health", { retry: 0 }).json(backendHealthSchema),
};

export const handoverApi = {
  /** API-80 */
  create: (petId: string, scope: HandoverScope) =>
    api.post("handover-cards", { json: { petId, scope, agreed: true } }).json(handoverCardSchema),
  /** API-81 로그인 없이 미리보기 */
  preview: (code: string) => api.get(`handover-cards/${code}`).json(handoverPreviewSchema),
  /** API-82 수락 → 개체 생성 */
  accept: (code: string, input: HandoverAcceptInput) =>
    api.post(`handover-cards/${code}/accept`, { json: input }).json(petSchema),
  /** API-83 */
  list: () => api.get("handover-cards").json(z.array(handoverCardSchema)),
  /** API-84 */
  cancel: (code: string) => api.delete(`handover-cards/${code}`).then(noContent),
};
