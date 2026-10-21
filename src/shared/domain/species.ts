import { differenceInCalendarDays } from "date-fns";
import { z } from "zod";
import { routineCareItemSchema } from "./care";

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
  /**
   * 백엔드 lifeStageId. 스웨거(CreatePetRequest.lifeStageId)의 유효값은 2(JUVENILE)·3(ADULT)·4(UNKNOWN)뿐이다.
   * [백엔드 확인 필요] 해츨링 ID가 없어 null로 두고, 해츨링을 고르면 UNKNOWN으로 보낸다 (단계 목록 API가 아직 없다)
   */
  id: number | null;
  code: string;
  name: string;
  /** 부화 후 이 일수부터 이 단계 [미확정] 10/10 공동 기획에서 확정 */
  minAgeDays: number;
  criteria: string;
};

/** 생애 단계 경계는 [미확정] 10/10 공동 기획 값이 나오면 바꾼다 */
export const LIFE_STAGES: LifeStage[] = [
  { id: null, code: "hatchling", name: "해츨링", minAgeDays: 0, criteria: "부화 후 3개월 미만" },
  { id: 2, code: "juvenile", name: "준성체", minAgeDays: 90, criteria: "부화 후 3개월~1년" },
  { id: 3, code: "adult", name: "성체", minAgeDays: 365, criteria: "부화 후 1년 이상" },
];

/** 백엔드 lifeStageId 4 = UNKNOWN (단계 모름). 개체 응답에 오면 단계를 비운다 */
export const LIFE_STAGE_UNKNOWN_ID = 4;

/** 종 API가 주지 않는 값. TODO 백엔드가 단계·이름 정보를 주면 API 값으로 바꾼다 */
const SPECIES_INFO: Record<
  SpeciesId,
  Pick<Species, "officialName" | "scientificName" | "aliases" | "defaultFoodName">
> = {
  crested_gecko: {
    officialName: "속눈썹도마뱀부치",
    scientificName: "Correlophus ciliatus",
    aliases: ["크레", "크레스티드", "볏도마뱀붙이"],
    defaultFoodName: "인공 사료",
  },
  leopard_gecko: {
    officialName: "표범도마뱀부치",
    scientificName: "Eublepharis macularius",
    aliases: ["레오", "레오파드", "표범게코"],
    defaultFoodName: "귀뚜라미",
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
  careItem: routineCareItemSchema,
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

/** 부화일로 생애 단계를 고른다. 부화일을 모르면 null */
export function lifeStageFromHatch(
  species: Pick<Species, "lifeStages">,
  hatchedOn: string | null | undefined,
  today = new Date(),
): LifeStage | null {
  if (!hatchedOn) return null;
  const age = differenceInCalendarDays(today, new Date(`${hatchedOn}T00:00:00`));
  const sorted = [...species.lifeStages].sort((a, b) => b.minAgeDays - a.minAgeDays);
  return sorted.find((stage) => age >= stage.minAgeDays) ?? sorted.at(-1) ?? null;
}
