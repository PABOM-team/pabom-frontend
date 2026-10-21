import { CARE_ITEM_CODE, type BackendCareStandards } from "@/shared/domain/backend";
import { RECORD_KIND, ROUTINE_LABEL, type RoutineCareItem } from "@/shared/domain/care";
import {
  toSpeciesList,
  type Morph,
  type Species,
  type SpeciesId,
  type SpeciesResponse,
} from "@/shared/domain/species";

/** GET /species 응답 (dev 백엔드 값 그대로). 볼파이톤은 앱이 목록에서 뺀다 */
export const SPECIES_ROWS: SpeciesResponse[] = [
  { id: 1, code: "CRESTED", commonName: "크레스티드 게코", category: "LIZARD", displayOrder: 1 },
  { id: 2, code: "LEOPARD", commonName: "레오파드 게코", category: "LIZARD", displayOrder: 2 },
  { id: 3, code: "BALL_PYTHON", commonName: "볼파이톤", category: "SNAKE", displayOrder: 1 },
];

/** 목업이 쓰는 앱 종 목록 */
export const SPECIES_DATA: Species[] = toSpeciesList(SPECIES_ROWS);

const morphs = (startId: number, rows: [code: string, name: string][]): Morph[] =>
  rows.map(([code, name], i) => ({ id: startId + i, code, name, displayOrder: i + 1 }));

/** GET /species/{speciesId}/morphs 응답 (dev 백엔드 값 그대로). 키는 백엔드 종 ID */
export const MORPHS: Record<number, Morph[]> = {
  1: morphs(1, [
    ["NORMAL", "노멀"],
    ["HARLEQUIN", "할리퀸"],
    ["FLAME", "플레임"],
    ["DALMATIAN", "달마시안"],
    ["PINSTRIPE", "핀스트라이프"],
    ["LILLY_WHITE", "릴리 화이트"],
  ]),
  2: morphs(8, [
    ["NORMAL", "노멀"],
    ["HIGH_YELLOW", "하이옐로"],
    ["TANGERINE", "탠저린"],
    ["MACK_SNOW", "맥스노우"],
    ["BLIZZARD", "블리자드"],
    ["RAPTOR", "랩터"],
  ]),
  3: morphs(15, [
    ["NORMAL", "노멀"],
    ["BANANA", "바나나"],
    ["MOJAVE", "모하베"],
    ["PIED", "파이드"],
  ]),
};

export const serverIdOf = (speciesId: SpeciesId) =>
  SPECIES_DATA.find((s) => s.id === speciesId)!.serverId;

export const speciesOfServerId = (serverId: number) =>
  SPECIES_DATA.find((s) => s.serverId === serverId);

type Interval = Partial<Record<RoutineCareItem, number>>;

/** 관리 기준표 v0.1 시안. 항목·주기는 예시(가이드라인 확정 전) */
const INTERVALS: Record<SpeciesId, Record<string, Interval>> = {
  crested_gecko: {
    hatchling: { feeding: 1, misting: 1, weight: 14, cleaning: 7, shed: 7 },
    juvenile: { feeding: 2, misting: 1, weight: 14, cleaning: 7, shed: 7 },
    adult: { feeding: 3, misting: 1, weight: 30, cleaning: 7, shed: 7 },
  },
  leopard_gecko: {
    hatchling: { feeding: 1, weight: 14, cleaning: 7, shed: 7 },
    juvenile: { feeding: 2, weight: 14, cleaning: 7, shed: 7 },
    adult: { feeding: 3, weight: 30, cleaning: 7, shed: 7 },
  },
};

export function standardIntervals(speciesId: SpeciesId, stageCode: string): Interval {
  return INTERVALS[speciesId][stageCode] ?? INTERVALS[speciesId].adult;
}

export const CARE_STANDARD_VERSION = "v0.1";

/** 주기를 바꿀 수 있는 범위 (예시). 백엔드 minDays·maxDays와 같은 자리 */
export const intervalRange = (days: number) => ({
  minDays: Math.max(1, Math.floor(days / 2)),
  maxDays: Math.max(days * 2, days + 1),
});

/** 백엔드 recordType 글자 (CareItemStandard.recordType·PetRoutineResult.recordType). [백엔드 확인 필요] 값 목록 */
export const RECORD_TYPE_CODE: Record<RoutineCareItem, string> = {
  feeding: "FEED_RESULT",
  misting: "CHECK",
  weight: "NUMBER",
  cleaning: "CHECK",
  shed: "CHECK",
};

/** GET /species/{id}/care-standards 응답 (백엔드 모양). 백엔드처럼 준성체·성체 기준만 준다 */
export function careStandardsOf(species: Species): BackendCareStandards {
  const lifeStages = [
    ["JUVENILE", "juvenile"],
    ["ADULT", "adult"],
  ] as const;
  return {
    guidelineVersion: CARE_STANDARD_VERSION,
    speciesId: species.serverId,
    speciesCode: SPECIES_ROWS.find((r) => r.id === species.serverId)!.code,
    speciesName: species.commonName,
    lifeStages: lifeStages.map(([lifeStage, code]) => ({
      lifeStage,
      appliedLifeStage: lifeStage,
      careItems: Object.entries(standardIntervals(species.id, code)).map(([item, days]) => {
        const careItem = item as RoutineCareItem;
        return {
          careItemCode: CARE_ITEM_CODE[careItem],
          careItemName: ROUTINE_LABEL[careItem],
          defaultCycleDays: days,
          ...intervalRange(days),
          defaultEnabled: true,
          recordType: RECORD_TYPE_CODE[careItem],
          feedResultSet:
            RECORD_KIND[careItem] === "intake" ? "ATE_ALL,ATE_PART,REFUSED,NOT_OBSERVED" : null,
          defaultFoodName: careItem === "feeding" ? species.defaultFoodName : null,
          evidenceLevel: "REFERENCE",
          sourceRefs: "〔참고 자료 · 발행처 · 연도〕",
          description: `${species.commonName} · ${species.lifeStages.find((s) => s.code === code)?.name ?? code}`,
        };
      }),
    })),
  };
}
