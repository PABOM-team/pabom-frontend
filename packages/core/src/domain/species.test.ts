import { describe, expect, it } from "vitest";
import { LIFE_STAGES, lifeStageFromHatch, lifeStageFromWeight } from "./species";

const species = { lifeStages: LIFE_STAGES, adultWeightG: 35 };

describe("lifeStageFromHatch", () => {
  const today = new Date(2026, 9, 17);

  it("부화 후 18개월 미만이면 어린 개체, 이상이면 성체", () => {
    expect(lifeStageFromHatch(species, "2026-10-01", today)?.code).toBe("juvenile");
    expect(lifeStageFromHatch(species, "2025-04-18", today)?.code).toBe("juvenile");
    expect(lifeStageFromHatch(species, "2025-04-17", today)?.code).toBe("adult");
    expect(lifeStageFromHatch(species, "2024-06-01", today)?.code).toBe("adult");
  });

  it("부화일을 모르면 null", () => {
    expect(lifeStageFromHatch(species, null, today)).toBeNull();
  });
});

describe("lifeStageFromWeight", () => {
  it("성체 참고 체중 이상이면 성체, 아니면 어린 개체", () => {
    expect(lifeStageFromWeight(species, 34.9)?.code).toBe("juvenile");
    expect(lifeStageFromWeight(species, 35)?.code).toBe("adult");
  });

  it("체중이 없으면 null", () => {
    expect(lifeStageFromWeight(species, null)).toBeNull();
    expect(lifeStageFromWeight(species, 0)).toBeNull();
  });
});
