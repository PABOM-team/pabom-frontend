import { describe, expect, it } from "vitest";
import { isPetDraftReady, stageFields } from "./pet";
import { LIFE_STAGES } from "./species";

const species = { lifeStages: LIFE_STAGES };
const empty = { hatchedOn: null, hatchUnknown: false, lifeStageCode: null, stageUncertain: false };

describe("isPetDraftReady", () => {
  it("이름만 있으면 등록할 수 있다", () => {
    expect(isPetDraftReady({ name: "모찌" })).toBe(true);
  });

  it("이름이 비었거나 공백뿐이면 등록할 수 없다", () => {
    expect(isPetDraftReady({ name: "" })).toBe(false);
    expect(isPetDraftReady({ name: "   " })).toBe(false);
  });
});

describe("stageFields", () => {
  it("부화일·단계를 비우면 단계 없이 UNKNOWN으로 보낸다", () => {
    expect(stageFields(species, empty)).toEqual({
      hatchedAt: null,
      lifeStageId: null,
      stageCertainty: "UNKNOWN",
    });
  });

  it("부화일을 모른다고 하고 단계를 고르지 않아도 UNKNOWN으로 보낸다", () => {
    expect(stageFields(species, { ...empty, hatchUnknown: true })).toEqual({
      hatchedAt: null,
      lifeStageId: null,
      stageCertainty: "UNKNOWN",
    });
  });

  it("'잘 모르겠어요'를 고르면 체중이 없어도 UNKNOWN으로 보낸다", () => {
    expect(
      stageFields(species, { ...empty, hatchUnknown: true, lifeStageCode: "unknown" }),
    ).toMatchObject({ lifeStageId: null, stageCertainty: "UNKNOWN" });
  });

  it("고른 단계는 그대로 보낸다", () => {
    expect(
      stageFields(species, { ...empty, hatchUnknown: true, lifeStageCode: "adult" }),
    ).toMatchObject({ lifeStageId: 3, stageCertainty: "CONFIRMED" });
  });
});
