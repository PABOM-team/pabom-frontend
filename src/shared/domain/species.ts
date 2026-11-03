import { differenceInMonths } from "date-fns";
import { z } from "zod";
import { recordKindSchema } from "./care";

/** MVP에서 지원하는 종. 볼파이톤은 신고 요건이 달라 초기 출시에서 제외 (10/6 IA 피드백 1번) */
export const SPECIES = ["crested_gecko", "leopard_gecko"] as const;
export const speciesIdSchema = z.enum(SPECIES);
export type SpeciesId = z.infer<typeof speciesIdSchema>;

export const SPECIES_LABEL: Record<SpeciesId, string> = {
  crested_gecko: "크레스티드 게코",
  leopard_gecko: "레오파드 게코",
};

/** 개체 등록 1단계 분류. 뱀은 Figma에 있지만 MVP 범위 밖이라 '준비 중'으로만 보인다 */
export const SPECIES_GROUPS = ["lizard", "snake"] as const;
export type SpeciesGroup = (typeof SPECIES_GROUPS)[number];
export const SPECIES_GROUP_LABEL: Record<SpeciesGroup, string> = { lizard: "도마뱀", snake: "뱀" };

/** 백엔드 종 코드 → 앱의 종 id. 여기 없는 종(볼파이톤)은 MVP 밖이라 목록에서 뺀다 */
export const SPECIES_CODE: Record<string, SpeciesId> = {
  CRESTED: "crested_gecko",
  LEOPARD: "leopard_gecko",
};

export type LifeStage = {
  /** 백엔드 lifeStageId. 스웨거(CreatePetRequest.lifeStageId)의 유효값은 2(JUVENILE)·3(ADULT)·4(UNKNOWN) */
  id: number;
  code: string;
  name: string;
  /** 부화 후 이 개월부터 이 단계 (관리 가이드라인 v1.2: 레오·크레 성체 안내 나이 18개월) */
  minAgeMonths: number;
  criteria: string;
};

/**
 * 생애 단계는 어린 개체·성체 둘뿐이다 (Figma 댓글: 해츨링·준성체를 '어린 개체'로 합침).
 * 단계를 모르면 LIFE_STAGE_UNKNOWN 으로 따로 둔다
 */
export const LIFE_STAGES: LifeStage[] = [
  { id: 2, code: "juvenile", name: "어린 개체", minAgeMonths: 0, criteria: "부화 후 18개월 미만" },
  { id: 3, code: "adult", name: "성체", minAgeMonths: 18, criteria: "부화 후 18개월 이상" },
];

/** 백엔드 lifeStageId 4 = UNKNOWN (단계 모름). 개체 응답에 오면 단계를 비운다 */
export const LIFE_STAGE_UNKNOWN_ID = 4;
/** 단계를 모르는 개체 ('잘 모르겠어요'). 목록·상세에는 '단계 확인 전'으로 보인다 */
export const LIFE_STAGE_UNKNOWN = {
  id: LIFE_STAGE_UNKNOWN_ID,
  code: "unknown",
  name: "단계 확인 전",
  /** 등록·수정 칩에 보이는 이름 */
  chipLabel: "잘 모르겠어요",
} as const;

/** 생애 단계 칩 3개 (P02·P05·U5): 어린 개체 · 성체 · 잘 모르겠어요 */
export const LIFE_STAGE_CHOICES = [
  ...LIFE_STAGES.map((s) => ({ value: s.code, label: s.name })),
  { value: LIFE_STAGE_UNKNOWN.code, label: LIFE_STAGE_UNKNOWN.chipLabel },
] as const;

export const isKnownStage = (code: string | null | undefined): boolean =>
  LIFE_STAGES.some((s) => s.code === code);

/** 단계 이름. 모르는 단계(unknown·빈 값)는 '단계 확인 전' */
export const lifeStageName = (code: string | null | undefined) =>
  LIFE_STAGES.find((s) => s.code === code)?.name ?? LIFE_STAGE_UNKNOWN.name;

/** 종 API가 주지 않는 값. TODO 백엔드가 단계·이름 정보를 주면 API 값으로 바꾼다 */
const SPECIES_INFO: Record<
  SpeciesId,
  Pick<Species, "officialName" | "scientificName" | "aliases" | "defaultFoodName" | "adultWeightG">
> = {
  crested_gecko: {
    officialName: "속눈썹도마뱀부치",
    scientificName: "Correlophus ciliatus",
    aliases: ["크레", "크레스티드", "볏도마뱀붙이"],
    defaultFoodName: "인공 사료",
    adultWeightG: 35,
  },
  leopard_gecko: {
    officialName: "표범도마뱀부치",
    scientificName: "Eublepharis macularius",
    aliases: ["레오", "레오파드", "표범게코"],
    defaultFoodName: "귀뚜라미",
    adultWeightG: 45,
  },
};

/** GET /species 한 줄 (공개 API) */
export const speciesResponseSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  commonName: z.string(),
  category: z.enum(["LIZARD", "SNAKE"]),
  displayOrder: z.number().int(),
});
export type SpeciesResponse = z.infer<typeof speciesResponseSchema>;

export type Species = {
  id: SpeciesId;
  /** 백엔드 종 ID. 모프 조회·개체 등록에 쓴다 */
  serverId: number;
  group: SpeciesGroup;
  commonName: string;
  officialName: string;
  scientificName: string;
  aliases: string[];
  lifeStages: LifeStage[];
  defaultFoodName: string;
  /**
   * 성체 참고 체중(g). 이 이상이면 성체, 아니면 어린 개체로 제안한다 (관리 가이드라인 v1.2 4장).
   * [백엔드 확인 필요] care-standards 응답에 체중 범위가 없어 프론트 값으로 둔다
   */
  adultWeightG: number;
};

/** 백엔드 종 목록을 앱 종 목록으로. MVP 밖의 종은 뺀다 */
export function toSpeciesList(rows: SpeciesResponse[]): Species[] {
  return [...rows]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .flatMap((row) => {
      const id = SPECIES_CODE[row.code];
      if (!id) return [];
      return [
        {
          id,
          serverId: row.id,
          group: row.category === "SNAKE" ? ("snake" as const) : ("lizard" as const),
          commonName: row.commonName,
          lifeStages: LIFE_STAGES,
          ...SPECIES_INFO[id],
        },
      ];
    });
}

/** GET /species/{speciesId}/morphs 한 줄 (공개 API) */
export const morphSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  name: z.string(),
  displayOrder: z.number().int().optional(),
});
export type Morph = z.infer<typeof morphSchema>;

export const careLabelSchema = z.enum(["recommended", "reference"]);
export type CareLabel = z.infer<typeof careLabelSchema>;
/** 권고는 수의학 자문을 마친 항목만. 그 전에는 모두 참고 정보 */
export const CARE_LABEL_TEXT: Record<CareLabel, string> = {
  recommended: "권고",
  reference: "참고 정보",
};

export const careStandardSchema = z.object({
  lifeStageCode: z.string(),
  /** 백엔드 관리 항목 코드 */
  careItem: z.string(),
  careItemName: z.string(),
  recordKind: recordKindSchema,
  /** false면 기본 항목이지만 처음엔 꺼진 채로 만들어진다 */
  defaultEnabled: z.boolean(),
  intervalDays: z.number().int().min(1),
  /** 바꿀 수 있는 범위 (백엔드 minDays·maxDays) */
  minDays: z.number().int().min(1),
  maxDays: z.number().int().min(1),
  label: careLabelSchema,
  description: z.string().nullable(),
});
export type CareStandard = z.infer<typeof careStandardSchema>;

export const careStandardTableSchema = z.object({
  speciesId: speciesIdSchema,
  version: z.string(),
  /** 적용 시작일. 백엔드 가이드라인 응답에는 없다 [백엔드 요청] */
  effectiveFrom: z.iso.date().nullable(),
  /** 기준표 확정 전 시안 값이면 '예시'로 표시. 백엔드는 PUBLISHED 버전만 주므로 false */
  isDraft: z.boolean(),
  standards: z.array(careStandardSchema),
  references: z.array(z.object({ title: z.string(), url: z.url().nullable() })),
  reviewNote: z.string().nullable(),
});
export type CareStandardTable = z.infer<typeof careStandardTableSchema>;

/** 부화일로 생애 단계를 제안한다. 부화일을 모르면 null */
export function lifeStageFromHatch(
  species: Pick<Species, "lifeStages">,
  hatchedOn: string | null | undefined,
  today = new Date(),
): LifeStage | null {
  if (!hatchedOn) return null;
  const ageMonths = differenceInMonths(today, new Date(`${hatchedOn}T00:00:00`));
  const sorted = [...species.lifeStages].sort((a, b) => b.minAgeMonths - a.minAgeMonths);
  return sorted.find((stage) => ageMonths >= stage.minAgeMonths) ?? sorted.at(-1) ?? null;
}

/** 체중(g)으로 생애 단계를 제안한다. 성체 참고 체중 이상이면 성체, 아니면 어린 개체 */
export function lifeStageFromWeight(
  species: Pick<Species, "lifeStages" | "adultWeightG">,
  weightG: number | null | undefined,
): LifeStage | null {
  if (!weightG || weightG <= 0) return null;
  const code = weightG >= species.adultWeightG ? "adult" : "juvenile";
  return species.lifeStages.find((s) => s.code === code) ?? null;
}
