import { differenceInMonths } from "date-fns";
import { isKnownStage, lifeStageFromWeight, type LifeStage, type Species } from "./species";

/** 체중 정체로 보는 폭. 최근 체중들이 서로 ±5% 안에 있으면 더 늘지 않는 것으로 본다 (v1.2 명세 3-3) */
export const PLATEAU_TOLERANCE = 0.05;
/** 정체를 판단하는 데 필요한 최근 체중 기록 수 */
export const PLATEAU_SAMPLE = 3;

/** 최근 체중(g) 3개가 모두 서로 ±5% 안이면 정체. 3개가 안 되면 false */
export function isWeightPlateau(weights: number[]) {
  const sample = weights.filter((w) => w > 0).slice(0, PLATEAU_SAMPLE);
  if (sample.length < PLATEAU_SAMPLE) return false;
  const min = Math.min(...sample);
  const max = Math.max(...sample);
  return max <= min * (1 + PLATEAU_TOLERANCE);
}

export type WeightStageSuggestion = {
  /** unknown: 단계 확인 전 · adult-weight: 성체 참고 체중 도달 · plateau: 체중 정체 */
  reason: "unknown" | "adult-weight" | "plateau";
  stage: LifeStage;
  message: string;
  actionLabel: string;
};

type PetLike = { lifeStageCode: string; hatchedOn: string | null };
type SpeciesLike = Pick<Species, "lifeStages" | "adultWeightG" | "adultCheckMinAgeMonths">;

/** 성체 여부를 물을 수 있는 나이인지. 부화일을 모르면 묻는다 */
const adultCheckAllowed = (pet: PetLike, species: SpeciesLike, today: Date) =>
  !pet.hatchedOn ||
  differenceInMonths(today, new Date(`${pet.hatchedOn}T00:00:00`)) >=
    species.adultCheckMinAgeMonths;

/**
 * 체중을 저장한 뒤 체크 리스트를 바꿔 줄지 제안한다 (Figma v1.2 메모 C3 토스트 · 성공 + 행동).
 * 우선순위: 단계 확인 전 > 성체 참고 체중 도달 > 체중 정체. 성체는 제안하지 않는다.
 * weights는 방금 저장한 체중을 포함한 최근 체중, 최신 순
 */
export function weightStageSuggestion({
  pet,
  species,
  weights,
  today = new Date(),
}: {
  pet: PetLike;
  species: SpeciesLike;
  weights: number[];
  today?: Date;
}): WeightStageSuggestion | null {
  const latest = weights[0];
  if (!latest) return null;
  if (!isKnownStage(pet.lifeStageCode)) {
    const stage = lifeStageFromWeight(species, latest);
    return stage
      ? {
          reason: "unknown",
          stage,
          message: `체중으로 보면 ${stage.name}예요. 체크 리스트를 맞춰 드릴까요?`,
          actionLabel: "맞추기",
        }
      : null;
  }
  if (pet.lifeStageCode !== "juvenile") return null;
  const adult = species.lifeStages.find((s) => s.code === "adult");
  if (!adult || !adultCheckAllowed(pet, species, today)) return null;
  if (latest >= species.adultWeightG) {
    return {
      reason: "adult-weight",
      stage: adult,
      message: "다 자란 것 같아요. 성체 기준 체크 리스트로 바꿀까요?",
      actionLabel: "바꾸기",
    };
  }
  if (isWeightPlateau(weights)) {
    return {
      reason: "plateau",
      stage: adult,
      message: "체중이 더 늘지 않고 있어요. 성체 기준 체크 리스트로 바꿀까요?",
      actionLabel: "바꾸기",
    };
  }
  return null;
}

export type WeightStageBlocked = {
  /** too-young: 성체 여부를 묻기 전 나이 · few-weights: 체중 기록이 정체를 볼 만큼 쌓이지 않음 */
  reason: "too-young" | "few-weights";
  message: string;
  /** 누를 수 없는 [바꾸기]로 보여 준다 */
  actionLabel: string;
};

/**
 * 어린 개체인데 성체로 바꾸기를 아직 제안할 수 없을 때 그 이유 (QA T05-08).
 * 제안(weightStageSuggestion)이 없을 때만 부른다. 아직 자라는 중이라 제안이 없는 경우는 알리지 않는다.
 * weights는 방금 저장한 체중을 포함한 최근 체중, 최신 순
 */
export function weightStageBlocked({
  pet,
  species,
  weights,
  today = new Date(),
}: {
  pet: PetLike;
  species: SpeciesLike;
  weights: number[];
  today?: Date;
}): WeightStageBlocked | null {
  if (pet.lifeStageCode !== "juvenile" || !weights[0]) return null;
  if (!species.lifeStages.some((s) => s.code === "adult")) return null;
  if (!adultCheckAllowed(pet, species, today)) {
    return {
      reason: "too-young",
      message: `부화 후 ${species.adultCheckMinAgeMonths}개월이 지나야 성체로 바꿀 수 있어요`,
      actionLabel: "바꾸기",
    };
  }
  const recorded = weights.filter((w) => w > 0).length;
  if (recorded < PLATEAU_SAMPLE && weights[0] < species.adultWeightG) {
    return {
      reason: "few-weights",
      message: `체중을 ${PLATEAU_SAMPLE}번 이상 기록하면 성체로 바꿀 수 있는지 알려 드려요`,
      actionLabel: "바꾸기",
    };
  }
  return null;
}
