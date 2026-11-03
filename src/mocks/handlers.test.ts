// @vitest-environment node
// 사진 업로드(FormData)가 jsdom의 FormData와 노드 fetch 사이에서 깨져서 노드 환경으로 돌린다
import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { apiBaseUrl } from "@/shared/api/client";
import {
  authApi,
  filesApi,
  healthApi,
  meApi,
  petsApi,
  recordsApi,
  routinesApi,
  speciesApi,
  todayApi,
} from "@/shared/api/endpoints";
import { clearSession, setAccessToken, setStoredAccount } from "@/shared/api/session";
import { todayYmd } from "@/shared/lib/date";
import { resetDb } from "./db";
import { server } from "./node";

// 노드 환경에는 sessionStorage가 없어 메모리로 흉내 낸다 (저장 계정 정보)
const memory = new Map<string, string>();
Object.assign(globalThis, {
  sessionStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  },
});

/** 로그인 주소 → (카카오·구글 대신 목업이 넘겨 준) 인가 코드로 콜백 */
async function callback(provider: "kakao" | "google") {
  const { authorizationUrl } = await authApi.loginUrl(provider);
  const query = new URL(authorizationUrl).searchParams;
  return authApi.callback(provider, { code: query.get("code")!, state: query.get("state")! });
}

/** 새 회원이면 필수 약관에 동의해 가입까지 마친다 */
async function login(provider: "kakao" | "google") {
  const result = await callback(provider);
  if ("signupToken" in result) {
    const done = await meApi.agree(["TERMS", "PRIVACY", "AGE_14"], result.signupToken);
    setAccessToken(done.accessToken);
  } else {
    setAccessToken(result.accessToken);
  }
  return result;
}

const envelope = (data: unknown) =>
  HttpResponse.json({ resultType: "SUCCESS", success: { data }, error: null });

/** 목업 시드: 콩이(1)·달이(2)는 키우는 중, 별이(3)·초코(4)는 함께했던 개체 */
const KONG = "1";

describe("목업 API", () => {
  beforeEach(() => {
    resetDb();
    clearSession();
  });

  it("카카오는 기록이 있는 회원, 구글은 약관 동의 전 새 회원이다", async () => {
    expect((await callback("kakao")).user.status).toBe("ACTIVE");
    const google = await callback("google");
    expect(google.user.status).toBe("PENDING_TERMS");
    expect("signupToken" in google).toBe(true);
  });

  it("약관 동의는 가입 토큰으로 하고, 필수 약관이 빠지면 422, 다 쓴 토큰은 401", async () => {
    const google = await callback("google");
    if (!("signupToken" in google)) throw new Error("가입 토큰이 와야 한다");
    await expect(meApi.agree(["TERMS"], google.signupToken)).rejects.toMatchObject({
      response: { status: 422 },
    });
    const done = await meApi.agree(["TERMS", "PRIVACY", "AGE_14"], google.signupToken);
    expect(done.user.status).toBe("ACTIVE");
    await expect(
      meApi.agree(["TERMS", "PRIVACY", "AGE_14"], google.signupToken),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("진짜 백엔드 access 토큰(JWT)도 받아서 그 회원의 빈 목업 계정을 만든다", async () => {
    const payload = btoa(JSON.stringify({ sub: "42", tokenType: "ACCESS" }));
    setStoredAccount({ id: 42, nickname: "파봄", provider: "google" });
    setAccessToken(`eyJhbGciOiJIUzI1NiJ9.${payload}.signature`);
    expect(await meApi.get()).toMatchObject({
      id: 42,
      nickname: "파봄",
      status: "ACTIVE",
      petCount: { active: 0, ended: 0 },
    });
  });

  it("회원 탈퇴는 확인(confirm)을 보내야 하고, 탈퇴하면 내 정보를 못 불러온다", async () => {
    await login("kakao");
    expect(await meApi.get()).toMatchObject({ status: "ACTIVE", petCount: { active: 2 } });
    await meApi.withdraw();
    await expect(meApi.get()).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("서버 상태는 봉투 없이 온다", async () => {
    expect(await healthApi.get()).toEqual({ status: "UP" });
  });

  // ── 오늘 할 일·일정 ─────────────────────────────────────

  it("오늘 할 일은 백엔드 모양(개체별 tasks·대문자 status)을 앱 할 일로 바꾸고, 지난 할 일을 먼저 보여 준다", async () => {
    await login("kakao");
    const today = await todayApi.get(todayYmd());
    const todo = today.items.filter((t) => t.state === "todo");
    expect(todo[0]).toMatchObject({
      petName: "콩이",
      careItem: "MIST",
      careItemName: "분무",
      recordKind: "check",
      overdueDays: 1,
      intervalDays: 1,
    });

    const result = await routinesApi.complete(todo[0]!.routineId, {});
    expect(result.record).toMatchObject({ careItem: "MIST", type: "done" });
    expect(result.routine.nextDueOn).toBeTruthy();
    const after = await todayApi.get(todayYmd());
    expect(after.items.find((t) => t.routineId === todo[0]!.routineId)).toMatchObject({
      state: "done",
      record: { id: result.record.id },
    });

    // 되돌리기 = 기록 삭제 → 다시 할 일
    await recordsApi.remove(result.record.id);
    const undone = await todayApi.get(todayYmd());
    expect(undone.items.find((t) => t.routineId === todo[0]!.routineId)?.state).toBe("todo");
  });

  it("같은 날 두 번 체크하면 409로 막는다", async () => {
    await login("kakao");
    const { items } = await todayApi.get(todayYmd());
    const feeding = items.find((t) => t.careItem === "FEED" && t.state === "todo")!;
    await routinesApi.complete(feeding.routineId, { intake: "all" });
    await expect(routinesApi.complete(feeding.routineId, {})).rejects.toMatchObject({
      response: { status: 409 },
    });
  });

  it("건너뛰기는 이유 칩을 reasonCode로 보내고 건너뜀 기록으로 돌아온다", async () => {
    await login("kakao");
    const { items } = await todayApi.get(todayYmd());
    const task = items.find((t) => t.state === "todo")!;
    const result = await routinesApi.skip(task.routineId, "일정이 맞지 않음");
    expect(result.record).toMatchObject({ type: "skipped", skipReason: "일정이 맞지 않음" });
    expect(result.todayState).toBe("skipped");
    const after = await todayApi.get(todayYmd());
    expect(after.items.find((t) => t.routineId === task.routineId)?.state).toBe("skipped");
  });

  it("미루기는 postponeTo로 보내고, 미룬 할 일은 원래 예정일과 함께 그날 예정으로 보인다", async () => {
    await login("kakao");
    const { items } = await todayApi.get(todayYmd());
    const task = items.find((t) => t.state === "todo")!;
    const target = new Date();
    target.setDate(target.getDate() + 2);
    const ymd = target.toISOString().slice(0, 10);
    const state = await routinesApi.postpone(task.routineId, ymd);
    expect(state).toMatchObject({ id: task.routineId, nextDueOn: ymd });

    const moved = await todayApi.get(ymd);
    expect(moved.items.find((t) => t.routineId === task.routineId)).toMatchObject({
      state: "planned",
      originalDueOn: task.dueOn,
    });
    expect((await todayApi.get(todayYmd())).items.some((t) => t.routineId === task.routineId)).toBe(
      false,
    );
  });

  it("체크 리스트는 백엔드 루틴 모양(careItemCode·careItemName·recordType·active)을 앱 일정으로 바꾸고, 수정·초기화한다", async () => {
    await login("kakao");
    const routines = await routinesApi.list(KONG);
    // 크레스티드 게코 기본 항목 8개. 기본 꺼짐 항목(FEED_INSECT·UVB_LAMP)은 꺼진 채로 온다
    expect(routines.map((r) => [r.careItem, r.enabled])).toEqual([
      ["CLEAN", true],
      ["FEED", true],
      ["FEED_INSECT", false],
      ["MIST", true],
      ["SHED_CHECK", true],
      ["UVB_LAMP", false],
      ["WATER", true],
      ["WEIGHT", true],
    ]);
    const feeding = routines.find((r) => r.careItem === "FEED")!;
    expect(feeding).toMatchObject({
      petId: KONG,
      careItemName: "급여",
      recordKind: "intake",
      intervalDays: 1,
      standardIntervalDays: 1,
      customized: false,
      enabled: true,
      foodName: "인공 사료",
      basis: { condition: "크레스티드 게코 · 어린 개체", version: "1.2" },
    });
    // 꺼진 루틴은 nextDueAt·startDate가 null로 와도 깨지지 않는다
    expect(routines.find((r) => r.careItem === "UVB_LAMP")).toMatchObject({
      careItemName: "UVB 램프 교체",
      recordKind: "check",
      nextDueOn: null,
      startDate: null,
    });

    const updated = await routinesApi.update(feeding.id, { intervalDays: 5, enabled: false });
    expect(updated).toMatchObject({
      intervalDays: 5,
      customized: true,
      enabled: false,
      careItemName: "급여",
      recordKind: "intake",
      nextDueOn: null,
    });
    await expect(routinesApi.update(feeding.id, { intervalDays: 400 })).rejects.toMatchObject({
      response: { status: 400 },
    });

    const reset = await routinesApi.reset(feeding.id);
    expect(reset).toMatchObject({ intervalDays: 1, customized: false });
  });

  it("모르는 관리 항목 코드도 백엔드 이름·기록 방식 그대로 일정·오늘 할 일·기록으로 흘러간다", async () => {
    const routine = {
      routineId: 77,
      petId: 12,
      careItemCode: "NEW_ITEM",
      careItemName: "새 항목",
      active: true,
      intervalDays: 2,
      cycleSource: "GUIDELINE",
      defaultCycleDays: 2,
      minDays: 1,
      maxDays: 4,
      isOutOfRange: false,
      nextDueAt: "2026-11-03T12:00:00+09:00",
      startDate: "2026-11-03",
      guidelineVersion: "1.2",
      recordType: "OX",
      description: null,
    };
    server.use(
      http.get(`${apiBaseUrl}/pets/12/routines`, () => envelope([routine])),
      http.get(`${apiBaseUrl}/today`, () =>
        envelope({
          date: "2026-11-03",
          summary: null,
          emptyReason: null,
          nextUpcoming: null,
          pets: [
            {
              petId: 12,
              name: "모치",
              tasks: [
                {
                  routineId: 77,
                  itemCode: "NEW_ITEM",
                  itemName: "새 항목",
                  status: "DUE",
                  dueDate: "2026-11-03",
                  overdueDays: null,
                  resultType: "OX",
                  unit: null,
                  lastRecord: null,
                },
              ],
            },
          ],
        }),
      ),
      http.get(`${apiBaseUrl}/records`, () =>
        envelope({
          items: [
            {
              id: 5,
              petId: 12,
              petName: "모치",
              itemCode: "NEW_ITEM",
              itemName: "새 항목",
              recordType: "DONE",
              occurredAt: "2026-11-03T09:00:00+09:00",
              timePrecision: "EXACT",
              createdAt: "2026-11-03T09:00:00+09:00",
              outcome: null,
              needsResult: false,
              valueNum: null,
              unit: null,
              detailSummary: null,
              memoPreview: null,
              reasonCode: null,
              hasPhoto: false,
              isEdited: false,
              source: "ROUTINE",
              deletedAt: null,
            },
          ],
          nextCursor: null,
          lastFeeding: null,
        }),
      ),
    );
    await login("google");
    expect(await routinesApi.list("12")).toMatchObject([
      { careItem: "NEW_ITEM", careItemName: "새 항목", recordKind: "check" },
    ]);
    const today = await todayApi.get("2026-11-03");
    expect(today.items).toMatchObject([
      {
        careItem: "NEW_ITEM",
        careItemName: "새 항목",
        title: "새 항목",
        recordKind: "check",
        overdueDays: 0,
      },
    ]);
    const { items } = await recordsApi.list({ petId: "12" });
    expect(items).toMatchObject([
      { careItem: "NEW_ITEM", careItemName: "새 항목", recordKind: "check", weightG: null },
    ]);
  });

  // ── 종·가이드라인 ───────────────────────────────────────

  it("종·모프는 로그인 없이 부르고, MVP 밖의 종(볼파이톤)은 목록에서 빠진다", async () => {
    const species = await speciesApi.list();
    expect(species.map((s) => [s.id, s.serverId])).toEqual([
      ["crested_gecko", 1],
      ["leopard_gecko", 2],
    ]);
    const morphs = await speciesApi.morphs(species[1]!.serverId);
    expect(morphs[0]).toMatchObject({ id: 8, code: "NORMAL", name: "노멀" });
    await expect(speciesApi.morphs(999)).rejects.toMatchObject({ response: { status: 404 } });
  });

  it("관리 가이드라인은 백엔드 종 ID로 부르고, 종의 모든 항목을 어린 개체·성체 기준표로 바꾼다", async () => {
    const table = await speciesApi.careStandards("leopard_gecko");
    expect(table).toMatchObject({ speciesId: "leopard_gecko", version: "1.2", isDraft: false });
    // UNKNOWN 단계(어린 개체 기준 적용)는 표에서 뺀다
    expect([...new Set(table.standards.map((s) => s.lifeStageCode))]).toEqual([
      "juvenile",
      "adult",
    ]);
    expect(
      table.standards.find((s) => s.lifeStageCode === "adult" && s.careItem === "FEED"),
    ).toMatchObject({
      careItemName: "급여",
      recordKind: "intake",
      intervalDays: 3,
      defaultEnabled: true,
      label: "reference",
    });
    expect(
      table.standards.find((s) => s.lifeStageCode === "juvenile" && s.careItem === "HUMID_HIDE"),
    ).toMatchObject({ careItemName: "습식 은신처 적시기", recordKind: "check", intervalDays: 3 });
    expect(
      table.standards.find((s) => s.lifeStageCode === "adult" && s.careItem === "UVB_LAMP"),
    ).toMatchObject({ defaultEnabled: false });
    // 레오파드 게코는 분무 일정이 없다
    expect(table.standards.some((s) => s.careItem === "MIST")).toBe(false);
    // 출처는 쉼표로 나눠 한 번씩만
    expect(table.references.map((r) => r.title)).toEqual(["RSPCA", "RVC"]);
  });

  it("공개 API에는 access 토큰을 싣지 않는다", async () => {
    let authorization: string | null = "unset";
    server.use(
      http.get(`${apiBaseUrl}/species`, ({ request }) => {
        authorization = request.headers.get("Authorization");
        return envelope([]);
      }),
    );
    setAccessToken("some-token");
    await speciesApi.list();
    expect(authorization).toBeNull();
  });

  // ── 개체 ────────────────────────────────────────────────

  it("개체 등록은 백엔드 본문(숫자 ID·대문자 값)으로 보내고 앱 개체로 받는다", async () => {
    await login("google");
    const pet = await petsApi.create({
      clientRequestId: "550e8400-e29b-41d4-a716-446655440000",
      speciesId: 1,
      name: " 모찌 ",
      morphIds: [2],
      customMorph: null,
      hatchedAt: null,
      adoptedAt: null,
      lifeStageId: 2,
      stageCertainty: "ESTIMATED",
      sex: "FEMALE",
      sexCertainty: "CONFIRMED",
      photoFileId: null,
    });
    expect(pet).toMatchObject({
      name: "모찌",
      speciesId: "crested_gecko",
      morph: "할리퀸",
      sex: "female",
      lifeStageCode: "juvenile",
      lifeStageSource: "manual",
      stageUncertain: true,
    });
    expect(Number(pet.id)).toBeGreaterThan(0);
    const detail = await petsApi.get(pet.id);
    expect(detail.pet).toEqual(pet);
    // 목업은 등록 때 기준표대로 체크 리스트를 만든다
    expect(detail.routines.map((r) => r.careItem)).toContain("FEED");
  });

  it("개체 상세는 개체·체크 리스트·최근 기록을 따로 불러 합친다", async () => {
    server.use(
      http.get(`${apiBaseUrl}/pets/12`, () =>
        envelope({
          id: 12,
          speciesId: 2,
          name: "콩이",
          morphs: [],
          customMorph: "트라이컬러",
          hatchedAt: "2026-03-02",
          adoptedAt: null,
          lifeStageId: null,
          stageCertainty: "UNKNOWN",
          sex: "UNKNOWN",
          sexCertainty: "UNKNOWN",
          photoFileId: null,
          createdAt: "2026-10-18T07:52:18.222",
          updatedAt: "2026-10-18T07:52:18.222",
        }),
      ),
      http.get(`${apiBaseUrl}/pets/12/routines`, () => envelope([])),
      http.get(`${apiBaseUrl}/records`, () =>
        envelope({ items: [], nextCursor: null, lastFeeding: null }),
      ),
    );
    await login("google");
    const detail = await petsApi.get("12");
    expect(detail.routines).toEqual([]);
    expect(detail.recentRecords).toEqual([]);
    expect(detail.pet).toMatchObject({
      id: "12",
      speciesId: "leopard_gecko",
      morph: "트라이컬러",
      status: "active",
      lifeStageSource: "hatch",
      todayRemaining: 0,
    });
  });

  it("개체 목록은 백엔드 모양으로 받고, 키우는 중·함께했던 개체로 나눈다", async () => {
    await login("kakao");
    const active = await petsApi.list("active");
    const ended = await petsApi.list("ended");
    expect(active.find((p) => p.id === KONG)).toMatchObject({
      name: "콩이",
      speciesId: "crested_gecko",
      morph: "할리퀸",
      status: "active",
    });
    expect(ended.length).toBeGreaterThan(0);
    expect(ended.every((p) => p.status === "ended")).toBe(true);
  });

  it("백엔드 목록에 없는 값(성별·상태·할 일 수)은 임시 값으로 채우고, 사진은 /files/{id}로 받는다", async () => {
    server.use(
      http.get(`${apiBaseUrl}/pets`, () =>
        envelope([
          {
            id: 12,
            name: "콩이",
            speciesId: 1,
            speciesName: "크레스티드 게코",
            morphs: [{ id: 2, code: "HARLEQUIN", name: "할리퀸" }],
            customMorph: null,
            lifeStageId: 2,
            lifeStageName: "어린 개체",
            photoFileId: 301,
          },
        ]),
      ),
      http.get(`${apiBaseUrl}/files/301`, () =>
        envelope({ url: "https://storage.example.kr/301", expiresAt: "2026-10-24T10:10:00+09:00" }),
      ),
    );
    await login("google");
    expect(await petsApi.list("active")).toEqual([
      expect.objectContaining({
        id: "12",
        morph: "할리퀸",
        lifeStageCode: "juvenile",
        sex: "unknown",
        status: "active",
        todayRemaining: 0,
        photoUrl: "https://storage.example.kr/301",
      }),
    ]);
    // 백엔드는 status 조건이 없어 함께했던 개체는 비어 있다
    expect(await petsApi.list("ended")).toEqual([]);
  });

  it("정보 수정은 바꾼 칸만 백엔드 본문으로 보낸다", async () => {
    await login("kakao");
    const updated = await petsApi.update(KONG, {
      name: "콩콩이",
      morphIds: [],
      customMorph: "트라이컬러",
      sex: "FEMALE",
      sexCertainty: "CONFIRMED",
    });
    expect(updated).toMatchObject({ name: "콩콩이", morph: "트라이컬러", sex: "female" });
    expect((await petsApi.get(KONG)).pet).toMatchObject({ name: "콩콩이" });
    await expect(petsApi.update(KONG, { name: " " })).rejects.toMatchObject({
      response: { status: 422 },
    });
  });

  it("개체를 지우면 개체와 기록이 함께 사라진다 (204)", async () => {
    await login("kakao");
    await petsApi.remove(KONG);
    await expect(petsApi.get(KONG)).rejects.toMatchObject({ response: { status: 404 } });
    expect((await petsApi.list("active")).some((p) => p.id === KONG)).toBe(false);
    expect((await recordsApi.list({ limit: 200 })).items.some((r) => r.petId === KONG)).toBe(false);
  });

  it("남의 개체는 404로 존재를 숨긴다", async () => {
    await login("google");
    await expect(petsApi.get(KONG)).rejects.toMatchObject({ response: { status: 404 } });
  });

  // ── 기록·파일 ───────────────────────────────────────────

  it("기록 목록은 커서로 이어 받고, 항목 조건은 itemCodes로 보낸다", async () => {
    await login("kakao");
    const first = await recordsApi.list({ petId: KONG, limit: 5 });
    expect(first.items).toHaveLength(5);
    expect(first.nextCursor).not.toBeNull();
    const second = await recordsApi.list({ petId: KONG, limit: 5, cursor: first.nextCursor! });
    expect(second.items[0]!.id).not.toBe(first.items[0]!.id);
    // 50개가 넘는 limit은 여러 페이지를 이어 받는다
    const many = await recordsApi.list({ petId: KONG, limit: 80 });
    expect(many.items.length).toBeGreaterThan(50);

    const weights = await recordsApi.list({ petId: KONG, careItem: "WEIGHT", limit: 50 });
    expect(weights.items.length).toBeGreaterThan(0);
    expect(
      weights.items.every(
        (r) => r.careItem === "WEIGHT" && r.careItemName === "체중" && r.weightG !== null,
      ),
    ).toBe(true);
  });

  it("직접 기록은 itemCode·outcome·photoFileId로 보내고, 사진은 한 장만 싣는다", async () => {
    await login("kakao");
    const photo = await filesApi.upload(new File(["x"], "a.png", { type: "image/png" }), "record");
    expect(Number(photo.id)).toBeGreaterThan(0);
    expect(await filesApi.url(photo.id)).toBe(photo.url);

    const record = await recordsApi.create({
      petId: KONG,
      careItem: "FEED",
      occurredAt: new Date().toISOString(),
      intake: "partial",
      memo: "조금 남겼어요",
      photoFileIds: [photo.id],
    });
    expect(record).toMatchObject({
      petId: KONG,
      petName: "콩이",
      careItem: "FEED",
      careItemName: "급여",
      recordKind: "intake",
      type: "done",
      method: "manual",
      intake: "partial",
      memo: "조금 남겼어요",
      photos: [{ id: photo.id, url: photo.url }],
      revisionNo: 1,
    });
    // 사진이 있는 기록은 목록에서도 사진 주소가 채워진다
    const listed = (await recordsApi.list({ petId: KONG, limit: 3 })).items.find(
      (r) => r.id === record.id,
    );
    expect(listed?.photos).toEqual([{ id: photo.id, url: photo.url }]);
    await expect(
      recordsApi.create({
        petId: KONG,
        careItem: "MEMO",
        occurredAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    ).rejects.toMatchObject({ response: { status: 422 } });
    // 종에 없는 항목은 422 (CARE_ITEM_INVALID)
    await expect(
      recordsApi.create({
        petId: KONG,
        careItem: "HUMID_HIDE",
        occurredAt: new Date().toISOString(),
      }),
    ).rejects.toMatchObject({ response: { status: 422 } });
  });

  it("정정은 revisionNo로 낙관적 잠금을 하고 정정 이력을 남긴다", async () => {
    await login("kakao");
    const { items } = await recordsApi.list({ petId: KONG, careItem: "FEED", limit: 1 });
    const detail = await recordsApi.get(items[0]!.id);
    expect(detail.revisionNo).toBe(1);

    const updated = await recordsApi.update(detail, { intake: "none", memo: "결국 안 먹음" });
    expect(updated).toMatchObject({ intake: "none", memo: "결국 안 먹음", revisionNo: 2 });
    expect(updated.revisions).toHaveLength(0);
    const again = await recordsApi.get(detail.id);
    expect(again.revisions).toHaveLength(1);
    expect(again.revisions[0]!.summary).toContain("먹은 정도");

    // 낡은 revisionNo로 정정하면 409
    await expect(recordsApi.update(detail, { memo: "또" })).rejects.toMatchObject({
      response: { status: 409 },
    });
    // 목록에서 온 기록(revisionNo 없음)은 상세를 먼저 불러 정정한다
    const fromList = await recordsApi.update({ id: detail.id, revisionNo: null }, { memo: "또" });
    expect(fromList.revisionNo).toBe(3);
  });

  it("삭제한 기록은 복구할 수 있고, 지우지 않은 기록은 409", async () => {
    await login("kakao");
    const { items } = await recordsApi.list({ petId: KONG, limit: 1 });
    const id = items[0]!.id;
    await expect(recordsApi.restore(id)).rejects.toMatchObject({ response: { status: 409 } });
    const removed = await recordsApi.remove(id);
    expect(removed.restorableUntil).toBeTruthy();
    await expect(recordsApi.get(id)).rejects.toMatchObject({ response: { status: 404 } });
    const restored = await recordsApi.restore(id);
    expect(restored.id).toBe(id);
    expect((await recordsApi.get(id)).id).toBe(id);
  });

  it("사진은 purpose 없이 올리면 400, 남의 파일 주소는 404", async () => {
    await login("kakao");
    server.use(
      http.post(`${apiBaseUrl}/files`, ({ request }) =>
        new URL(request.url).searchParams.get("purpose") === "RECORD_PHOTO"
          ? envelope({ id: 7, url: "u" })
          : HttpResponse.json({ resultType: "FAIL", error: {} }, { status: 400 }),
      ),
    );
    expect(await filesApi.upload(new File(["x"], "a.png"), "record")).toEqual({
      id: "7",
      url: "u",
    });
    server.resetHandlers();
    await expect(filesApi.url(999999)).rejects.toMatchObject({ response: { status: 404 } });
  });
});
