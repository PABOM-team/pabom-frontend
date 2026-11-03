import { describe, expect, it } from "vitest";
import { intakeLabelFor, intakeOptionsFor } from "./care";

describe("intakeOptionsFor", () => {
  it("곤충 묶음은 전부·일부·안 먹음·관찰 못함 순서", () => {
    expect(intakeOptionsFor("INSECT").map((o) => o.label)).toEqual([
      "전부 먹음",
      "일부 먹음",
      "안 먹음",
      "관찰 못함",
    ]);
  });

  it("인공 사료 묶음은 먹은 흔적 있음·없음·관찰 못함 (일부 먹음 없음)", () => {
    expect(intakeOptionsFor("DIET")).toEqual([
      { value: "all", label: "먹은 흔적 있음" },
      { value: "none", label: "먹은 흔적 없음" },
      { value: "unobserved", label: "관찰 못함" },
    ]);
  });

  it("통먹이 묶음은 먹음·안 먹음·관찰 못함", () => {
    expect(intakeOptionsFor("WHOLE_PREY").map((o) => o.value)).toEqual([
      "all",
      "none",
      "unobserved",
    ]);
    expect(intakeOptionsFor("WHOLE_PREY")[0]?.label).toBe("먹음");
  });

  it("묶음을 모르면 곤충 묶음", () => {
    expect(intakeOptionsFor(null)).toEqual(intakeOptionsFor("INSECT"));
    expect(intakeOptionsFor(undefined)).toEqual(intakeOptionsFor("INSECT"));
  });
});

describe("intakeLabelFor", () => {
  it("묶음에 맞는 이름을 준다", () => {
    expect(intakeLabelFor("DIET", "all")).toBe("먹은 흔적 있음");
    expect(intakeLabelFor("WHOLE_PREY", "all")).toBe("먹음");
    expect(intakeLabelFor("INSECT", "all")).toBe("전부 먹음");
    expect(intakeLabelFor(null, "partial")).toBe("일부 먹음");
  });

  it("묶음에 없는 값은 공통 이름으로", () => {
    expect(intakeLabelFor("DIET", "partial")).toBe("일부 먹음");
  });
});
