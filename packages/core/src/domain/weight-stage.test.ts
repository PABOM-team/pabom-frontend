import { describe, expect, it } from "vitest";
import { LIFE_STAGES } from "./species";
import { isWeightPlateau, weightStageSuggestion } from "./weight-stage";

const species = { lifeStages: LIFE_STAGES, adultWeightG: 35, adultCheckMinAgeMonths: 10 };
const today = new Date(2026, 10, 3);

describe("isWeightPlateau", () => {
  it("최근 3개가 서로 ±5% 안이면 정체", () => {
    expect(isWeightPlateau([30, 29.5, 30.2])).toBe(true);
    expect(isWeightPlateau([30, 28.6, 29])).toBe(true);
  });

  it("5%를 넘게 벌어지면 정체가 아니다", () => {
    expect(isWeightPlateau([30, 28, 26])).toBe(false);
    expect(isWeightPlateau([31.6, 30, 30])).toBe(false);
  });

  it("기록이 3개보다 적으면 정체로 보지 않는다", () => {
    expect(isWeightPlateau([])).toBe(false);
    expect(isWeightPlateau([30, 30])).toBe(false);
  });

  it("최근 3개만 본다", () => {
    expect(isWeightPlateau([30, 30, 30, 10])).toBe(true);
  });
});

describe("weightStageSuggestion", () => {
  it("단계 확인 전이면 체중으로 맞춘 단계를 제안한다 (③)", () => {
    const s = weightStageSuggestion({
      pet: { lifeStageCode: "unknown", hatchedOn: null },
      species,
      weights: [20],
      today,
    });
    expect(s?.reason).toBe("unknown");
    expect(s?.stage.code).toBe("juvenile");
    expect(s?.message).toBe("체중으로 보면 어린 개체예요. 체크 리스트를 맞춰 드릴까요?");
  });

  it("어린 개체가 성체 참고 체중에 닿으면 성체를 제안한다 (②)", () => {
    const s = weightStageSuggestion({
      pet: { lifeStageCode: "juvenile", hatchedOn: null },
      species,
      weights: [35, 20, 10],
      today,
    });
    expect(s?.reason).toBe("adult-weight");
    expect(s?.stage.code).toBe("adult");
  });

  it("어린 개체의 체중이 정체면 성체를 제안한다 (①)", () => {
    const s = weightStageSuggestion({
      pet: { lifeStageCode: "juvenile", hatchedOn: "2025-01-01" },
      species,
      weights: [30, 30, 29.5],
      today,
    });
    expect(s?.reason).toBe("plateau");
  });

  it("성체 확인 최소 나이가 안 됐으면 묻지 않는다", () => {
    const pet = { lifeStageCode: "juvenile", hatchedOn: "2026-06-01" };
    expect(weightStageSuggestion({ pet, species, weights: [40], today })).toBeNull();
    expect(weightStageSuggestion({ pet, species, weights: [30, 30, 30], today })).toBeNull();
  });

  it("성체이거나 체중이 늘고 있으면 제안하지 않는다", () => {
    expect(
      weightStageSuggestion({
        pet: { lifeStageCode: "adult", hatchedOn: null },
        species,
        weights: [40, 40, 40],
        today,
      }),
    ).toBeNull();
    expect(
      weightStageSuggestion({
        pet: { lifeStageCode: "juvenile", hatchedOn: null },
        species,
        weights: [30, 26, 22],
        today,
      }),
    ).toBeNull();
  });
});
