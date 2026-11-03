import { addDays, differenceInCalendarDays, parseISO, subDays } from "date-fns";
import { delay, http, HttpResponse } from "msw";
import { apiBaseUrl } from "@/shared/api/client";
import { getStoredAccount } from "@/shared/api/session";
import {
  CARE_ITEM_CODE,
  FILE_PURPOSE,
  type BackendCompleteRequest,
  type BackendPostponeRequest,
  type BackendRecordCreate,
  type BackendRecordUpdate,
  type BackendRoutineUpdate,
  type BackendSkipRequest,
} from "@/shared/domain/backend";
import { CARE_ITEM_LABEL } from "@/shared/domain/care";
import type { HandoverAcceptInput, HandoverPreview, HandoverScope } from "@/shared/domain/handover";
import type {
  PetCreateInput,
  PetStatusChangeInput,
  PetUpdateInput,
  Sex,
} from "@/shared/domain/pet";
import { LIFE_STAGE_UNKNOWN, LIFE_STAGES } from "@/shared/domain/species";
import { authProviderSchema } from "@/shared/domain/user";
import {
  careStandardsOf,
  MORPHS,
  serverIdOf,
  SPECIES_DATA,
  SPECIES_ROWS,
  speciesOfServerId,
} from "./data";
import {
  addRoutines,
  db,
  nextId,
  nextNumericId,
  save,
  ymd,
  type DbCard,
  type DbRecord,
  type DbUser,
} from "./db";
import { careStageOf, revisionNoOf, serializePet, stageCodeOf } from "./logic";
import {
  CARE_ITEM_OF,
  INTAKE_OF,
  recordFields,
  restorableUntil,
  skipReasonOf,
  wirePet,
  wireRecord,
  wireRecordLite,
  wireRecordListItem,
  wireRevisions,
  wireRoutine,
  wireRoutineDetails,
  wireRoutineState,
  wireToday,
} from "./wire";

const url = (path: string) => `${apiBaseUrl}${path}`;

/** 서버 오류 형식 {resultType:"FAIL", error:{code,message,details}, meta}. 목업은 칸별 오류 fields도 준다 */
function fail(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json(
    {
      resultType: "FAIL",
      success: null,
      error: { code, message, details: null, fields, traceId: `mock-${Date.now()}` },
      meta: { timestamp: new Date().toISOString(), path: "" },
    },
    { status },
  );
}

/** 백엔드 공통 성공 응답 {resultType:"SUCCESS", success:{data}, error:null, meta} */
function success(data: unknown, init?: ResponseInit) {
  return HttpResponse.json(
    {
      resultType: "SUCCESS",
      success: { data },
      error: null,
      meta: { timestamp: new Date().toISOString(), path: "" },
    },
    init,
  );
}

/** 인계 카드 링크는 프론트 주소로 만든다 */
const appOrigin = () =>
  typeof location === "undefined" ? "http://localhost:3000" : location.origin;

const notFound = () => fail(404, "NOT_FOUND", "찾을 수 없어요.");
const validationFailed = () =>
  fail(400, "VALIDATION_FAILED", "요청값이 누락되었거나 올바르지 않습니다.");

/** 실제 네트워크처럼 조금 기다린다 */
const wait = () => delay(process.env.NODE_ENV === "test" ? 0 : 250);

function currentUser(request: Request): DbUser | null {
  const header = request.headers.get("Authorization");
  if (db.session.token && header === `Bearer ${db.session.token}`) {
    return db.users.find((u) => u.id === db.session.userId) ?? null;
  }
  return liveUser(header);
}

/**
 * 로그인은 진짜 백엔드로 하고 나머지 API만 목업일 때(NEXT_PUBLIC_API_LIVE=auth).
 * 백엔드 access 토큰(JWT)의 sub(회원 번호)로 목업 회원을 찾고, 처음이면 빈 계정을 만든다.
 * 서명은 확인하지 않는다 (목업 전용)
 */
function liveUser(header: string | null): DbUser | null {
  const payload = header?.replace(/^Bearer /, "").split(".")[1];
  if (!payload) return null;
  let sub: string | undefined;
  try {
    sub = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).sub;
  } catch {
    return null;
  }
  if (!sub) return null;

  const id = `live-${sub}`;
  let user = db.users.find((u) => u.id === id);
  if (!user) {
    const account = getStoredAccount();
    const known = account?.id === Number(sub) ? account : null;
    user = {
      id,
      nickname: known?.nickname || `파봄 사용자${sub}`,
      provider: known?.provider ?? "kakao",
      status: "active",
      joinedAt: new Date().toISOString(),
      agreements: ["TERMS", "PRIVACY", "AGE_14"],
    };
    db.users.push(user);
    save();
  }
  return user;
}

/** 백엔드 회원 번호는 숫자라 목업 id를 숫자로 바꿔 준다 */
function accountId(user: DbUser) {
  const digits = user.id.replace(/\D/g, "");
  return digits
    ? Number(digits)
    : [...user.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 99991, 7);
}

const accountOf = (user: DbUser, status: "PENDING_TERMS" | "ACTIVE") => ({
  id: accountId(user),
  nickname: user.nickname,
  status,
});

/** 목업 가입 토큰. 약관 동의(/me/agreements)에서만 쓴다 */
const signupTokenOf = (user: DbUser) => `mock-signup-${user.id}`;

type Resolver = (args: {
  request: Request;
  params: Record<string, string>;
  user: DbUser;
}) => Response | Promise<Response>;

/** 로그인이 필요한 API. 토큰이 없거나 틀리면 401 → 클라이언트가 refresh 후 재시도 */
function authed(resolver: Resolver) {
  return async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "로그인이 필요해요.");
    const response = await resolver({ request, params: params as Record<string, string>, user });
    save();
    return response;
  };
}

const myPet = (user: DbUser, petId: string) =>
  db.pets.find((p) => p.id === petId && p.userId === user.id && !p.deletedAt);

const myRoutine = (user: DbUser, routineId: string) => {
  const routine = db.routines.find((r) => r.id === routineId);
  return routine && myPet(user, routine.petId) ? routine : undefined;
};

const myRecord = (user: DbUser, recordId: string) => {
  const record = db.records.find((r) => r.id === recordId);
  return record && myPet(user, record.petId) ? record : undefined;
};

const myFile = (user: DbUser, fileId: number | string | null | undefined) =>
  fileId === null || fileId === undefined
    ? undefined
    : db.files.find((f) => f.id === String(fileId) && f.ownerId === user.id);

function meOf(user: DbUser) {
  const pets = db.pets.filter((p) => p.userId === user.id && !p.deletedAt);
  return {
    id: accountId(user),
    nickname: user.nickname,
    status: user.status === "active" ? "ACTIVE" : "PENDING_TERMS",
    role: "USER",
    region: null,
    agreements: user.agreements.map((type) => ({
      type,
      version: "1.0",
      agreed: true,
      agreedAt: user.joinedAt,
    })),
    requiredAgreements: ["TERMS", "PRIVACY", "AGE_14"].map((type) => ({
      type,
      currentVersion: "1.0",
      required: true,
    })),
    needsReconsent: false,
    petCount: {
      active: pets.filter((p) => p.status === "active").length,
      ended: pets.filter((p) => p.status === "ended").length,
    },
    createdAt: user.joinedAt,
  };
}

function newToken() {
  db.session.token = `mock-token-${Math.random().toString(36).slice(2)}`;
  return db.session.token;
}

function cardStatus(card: DbCard) {
  if (card.status === "unused" && new Date(card.expiresAt) < new Date()) return "expired" as const;
  return card.status;
}

function serializeCard(card: DbCard, origin: string) {
  const pet = db.pets.find((p) => p.id === card.petId);
  return {
    code: card.code,
    petId: card.petId,
    petName: pet?.name ?? "",
    scope: card.scope,
    status: cardStatus(card),
    createdAt: card.createdAt,
    expiresAt: card.expiresAt,
    url: `${origin}/share/${card.code}`,
  };
}

const isFuture = (iso: string) => parseISO(iso) > new Date();

/**
 * 인증·약관 동의 (백엔드에 이미 있는 API와 같은 모양).
 * NEXT_PUBLIC_API_LIVE에 auth를 넣으면 이 묶음은 빼고 진짜 백엔드로 보낸다 (browser.ts)
 */
export const authHandlers = [
  http.get(url("/auth/:provider/login-url"), async ({ params }) => {
    await wait();
    const provider = authProviderSchema.safeParse(params.provider);
    if (!provider.success) {
      return fail(400, "UNSUPPORTED_OAUTH_PROVIDER", "지원하지 않는 OAuth 제공자입니다.");
    }
    // 목업은 카카오·구글 화면을 건너뛰고 바로 로그인 처리 화면으로 보낸다
    const callback = new URL(`/auth/callback/${provider.data}`, appOrigin());
    callback.search = new URLSearchParams({
      code: `mock-${provider.data}`,
      state: "mock-state",
    }).toString();
    return success({ authorizationUrl: callback.toString() });
  }),

  http.get(url("/auth/:provider/callback"), async ({ params, request }) => {
    await wait();
    const parsed = authProviderSchema.safeParse(params.provider);
    if (!parsed.success) {
      return fail(400, "UNSUPPORTED_OAUTH_PROVIDER", "지원하지 않는 OAuth 제공자입니다.");
    }
    const query = new URL(request.url).searchParams;
    if (!query.get("code") || !query.get("state")) return validationFailed();
    const provider = parsed.data;
    // 목업 규칙: 카카오는 기록이 쌓인 기존 회원, 구글은 처음 가입하는 회원
    let user = db.users.find((u) => u.provider === provider);
    if (!user) {
      user = {
        id: nextId("u"),
        nickname: provider === "google" ? "서윤" : "파봄 사용자1024",
        provider,
        status: "pending_agreement",
        joinedAt: new Date().toISOString(),
        agreements: [],
      };
      db.users.push(user);
    }
    save();
    // 약관 동의 전이면 가입 토큰만 주고 refresh 세션은 만들지 않는다
    if (user.status === "pending_agreement") {
      return HttpResponse.json({
        signupToken: signupTokenOf(user),
        expiresIn: 600,
        isNewUser: true,
        user: accountOf(user, "PENDING_TERMS"),
      });
    }
    db.session.userId = user.id;
    const accessToken = newToken();
    save();
    return HttpResponse.json({
      accessToken,
      expiresIn: 1800,
      isNewUser: false,
      user: accountOf(user, "ACTIVE"),
    });
  }),

  http.post(url("/auth/refresh"), async () => {
    await wait();
    if (!db.session.userId) {
      return fail(401, "REFRESH_INVALID", "유효하지 않거나 만료된 리프레시 토큰입니다.");
    }
    const accessToken = newToken();
    save();
    return HttpResponse.json({ accessToken, expiresIn: 1800 });
  }),

  http.post(url("/auth/logout"), async () => {
    await wait();
    db.session = { userId: null, token: null };
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  // 가입 토큰으로 부른다. 동의가 끝나면 access 토큰을 주고 refresh 세션을 만든다
  http.post(url("/me/agreements"), async ({ request }) => {
    await wait();
    const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "");
    const user = db.users.find((u) => signupTokenOf(u) === token);
    if (!user || user.status !== "pending_agreement") {
      return fail(401, "INVALID_TOKEN", "유효하지 않거나 만료된 인증 토큰입니다.");
    }
    const { agreements } = (await request.json()) as {
      agreements: { type: string; version: string; agreed: boolean }[];
    };
    if (agreements.some((a) => a.version !== "1.0")) {
      return fail(409, "AGREEMENT_VERSION_MISMATCH", "약관 버전이 최신 버전과 일치하지 않습니다.");
    }
    const agreed = agreements.filter((a) => a.agreed).map((a) => a.type);
    if (!["TERMS", "PRIVACY", "AGE_14"].every((t) => agreed.includes(t))) {
      return fail(422, "REQUIRED_AGREEMENT_MISSING", "필수 약관에 모두 동의해야 합니다.");
    }
    user.agreements = agreed;
    user.status = "active";
    db.session.userId = user.id;
    const accessToken = newToken();
    save();
    return HttpResponse.json({ user: accountOf(user, "ACTIVE"), accessToken, expiresIn: 1800 });
  }),
];

/**
 * 종·모프·관리 가이드라인 조회 (로그인 없이 부르는 공개 API).
 * NEXT_PUBLIC_API_LIVE에 species가 있으면 진짜로 보낸다
 */
export const speciesHandlers = [
  http.get(url("/species"), async () => {
    await wait();
    return success(SPECIES_ROWS);
  }),

  http.get(url("/species/:speciesId/morphs"), async ({ params }) => {
    await wait();
    const serverId = Number(params.speciesId);
    if (!Number.isInteger(serverId)) return validationFailed();
    const morphs = MORPHS[serverId];
    return morphs ? success(morphs) : notFound();
  }),

  http.get(url("/species/:speciesId/care-standards"), async ({ params }) => {
    await wait();
    const serverId = Number(params.speciesId);
    if (!Number.isInteger(serverId)) return validationFailed();
    const species = speciesOfServerId(serverId);
    // 볼파이톤처럼 가이드라인이 없는 종은 백엔드가 404
    return species ? success(careStandardsOf(species)) : notFound();
  }),
];

/**
 * 개체 목록·등록·상세·수정·삭제와 개체별 관리 루틴 (백엔드 모양).
 * NEXT_PUBLIC_API_LIVE에 pets가 있으면 진짜로 보낸다
 */
export const petHandlers = [
  http.get(
    url("/pets"),
    authed(({ request, user }) => {
      // 백엔드는 status 조건이 아직 없지만, 목업은 함께했던 개체 화면을 위해 받는다
      const status = new URL(request.url).searchParams.get("status") ?? "active";
      const pets = db.pets
        .filter((p) => p.userId === user.id && !p.deletedAt && p.status === status)
        .sort((a, b) =>
          status === "ended"
            ? (b.endedOn ?? "").localeCompare(a.endedOn ?? "")
            : b.createdAt.localeCompare(a.createdAt),
        );
      return success(pets.map(wirePet));
    }),
  ),

  http.post(
    url("/pets"),
    authed(async ({ request, user }) => {
      const input = (await request.json()) as PetCreateInput;
      if (!input.clientRequestId) return validationFailed();
      const name = input.name?.trim() ?? "";
      if (!name || name.length > 20) {
        const message = name ? "20자까지 쓸 수 있어요" : "이름을 입력해 주세요";
        return fail(422, "VALIDATION_FAILED", "입력한 값을 확인해 주세요.", { name: message });
      }
      const species = SPECIES_DATA.find((s) => s.serverId === input.speciesId);
      if (!species) return notFound();
      const morphNames = (input.morphIds ?? []).map(
        (id) => MORPHS[species.serverId]?.find((m) => m.id === id)?.name,
      );
      const morph = [...morphNames, input.customMorph?.trim()].filter(Boolean).join(", ") || null;
      const stageCode = LIFE_STAGES.find((s) => s.id === input.lifeStageId)?.code ?? null;
      if (input.photoFileId && !myFile(user, input.photoFileId)) {
        return fail(404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
      }
      const pet = {
        id: nextNumericId(),
        userId: user.id,
        name,
        speciesId: species.id,
        morph,
        sex: (input.sex?.toLowerCase() ?? "unknown") as Sex,
        hatchedOn: input.hatchedAt ?? null,
        // 고른 단계를 그대로 둔다. 부화일이 있어도 고른 단계가 우선 (다르면 바꿔 주세요)
        manualStageCode: stageCode ?? (input.hatchedAt ? null : LIFE_STAGE_UNKNOWN.code),
        stageUncertain: stageCode === "juvenile" && input.stageCertainty === "ESTIMATED",
        acquiredOn: input.adoptedAt ?? null,
        photoFileId: input.photoFileId ? String(input.photoFileId) : null,
        status: "active" as const,
        endReason: null,
        endedOn: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };
      db.pets.push(pet);
      // 백엔드가 등록 때 기본 일정을 만드는지는 [백엔드 확인 필요]. 목업은 데모 화면을 위해 기준표대로 만든다
      // (첫 예정일은 등록 당일 [제안])
      addRoutines(db, pet.id, pet.speciesId, careStageOf(pet), new Date());
      return success(wirePet(pet), { status: 201 });
    }),
  ),

  http.get(
    url("/pets/:petId"),
    authed(({ params, user }) => {
      const pet = myPet(user, params.petId);
      // 남의 개체도 '찾을 수 없음'으로 보여 존재 여부를 숨긴다
      if (!pet) return notFound();
      return success(wirePet(pet));
    }),
  ),

  http.patch(
    url("/pets/:petId"),
    authed(async ({ request, params, user }) => {
      const pet = myPet(user, params.petId);
      if (!pet) return notFound();
      const input = (await request.json()) as PetUpdateInput;
      const beforeStage = stageCodeOf(pet);

      if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name || name.length > 20) {
          const message = name ? "20자까지 쓸 수 있어요" : "이름을 입력해 주세요";
          return fail(422, "VALIDATION_FAILED", "입력한 값을 확인해 주세요.", { name: message });
        }
        pet.name = name;
      }
      if (input.morphIds !== undefined || input.customMorph !== undefined) {
        const serverId = serverIdOf(pet.speciesId);
        const names = (input.morphIds ?? []).map(
          (id) => MORPHS[serverId]?.find((m) => m.id === id)?.name,
        );
        pet.morph = [...names, input.customMorph?.trim()].filter(Boolean).join(", ") || null;
      }
      if (input.sex !== undefined) pet.sex = input.sex.toLowerCase() as Sex;
      if (input.adoptedAt !== undefined) pet.acquiredOn = input.adoptedAt;
      if (input.hatchedAt !== undefined) pet.hatchedOn = input.hatchedAt;
      if (input.lifeStageId !== undefined || input.hatchedAt !== undefined) {
        const code = LIFE_STAGES.find((s) => s.id === input.lifeStageId)?.code ?? null;
        pet.manualStageCode = code ?? (pet.hatchedOn ? null : LIFE_STAGE_UNKNOWN.code);
      }
      if (input.stageCertainty !== undefined) {
        pet.stageUncertain =
          stageCodeOf(pet) === "juvenile" && input.stageCertainty === "ESTIMATED";
      }
      if (input.photoFileId !== undefined) {
        if (input.photoFileId && !myFile(user, input.photoFileId)) {
          return fail(404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
        }
        pet.photoFileId = input.photoFileId ? String(input.photoFileId) : null;
      }

      // 생애 단계가 바뀌면 직접 바꾸지 않은 주기를 새 단계 기준으로 다시 제안 (목업만)
      const afterStage = stageCodeOf(pet);
      if (afterStage !== beforeStage) {
        const fresh = { ...db, routines: [] as typeof db.routines };
        addRoutines(fresh, pet.id, pet.speciesId, afterStage, new Date());
        for (const routine of db.routines.filter((r) => r.petId === pet.id)) {
          const next = fresh.routines.find((r) => r.careItem === routine.careItem);
          if (!next) continue;
          const customized = routine.intervalDays !== routine.standardIntervalDays;
          routine.standardIntervalDays = next.standardIntervalDays;
          if (!customized) routine.intervalDays = next.intervalDays;
        }
      }
      return success(wirePet(pet));
    }),
  ),

  // 소유 개체와 활성 기록을 소프트 삭제. 204
  http.delete(
    url("/pets/:petId"),
    authed(({ params, user }) => {
      const pet = myPet(user, params.petId);
      if (!pet) return notFound();
      const now = new Date().toISOString();
      pet.deletedAt = now;
      for (const record of db.records) {
        if (record.petId === pet.id && !record.deletedAt) record.deletedAt = now;
      }
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  http.get(
    url("/pets/:petId/routines"),
    authed(({ params, user }) => {
      const pet = myPet(user, params.petId);
      if (!pet) return notFound();
      if (pet.status !== "active") {
        return fail(409, "PET_NOT_ACTIVE", "활성 상태의 개체만 조회할 수 있습니다.");
      }
      return success(db.routines.filter((r) => r.petId === pet.id).map(wireRoutine));
    }),
  ),
];

/**
 * 관리 루틴 수정·초기화·완료·건너뛰기·미루기와 오늘 할 일 (백엔드 모양).
 * NEXT_PUBLIC_API_LIVE에 routine이 있으면 진짜로 보낸다
 */
export const routineHandlers = [
  http.patch(
    url("/routines/:routineId"),
    authed(async ({ request, params, user }) => {
      const routine = myRoutine(user, params.routineId);
      if (!routine) return notFound();
      const input = (await request.json()) as BackendRoutineUpdate;
      if (input.intervalDays !== undefined) {
        if (
          !Number.isInteger(input.intervalDays) ||
          input.intervalDays < 1 ||
          input.intervalDays > 365
        ) {
          return fail(400, "VALIDATION_FAILED", "입력한 값을 확인해 주세요.", {
            intervalDays: "1~365일 사이로 입력해 주세요",
          });
        }
        routine.intervalDays = input.intervalDays;
      }
      if (input.isEnabled !== undefined) routine.enabled = input.isEnabled;
      if (input.startDate !== undefined) routine.startDate = input.startDate;
      if (input.reasonNote !== undefined) routine.reason = input.reasonNote || null;
      if (input.foodName !== undefined) routine.foodName = input.foodName?.trim() || null;
      return success({ routine: wireRoutineDetails(routine), previous: null });
    }),
  ),

  http.post(
    url("/routines/:routineId/reset"),
    authed(({ params, user }) => {
      const routine = myRoutine(user, params.routineId);
      if (!routine) return notFound();
      const previous = wireRoutineDetails(routine);
      routine.intervalDays = routine.standardIntervalDays;
      routine.reason = null;
      return success({
        routine: wireRoutineDetails(routine),
        previous: {
          intervalDays: previous.intervalDays,
          isEnabled: previous.isEnabled,
          startDate: previous.startDate,
          cycleSource: previous.cycleSource,
          versionLabel: previous.versionLabel,
        },
      });
    }),
  ),

  http.post(
    url("/routines/:routineId/complete"),
    authed(async ({ request, params, user }) => {
      const routine = myRoutine(user, params.routineId);
      if (!routine) return notFound();
      const input = (await request.json()) as BackendCompleteRequest;
      if (!input.clientRequestId) return validationFailed();
      const occurredAt = input.occurredAt
        ? new Date(input.occurredAt).toISOString()
        : new Date().toISOString();
      if (isFuture(occurredAt))
        return fail(422, "FUTURE_TIME", "앞으로의 시각은 기록할 수 없어요.");
      const sameDay = db.records.some(
        (r) =>
          !r.deletedAt &&
          r.routineId === routine.id &&
          ymd(parseISO(r.occurredAt)) === ymd(parseISO(occurredAt)),
      );
      if (sameDay) return fail(409, "ALREADY_RECORDED", "오늘 이미 기록했어요.");

      const record: DbRecord = {
        id: nextNumericId(),
        petId: routine.petId,
        routineId: routine.id,
        careItem: routine.careItem,
        type: "done",
        method: "routine",
        occurredAt,
        createdAt: new Date().toISOString(),
        intake: input.outcome ? INTAKE_OF[input.outcome] : null,
        weightG: input.valueNum ?? null,
        memo: input.memo?.trim() || null,
        foodName: routine.foodName,
        skipReason: null,
        photoIds: [],
        deletedAt: null,
        revisions: [],
      };
      db.records.push(record);
      routine.postponedTo = null;
      return success({
        record: wireRecordLite(record),
        routine: wireRoutineState(routine),
        todayStatus: record.careItem === "feeding" && !record.intake ? "NEEDS_RESULT" : "DONE",
      });
    }),
  ),

  http.post(
    url("/routines/:routineId/skip"),
    authed(async ({ request, params, user }) => {
      const routine = myRoutine(user, params.routineId);
      if (!routine) return notFound();
      const input = (await request.json()) as BackendSkipRequest;
      if (!input.clientRequestId) return validationFailed();
      const now = new Date().toISOString();
      const record: DbRecord = {
        id: nextNumericId(),
        petId: routine.petId,
        routineId: routine.id,
        careItem: routine.careItem,
        type: "skipped",
        method: "routine",
        occurredAt: input.occurredOn ? new Date(`${input.occurredOn}T12:00:00`).toISOString() : now,
        createdAt: now,
        intake: null,
        weightG: null,
        memo: null,
        foodName: routine.foodName,
        skipReason: skipReasonOf(input.reasonCode, input.memo),
        photoIds: [],
        deletedAt: null,
        revisions: [],
      };
      db.records.push(record);
      routine.postponedTo = null;
      return success({
        record: wireRecordLite(record),
        routine: wireRoutineState(routine),
        todayStatus: "SKIPPED",
      });
    }),
  ),

  http.post(
    url("/routines/:routineId/postpone"),
    authed(async ({ request, params, user }) => {
      const routine = myRoutine(user, params.routineId);
      if (!routine) return notFound();
      const { postponeTo } = (await request.json()) as BackendPostponeRequest;
      if (postponeTo === undefined) return validationFailed();
      if (postponeTo) {
        const diff = differenceInCalendarDays(parseISO(`${postponeTo}T00:00:00`), new Date());
        if (diff < 1 || diff > 30) {
          return fail(422, "VALIDATION_FAILED", "내일부터 30일 뒤까지만 고를 수 있어요.");
        }
      }
      routine.postponedTo = postponeTo;
      return success({ routine: wireRoutineState(routine) });
    }),
  ),

  http.get(
    url("/today"),
    authed(({ request, user }) => {
      const params = new URL(request.url).searchParams;
      const date = params.get("date") ?? ymd(new Date());
      const petId = params.get("petId") ?? undefined;
      if (petId && !myPet(user, petId)) return notFound();
      return success(wireToday(user.id, date, petId));
    }),
  ),
];

/** 기록 목록·추가·상세·정정·삭제·복구 (백엔드 모양). NEXT_PUBLIC_API_LIVE에 record가 있으면 진짜로 보낸다 */
export const recordHandlers = [
  http.get(
    url("/records"),
    authed(({ request, user }) => {
      const params = new URL(request.url).searchParams;
      const petId = params.get("petId");
      if (petId && !myPet(user, petId)) return notFound();
      const itemCodes = params.get("itemCodes")?.split(",").filter(Boolean) ?? [];
      const recordType = params.get("recordType");
      const from = params.get("from");
      const to = params.get("to");
      const includeDeleted = params.get("includeDeleted") === "true";
      const size = Number(params.get("size") ?? 20);
      if (!Number.isInteger(size) || size < 1 || size > 50) return validationFailed();
      // 목업 커서는 건너뛸 개수 (백엔드는 Base64 커서. 앱은 값을 해석하지 않는다)
      const offset = Number(params.get("cursor") ?? 0);
      const myPetIds = new Set(
        db.pets.filter((p) => p.userId === user.id && !p.deletedAt).map((p) => p.id),
      );
      const since = subDays(new Date(), 30).toISOString();
      const rows = db.records
        .filter((r) => myPetIds.has(r.petId))
        .filter((r) => !r.deletedAt || (includeDeleted && r.deletedAt >= since))
        .filter((r) => !petId || r.petId === petId)
        .filter((r) => !itemCodes.length || itemCodes.includes(CARE_ITEM_CODE[r.careItem]))
        .filter((r) => !recordType || (r.type === "done" ? "DONE" : "SKIPPED") === recordType)
        .filter((r) => !from || ymd(parseISO(r.occurredAt)) >= from)
        .filter((r) => !to || ymd(parseISO(r.occurredAt)) <= to)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || Number(b.id) - Number(a.id));
      const page = rows.slice(offset, offset + size);
      return success({
        items: page.map(wireRecordListItem),
        nextCursor: offset + size < rows.length ? String(offset + size) : null,
        lastFeeding: null,
      });
    }),
  ),

  http.post(
    url("/records"),
    authed(async ({ request, user }) => {
      const input = (await request.json()) as BackendRecordCreate;
      if (!input.clientRequestId || !input.occurredAt || !input.itemCode) return validationFailed();
      const pet = myPet(user, String(input.petId));
      if (!pet) return notFound();
      if (pet.status !== "active") {
        return fail(409, "PET_NOT_ACTIVE", "활성 상태의 개체만 기록할 수 있습니다.");
      }
      const careItem = CARE_ITEM_OF[input.itemCode];
      if (!careItem) return fail(422, "CARE_ITEM_INVALID", "유효한 관리 항목이 아닙니다.");
      if (isFuture(input.occurredAt)) {
        return fail(422, "FUTURE_TIME", "앞으로의 시각은 기록할 수 없어요.");
      }
      if (input.photoFileId && !myFile(user, input.photoFileId)) {
        return fail(404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
      }
      // 같은 항목 일정이 있으면 그 일정의 기록으로 남겨 다음 예정일이 다시 계산되게 한다
      const routine = db.routines.find(
        (r) => r.petId === pet.id && r.careItem === careItem && r.enabled,
      );
      const record: DbRecord = {
        id: nextNumericId(),
        petId: pet.id,
        routineId: routine?.id ?? null,
        careItem,
        type: "done",
        method: "manual",
        occurredAt: new Date(input.occurredAt).toISOString(),
        createdAt: new Date().toISOString(),
        intake: input.outcome ? INTAKE_OF[input.outcome] : null,
        weightG: input.valueNum ?? null,
        memo: input.memo?.trim() || null,
        foodName: routine?.foodName ?? null,
        skipReason: null,
        photoIds: input.photoFileId ? [String(input.photoFileId)] : [],
        deletedAt: null,
        revisions: [],
      };
      db.records.push(record);
      if (routine) routine.postponedTo = null;
      return success(
        {
          record: wireRecord(record),
          routineUpdated: routine ? { routineId: Number(routine.id), nextDueAt: null } : null,
        },
        { status: 201 },
      );
    }),
  ),

  http.get(
    url("/records/:recordId"),
    authed(({ params, user }) => {
      const record = myRecord(user, params.recordId);
      if (!record || record.deletedAt) return notFound();
      return success({ record: wireRecord(record), revisions: wireRevisions(record) });
    }),
  ),

  // revisionNo 낙관적 잠금. 다르면 409
  http.patch(
    url("/records/:recordId"),
    authed(async ({ request, params, user }) => {
      const record = myRecord(user, params.recordId);
      if (!record || record.deletedAt) return notFound();
      const input = (await request.json()) as BackendRecordUpdate;
      if (!Number.isInteger(input.revisionNo)) return validationFailed();
      if (input.revisionNo !== revisionNoOf(record)) {
        return fail(409, "RECORD_CONFLICT", "다른 요청에 의해 기록이 변경되었습니다.");
      }
      if (input.occurredAt && isFuture(input.occurredAt)) {
        return fail(422, "FUTURE_TIME", "앞으로의 시각은 기록할 수 없어요.");
      }
      if (input.photoFileId && !myFile(user, input.photoFileId)) {
        return fail(404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
      }
      const before = recordFields(record);
      if (input.occurredAt) record.occurredAt = new Date(input.occurredAt).toISOString();
      if (input.outcome !== undefined) {
        record.intake = input.outcome ? INTAKE_OF[input.outcome] : null;
      }
      if (input.valueNum !== undefined) record.weightG = input.valueNum;
      if (input.memo !== undefined) record.memo = input.memo?.trim() || null;
      if (input.photoFileId !== undefined) {
        record.photoIds = input.photoFileId ? [String(input.photoFileId)] : [];
      }
      const after = recordFields(record);
      const changedFields = Object.keys(after).filter((k) => before[k] !== after[k]);
      if (changedFields.length) {
        record.revisions.push({
          at: new Date().toISOString(),
          changedFields,
          before: Object.fromEntries(changedFields.map((k) => [k, before[k]])),
          after: Object.fromEntries(changedFields.map((k) => [k, after[k]])),
        });
      }
      return success({ record: wireRecord(record), routineUpdated: null });
    }),
  ),

  http.delete(
    url("/records/:recordId"),
    authed(({ params, user }) => {
      const record = myRecord(user, params.recordId);
      if (!record) return notFound();
      // 이미 지운 기록을 다시 지워도 같은 응답 (멱등)
      record.deletedAt ??= new Date().toISOString();
      return success({
        recordId: Number(record.id),
        deletedAt: record.deletedAt,
        restorableUntil: restorableUntil(record.deletedAt),
        routineUpdated: record.routineId
          ? { routineId: Number(record.routineId), nextDueAt: null }
          : null,
      });
    }),
  ),

  http.post(
    url("/records/:recordId/restore"),
    authed(({ params, user }) => {
      const record = myRecord(user, params.recordId);
      if (!record) return notFound();
      if (!record.deletedAt) {
        return fail(409, "RECORD_NOT_DELETED", "삭제된 기록만 복구할 수 있습니다.");
      }
      if (new Date(restorableUntil(record.deletedAt)) < new Date()) {
        return fail(410, "RESTORE_WINDOW_EXPIRED", "기록 복구 가능 기간이 지났습니다.");
      }
      record.deletedAt = null;
      return success({ record: wireRecord(record), routineUpdated: null });
    }),
  ),
];

const FILE_PURPOSES = Object.values(FILE_PURPOSE) as string[];

/** 사진 업로드·조회 주소 (백엔드 모양). NEXT_PUBLIC_API_LIVE에 file이 있으면 진짜로 보낸다 */
export const fileHandlers = [
  http.post(
    url("/files"),
    authed(async ({ request, user }) => {
      const purpose = new URL(request.url).searchParams.get("purpose");
      if (!purpose || !FILE_PURPOSES.includes(purpose)) {
        return fail(400, "UNSUPPORTED_FILE_PURPOSE", "지원하지 않는 파일 용도입니다.");
      }
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof Blob)) return validationFailed();
      if (file.size > 10 * 1024 * 1024) {
        return fail(413, "FILE_TOO_LARGE", "파일 크기가 허용 범위를 초과했습니다.");
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const contentType = file.type || "image/jpeg";
      const dataUrl = `data:${contentType};base64,${btoa(binary)}`;
      const saved = { id: nextNumericId(), url: dataUrl, ownerId: user.id };
      db.files.push(saved);
      return success(
        {
          id: Number(saved.id),
          purpose,
          contentType,
          sizeBytes: file.size,
          width: null,
          height: null,
          url: saved.url,
          status: "TEMP",
          tempExpiresAt: addDays(new Date(), 1).toISOString(),
        },
        { status: 201 },
      );
    }),
  ),

  // 소유한 파일의 10분짜리 주소
  http.get(
    url("/files/:fileId"),
    authed(({ params, user }) => {
      const file = myFile(user, params.fileId);
      if (!file) return fail(404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
      return success({
        url: file.url,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        contentType: file.url.slice(5, file.url.indexOf(";")),
      });
    }),
  ),
];

/**
 * 내 정보·회원 탈퇴 (백엔드에 이미 있는 API와 같은 모양).
 * NEXT_PUBLIC_API_LIVE에 user를 넣으면 이 묶음은 빼고 진짜 백엔드로 보낸다 (browser.ts)
 */
export const userHandlers = [
  http.get(
    url("/users/me"),
    authed(({ user }) => success(meOf(user))),
  ),

  http.delete(
    url("/users/me"),
    authed(async ({ request, user }) => {
      const body = (await request.json().catch(() => null)) as { confirm?: boolean } | null;
      if (body?.confirm !== true) {
        return fail(422, "CONFIRM_REQUIRED", "회원 탈퇴 확인이 필요합니다.");
      }
      const petIds = new Set(db.pets.filter((p) => p.userId === user.id).map((p) => p.id));
      db.records = db.records.filter((r) => !petIds.has(r.petId));
      db.routines = db.routines.filter((r) => !petIds.has(r.petId));
      db.pets = db.pets.filter((p) => !petIds.has(p.id));
      db.cards = db.cards.filter((c) => c.userId !== user.id);
      db.files = db.files.filter((f) => f.ownerId !== user.id);
      db.users = db.users.filter((u) => u.id !== user.id);
      db.session = { userId: null, token: null };
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];

/** 스웨거에 아직 없는 API (개체 상태 바꾸기·인계 카드). 로그인이 진짜여도 목업이 답한다 */
export const appHandlers = [
  http.post(
    url("/pets/:petId/status-changes"),
    authed(async ({ request, params, user }) => {
      const pet = myPet(user, params.petId);
      if (!pet) return notFound();
      const input = (await request.json()) as PetStatusChangeInput;
      if (input.type === "end") {
        pet.status = "ended";
        pet.endReason = input.reason;
        pet.endedOn = input.date;
      } else {
        pet.status = "active";
        pet.endReason = null;
        pet.endedOn = null;
      }
      return HttpResponse.json(serializePet(pet));
    }),
  ),

  // ── 인계 카드 (2차) ─────────────────────────────────────
  http.post(
    url("/handover-cards"),
    authed(async ({ request, user }) => {
      const { petId, scope } = (await request.json()) as { petId: string; scope: HandoverScope };
      if (!myPet(user, petId)) return notFound();
      const now = new Date();
      const card: DbCard = {
        code: Math.random().toString(36).slice(2, 10).toUpperCase(),
        userId: user.id,
        petId,
        scope,
        status: "unused",
        createdAt: now.toISOString(),
        expiresAt: addDays(now, 7).toISOString(),
      };
      db.cards.push(card);
      return HttpResponse.json(serializeCard(card, appOrigin()), {
        status: 201,
      });
    }),
  ),

  http.get(
    url("/handover-cards"),
    authed(({ user }) =>
      HttpResponse.json(
        db.cards
          .filter((c) => c.userId === user.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((c) => serializeCard(c, appOrigin())),
      ),
    ),
  ),

  http.get(url("/handover-cards/:code"), async ({ params }) => {
    await wait();
    const card = db.cards.find((c) => c.code === params.code);
    if (!card) return notFound();
    const status = cardStatus(card);
    const pet = db.pets.find((p) => p.id === card.petId);
    const sender = db.users.find((u) => u.id === card.userId);
    const usable = status === "unused" && pet;
    const since = ymd(subDays(new Date(), card.scope.recordWeeks * 7));
    const preview: HandoverPreview = {
      code: card.code,
      status,
      senderNickname: usable && card.scope.nickname ? (sender?.nickname ?? null) : null,
      recordWeeks: usable ? card.scope.recordWeeks : 0,
      pet: usable
        ? {
            name: pet.name,
            speciesId: pet.speciesId,
            morph: pet.morph,
            lifeStageCode: stageCodeOf(pet),
            hatchedOn: pet.hatchedOn,
            handedOverOn: pet.endedOn ?? ymd(new Date()),
          }
        : null,
      routines:
        usable && card.scope.routines
          ? db.routines
              .filter((r) => r.petId === pet.id && r.enabled)
              .map((r) => ({ careItem: r.careItem, intervalDays: r.intervalDays }))
          : [],
      records:
        usable && card.scope.recordWeeks > 0
          ? db.records
              .filter((r) => r.petId === pet.id && !r.deletedAt)
              .filter((r) => ymd(parseISO(r.occurredAt)) >= since || pet.endedOn !== null)
              .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
              .slice(0, 12)
              .map((r) => ({
                occurredAt: r.occurredAt,
                careItem: CARE_ITEM_LABEL[r.careItem],
                intake: r.intake,
                weightG: r.weightG,
                memo: r.memo,
                method: r.method,
                photoCount: card.scope.photos ? r.photoIds.length : 0,
              }))
          : null,
    };
    return HttpResponse.json(preview);
  }),

  http.post(
    url("/handover-cards/:code/accept"),
    authed(async ({ request, params, user }) => {
      const card = db.cards.find((c) => c.code === params.code);
      if (!card) return notFound();
      if (cardStatus(card) !== "unused") {
        return fail(410, "CARD_UNAVAILABLE", "이 인계 카드는 열 수 없어요.");
      }
      const source = db.pets.find((p) => p.id === card.petId)!;
      const input = (await request.json()) as HandoverAcceptInput;
      const pet = {
        ...source,
        id: nextNumericId(),
        userId: user.id,
        name: input.name.trim(),
        hatchedOn: input.hatchedOn,
        // 카드에서 고른 단계 (v1.2 T03). 부화일로 계산되는 값과 다를 때만 직접 고른 값으로 둔다
        manualStageCode: input.lifeStageCode,
        acquiredOn: input.acquiredOn,
        photoFileId: null,
        status: "active" as const,
        endReason: null,
        endedOn: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };
      db.pets.push(pet);
      const override = input.importRoutines
        ? Object.fromEntries(
            db.routines
              .filter((r) => r.petId === source.id)
              .map((r) => [r.careItem, r.intervalDays]),
          )
        : undefined;
      // 다음 예정일은 등록일 기준으로 다시 계산
      addRoutines(db, pet.id, pet.speciesId, careStageOf(pet), new Date(), override);
      card.status = "accepted";
      return HttpResponse.json(serializePet(pet), { status: 201 });
    }),
  ),

  http.delete(
    url("/handover-cards/:code"),
    authed(({ params, user }) => {
      const card = db.cards.find((c) => c.code === params.code && c.userId === user.id);
      if (!card) return notFound();
      if (cardStatus(card) !== "unused") {
        return fail(409, "CARD_NOT_CANCELABLE", "사용 전 카드만 취소할 수 있어요.");
      }
      card.status = "canceled";
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  // 서버 상태 (HealthResponse, 봉투 없음)
  http.get(url("/health"), () => HttpResponse.json({ status: "UP" })),
];

export const handlers = [
  ...authHandlers,
  ...speciesHandlers,
  ...petHandlers,
  ...routineHandlers,
  ...recordHandlers,
  ...fileHandlers,
  ...userHandlers,
  ...appHandlers,
];
