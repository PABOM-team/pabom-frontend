import { describe, expect, it } from "vitest";
import { taskTitle } from "./task";

describe("taskTitle", () => {
  const feed = { title: "급여", recordKind: "intake" } as const;

  it("오늘 할 일 응답의 먹이 이름(기록에 적은 이름)을 기본 먹이보다 먼저 붙인다 (backend#73)", () => {
    expect(taskTitle({ ...feed, foodName: "인공 사료" }, "귀뚜라미")).toBe("급여 · 인공 사료");
  });

  it("응답에 먹이 이름이 없으면 가이드라인 기본 먹이를 붙인다", () => {
    expect(taskTitle({ ...feed, foodName: null }, "귀뚜라미")).toBe("급여 · 귀뚜라미");
    expect(taskTitle(feed)).toBe("급여");
  });

  it("급여가 아닌 할 일에는 먹이 이름을 붙이지 않는다", () => {
    expect(taskTitle({ title: "분무", recordKind: "check", foodName: "인공 사료" }, "귀뚜라미")).toBe("분무");
  });
});
