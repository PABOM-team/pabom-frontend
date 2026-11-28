import { afterEach, describe, expect, it, vi } from "vitest";
import { backendTodaySchema, type BackendTask, type BackendToday } from "../domain/backend";
import { intakeOptionsFor } from "../domain/care";
import { newRequestId, toCompleteRequest, toToday } from "./adapters";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newRequestId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("crypto 가 있으면 UUID v4 를 만든다", () => {
    expect(newRequestId()).toMatch(UUID_V4);
  });

  it("crypto 가 없어도 겹치지 않는 UUID v4 를 만든다", () => {
    vi.stubGlobal("crypto", undefined);
    const ids = Array.from({ length: 50 }, () => newRequestId());
    expect(ids.every((id) => UUID_V4.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("toToday", () => {
  const task = (over: Partial<BackendTask>): BackendTask => ({
    routineId: 1,
    itemCode: "MIST",
    itemName: "분무",
    status: "DUE",
    dueDate: "2026-11-23",
    overdueDays: null,
    resultType: "OX",
    ...over,
  });
  const today = (date: string, tasks: BackendTask[]): BackendToday => ({
    date,
    pets: [{ petId: 37, name: "콩이", tasks }],
  });

  it("앞 날짜에는 그날 예정된 할 일만 남기고, 그때까지 밀린 할 일(OVERDUE)은 뺀다 (T06-03)", () => {
    const raw = today("2026-11-28", [
      // 11/23으로 미룬 분무: 28일 조회에도 OVERDUE로 따라온다
      task({ routineId: 285, status: "OVERDUE", dueDate: "2026-11-23", overdueDays: 5 }),
      task({ routineId: 286, itemCode: "MOLT_CHECK", itemName: "탈피 확인", dueDate: "2026-11-28" }),
    ]);
    const result = toToday(raw, "2026-11-21");
    expect(result.items.map((t) => t.routineId)).toEqual(["286"]);
    expect(result.items[0]?.state).toBe("planned");
  });

  it("미룬 날짜 당일에는 미룬 할 일이 보인다", () => {
    const raw = today("2026-11-23", [
      task({ routineId: 285, dueDate: "2026-11-23", originalDueDate: "2026-11-21" }),
    ]);
    const [item] = toToday(raw, "2026-11-21").items;
    expect(item?.routineId).toBe("285");
    expect(item?.originalDueOn).toBe("2026-11-21");
  });

  it("오늘은 밀린 할 일(OVERDUE)도 그대로 보여 준다", () => {
    const raw = today("2026-11-21", [
      task({ routineId: 285, status: "OVERDUE", dueDate: "2026-11-20", overdueDays: 1 }),
    ]);
    const [item] = toToday(raw, "2026-11-21").items;
    expect(item?.state).toBe("todo");
    expect(item?.overdueDays).toBe(1);
  });

  it("급여 할 일은 응답의 먹이 이름(기록에 적은 이름)을 받고, 비어 있으면 null로 둔다 (backend#73)", () => {
    const feed = { itemCode: "FEED", itemName: "급여", resultType: "FEED" } as const;
    const raw = today("2026-11-21", [
      task({ routineId: 1, ...feed, status: "DONE", foodName: "인공 사료" }),
      task({ routineId: 2, ...feed, foodName: "" }),
      task({ routineId: 3, ...feed }),
      task({ routineId: 4, foodName: "인공 사료" }),
    ]);
    const byId = new Map(toToday(raw, "2026-11-21").items.map((t) => [t.routineId, t]));
    expect(byId.get("1")?.foodName).toBe("인공 사료");
    expect(byId.get("2")?.foodName).toBeNull();
    expect(byId.get("3")?.foodName).toBeNull();
    // 급여가 아닌 할 일에는 먹이 이름을 두지 않는다
    expect(byId.get("4")?.foodName).toBeNull();
  });

  it("크레스티드 게코 인공 사료 급여의 먹은 흔적 결과(EATING_TRACE_*)를 받는다 (backend#73)", () => {
    const raw = today("2026-11-21", [
      task({
        routineId: 283,
        itemCode: "FEED",
        itemName: "급여",
        resultType: "FEED",
        status: "DONE",
        lastRecord: {
          recordId: 9,
          recordType: "DONE",
          occurredAt: "2026-11-21T12:00:00+09:00",
          outcome: "EATING_TRACE_FOUND",
        },
      }),
    ]);
    const parsed = backendTodaySchema.parse(raw);
    expect(toToday(parsed, "2026-11-21").items[0]?.record?.intake).toBe("trace_found");
  });
});

describe("인공 사료(DIET) 급여 결과", () => {
  it("먹은 흔적 칩은 EATING_TRACE_FOUND·EATING_TRACE_NOT_FOUND로 보낸다 (OUTCOME_NOT_ALLOWED 방지)", () => {
    const values = intakeOptionsFor("DIET").map((o) => o.value);
    expect(values).toEqual(["trace_found", "trace_not_found", "unobserved"]);
    const outcome = (intake: (typeof values)[number]) =>
      toCompleteRequest({ intake, occurredAt: "2026-11-28T03:26:54.024Z" }).outcome;
    expect(values.map(outcome)).toEqual(["EATING_TRACE_FOUND", "EATING_TRACE_NOT_FOUND", "NOT_OBSERVED"]);
  });

  it("곤충 급여는 기존 값(ATE_ALL…)을 그대로 쓴다", () => {
    expect(intakeOptionsFor("INSECT").map((o) => o.value)).toEqual(["all", "partial", "none", "unobserved"]);
  });
});
