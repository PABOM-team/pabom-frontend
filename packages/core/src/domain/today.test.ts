import { describe, expect, it } from "vitest";
import { canPostpone, isPostponed, postponeQuickDates } from "./today";

const today = new Date(2026, 10, 21); // 2026-11-21 (토)

describe("canPostpone", () => {
  it("오늘·지난 할 일은 미룰 수 있다", () => {
    expect(canPostpone({ state: "todo", originalDueOn: null })).toBe(true);
    expect(canPostpone({ state: "todo", originalDueOn: "2026-11-20" })).toBe(true);
  });

  it("앞 날짜 할 일은 이미 미룬 것만 다시 미룰 수 있다 (T06-04)", () => {
    expect(canPostpone({ state: "planned", originalDueOn: "2026-11-21" })).toBe(true);
    expect(canPostpone({ state: "planned", originalDueOn: null })).toBe(false);
  });

  it("완료·건너뜀은 미루지 않는다", () => {
    expect(canPostpone({ state: "done", originalDueOn: null })).toBe(false);
    expect(canPostpone({ state: "skipped", originalDueOn: "2026-11-21" })).toBe(false);
  });
});

describe("isPostponed", () => {
  it("원래 예정일이 있으면 미룬 할 일", () => {
    expect(isPostponed({ originalDueOn: "2026-11-21" })).toBe(true);
    expect(isPostponed({ originalDueOn: null })).toBe(false);
  });
});

describe("postponeQuickDates", () => {
  it("평소에는 내일·모레", () => {
    expect(postponeQuickDates({ dueOn: "2026-11-21" }, today)).toEqual([
      { value: "2026-11-22", label: "내일" },
      { value: "2026-11-23", label: "모레" },
    ]);
  });

  it("지금 예정일과 같은 날은 빼고 다음 날을 채운다", () => {
    expect(postponeQuickDates({ dueOn: "2026-11-23" }, today)).toEqual([
      { value: "2026-11-22", label: "내일" },
      { value: "2026-11-24", label: "글피" },
    ]);
  });
});
