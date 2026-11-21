import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { feedIntervalFromAnswer, feedRoutineToAsk, getOccurrences, guidelineRange } from "./routine";

const fmt = (dates: Date[]) => dates.map((d) => format(d, "yyyy-MM-dd"));

describe("getOccurrences", () => {
  it("시작일이 구간 안에 있으면 시작일부터 간격대로 나열한다", () => {
    const result = getOccurrences(
      { intervalDays: 3, startDate: "2026-10-01", enabled: true },
      new Date(2026, 9, 1),
      new Date(2026, 9, 10),
    );
    expect(fmt(result)).toEqual(["2026-10-01", "2026-10-04", "2026-10-07", "2026-10-10"]);
  });

  it("시작일이 구간보다 앞이면 구간 안의 첫 회차부터 계산한다", () => {
    const result = getOccurrences(
      { intervalDays: 7, startDate: "2026-09-01", enabled: true },
      new Date(2026, 9, 1),
      new Date(2026, 9, 31),
    );
    expect(fmt(result)).toEqual(["2026-10-06", "2026-10-13", "2026-10-20", "2026-10-27"]);
  });

  it("비활성 루틴은 비어 있다", () => {
    expect(
      getOccurrences(
        { intervalDays: 1, startDate: "2026-10-01", enabled: false },
        new Date(2026, 9, 1),
        new Date(2026, 9, 5),
      ),
    ).toEqual([]);
  });
});

describe("guidelineRange", () => {
  it("가이드라인 주기에 고를 폭이 있으면 범위를 준다", () => {
    expect(guidelineRange({ customized: false, minDays: 7, maxDays: 14 })).toEqual({
      min: 7,
      max: 14,
    });
  });

  it("한 값뿐인 범위(청소 30~30일)는 숨긴다", () => {
    expect(guidelineRange({ customized: false, minDays: 30, maxDays: 30 })).toBeNull();
  });

  it("직접 바꾼 주기나 범위가 없으면 숨긴다", () => {
    expect(guidelineRange({ customized: true, minDays: 7, maxDays: 14 })).toBeNull();
    expect(guidelineRange({ customized: false, minDays: null, maxDays: null })).toBeNull();
  });
});

describe("feedRoutineToAsk", () => {
  it("켜진 첫 급여 일정을 고른다", () => {
    const routines = [
      { id: "a", enabled: true, recordKind: "check" as const },
      { id: "b", enabled: false, recordKind: "intake" as const },
      { id: "c", enabled: true, recordKind: "intake" as const },
    ];
    expect(feedRoutineToAsk(routines)?.id).toBe("c");
  });

  it("급여 일정이 없으면 null", () => {
    expect(feedRoutineToAsk([{ enabled: true, recordKind: "check" as const }])).toBeNull();
  });
});

describe("feedIntervalFromAnswer", () => {
  it("숫자를 넣으면 그 주기", () => {
    expect(feedIntervalFromAnswer("3")).toBe(3);
  });

  it("비우면 모름으로 보고 매일", () => {
    expect(feedIntervalFromAnswer("  ")).toBe(1);
  });

  it("범위 밖이거나 숫자가 아니면 null", () => {
    expect(feedIntervalFromAnswer("0")).toBeNull();
    expect(feedIntervalFromAnswer("366")).toBeNull();
    expect(feedIntervalFromAnswer("2.5")).toBeNull();
  });
});
