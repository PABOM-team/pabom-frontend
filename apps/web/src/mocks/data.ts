import type { BackendCareItemStandard, BackendCareStandards } from "@pabom/core/domain/backend";
import {
  toSpeciesList,
  type Morph,
  type Species,
  type SpeciesId,
  type SpeciesResponse,
} from "@pabom/core/domain/species";

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

/** 백엔드 recordType (CareItemStandard·PetRoutineResult·Task.resultType) */
export type CareRecordType = "OX" | "FEED" | "WEIGHT";

/** 종 기본 관리 항목 한 줄 (dev 백엔드 care-standards 값을 옮겨 적었다) */
export type CareItemSeed = {
  code: string;
  name: string;
  recordType: CareRecordType;
  /** [어린 개체, 성체] 기본 주기 */
  days: [juvenile: number, adult: number];
  defaultEnabled?: boolean;
  feedResultSet?: "DIET" | "INSECT";
  defaultFoodName?: string;
  evidenceLevel: "VET_SOURCE" | "TEAM_JUDGMENT" | "TEXTBOOK";
  sourceRefs: string;
  description: string;
};

const CLEAN: CareItemSeed = {
  code: "CLEAN",
  name: "청소",
  recordType: "OX",
  days: [30, 30],
  evidenceLevel: "TEAM_JUDGMENT",
  sourceRefs: "RSPCA",
  description: "바닥재와 은신처를 한 달에 한 번 정도 통째로 닦아 주세요.",
};
const SHED_CHECK: CareItemSeed = {
  code: "SHED_CHECK",
  name: "탈피 확인",
  recordType: "OX",
  days: [7, 7],
  evidenceLevel: "TEXTBOOK",
  sourceRefs: "RVC, RSPCA",
  description: "발끝과 꼬리에 허물이 남아 있지 않은지 일주일에 한 번 살펴보세요.",
};
const UVB_LAMP: CareItemSeed = {
  code: "UVB_LAMP",
  name: "UVB 램프 교체",
  recordType: "OX",
  days: [180, 180],
  defaultEnabled: false,
  evidenceLevel: "TEAM_JUDGMENT",
  sourceRefs: "RVC",
  description: "UVB 램프를 쓴다면 6개월마다 새 램프로 바꿔 주세요.",
};
const WATER: CareItemSeed = {
  code: "WATER",
  name: "물 갈기",
  recordType: "OX",
  days: [1, 1],
  evidenceLevel: "VET_SOURCE",
  sourceRefs: "RVC, RSPCA",
  description: "물그릇은 매일 깨끗한 물로 갈아 주세요.",
};
const WEIGHT: CareItemSeed = {
  code: "WEIGHT",
  name: "체중",
  recordType: "WEIGHT",
  days: [14, 30],
  evidenceLevel: "VET_SOURCE",
  sourceRefs: "RVC",
  description:
    "어릴 때는 꾸준히 늘고 성체는 크게 바뀌지 않아야 해요. 갑자기 줄면 병원에 문의하세요.",
};

/**
 * 종별 기본 관리 항목 (dev 백엔드 2026-11-03 care-standards. 주기는 [어린 개체, 성체]).
 * FEED_INSECT의 이름은 백엔드 응답에서 옮겨 적지 못해 추정 [백엔드 확인 필요]
 */
const CARE_ITEMS: Record<SpeciesId, CareItemSeed[]> = {
  crested_gecko: [
    CLEAN,
    {
      code: "FEED",
      name: "급여",
      recordType: "FEED",
      days: [1, 2],
      feedResultSet: "DIET",
      defaultFoodName: "인공 사료",
      evidenceLevel: "VET_SOURCE",
      sourceRefs: "RVC, RSPCA",
      description: "어린 개체는 매일, 성체는 이틀에 한 번 인공 사료를 새로 놓아 주세요.",
    },
    {
      code: "FEED_INSECT",
      name: "곤충 급여",
      recordType: "FEED",
      days: [7, 7],
      defaultEnabled: false,
      feedResultSet: "INSECT",
      defaultFoodName: "곤충",
      evidenceLevel: "TEAM_JUDGMENT",
      sourceRefs: "RSPCA",
      description: "곤충을 함께 준다면 일주일에 한 번 정도가 알맞아요.",
    },
    {
      code: "MIST",
      name: "분무",
      recordType: "OX",
      days: [1, 1],
      evidenceLevel: "VET_SOURCE",
      sourceRefs: "RVC",
      description: "저녁에 사육장 벽면에 물을 뿌려 습도를 올려 주세요.",
    },
    SHED_CHECK,
    UVB_LAMP,
    WATER,
    WEIGHT,
  ],
  leopard_gecko: [
    CLEAN,
    {
      code: "FEED",
      name: "급여",
      recordType: "FEED",
      days: [1, 3],
      feedResultSet: "INSECT",
      defaultFoodName: "귀뚜라미",
      evidenceLevel: "VET_SOURCE",
      sourceRefs: "RVC, RSPCA",
      description: "어린 개체는 매일, 성체는 사흘에 한 번 곤충을 주세요.",
    },
    {
      code: "HUMID_HIDE",
      name: "습식 은신처 적시기",
      recordType: "OX",
      days: [3, 3],
      evidenceLevel: "TEXTBOOK",
      sourceRefs: "RSPCA",
      description: "습식 은신처의 이끼나 키친타월이 마르지 않게 적셔 주세요.",
    },
    {
      code: "MULTIVITAMIN",
      name: "종합 비타민",
      recordType: "OX",
      days: [7, 14],
      evidenceLevel: "VET_SOURCE",
      sourceRefs: "RVC",
      description: "먹이에 종합 비타민을 묻혀 주세요. 칼슘과 번갈아 쓰면 좋아요.",
    },
    SHED_CHECK,
    UVB_LAMP,
    WATER,
    WEIGHT,
  ],
};

const stageIndex = (stageCode: string) => (stageCode === "adult" ? 1 : 0);

/** 종·단계의 기본 항목과 주기. 단계를 모르면 백엔드처럼 어린 개체 기준 */
export function standardItems(speciesId: SpeciesId, stageCode: string) {
  return CARE_ITEMS[speciesId].map((item) => ({
    ...item,
    intervalDays: item.days[stageIndex(stageCode)],
  }));
}

export const careItemSeedOf = (speciesId: SpeciesId, code: string) =>
  CARE_ITEMS[speciesId].find((item) => item.code === code);

export const CARE_STANDARD_VERSION = "1.2";

/** 주기를 바꿀 수 있는 범위 (예시). 백엔드 minDays·maxDays와 같은 자리 */
export const intervalRange = (days: number) => ({
  minDays: Math.max(1, Math.floor(days / 2)),
  maxDays: Math.max(days * 2, days + 1),
});

function careItemStandard(item: CareItemSeed, stageCode: string): BackendCareItemStandard {
  const days = item.days[stageIndex(stageCode)];
  return {
    careItemCode: item.code,
    careItemName: item.name,
    defaultCycleDays: days,
    ...intervalRange(days),
    defaultEnabled: item.defaultEnabled ?? true,
    recordType: item.recordType,
    feedResultSet: item.feedResultSet ?? null,
    defaultFoodName: item.defaultFoodName ?? null,
    evidenceLevel: item.evidenceLevel,
    sourceRefs: item.sourceRefs,
    description: item.description,
  };
}

/**
 * GET /species/{id}/care-standards 응답 (백엔드 모양). 백엔드처럼 JUVENILE·ADULT에
 * UNKNOWN(appliedLifeStage=JUVENILE)까지 세 단계를 준다
 */
export function careStandardsOf(species: Species): BackendCareStandards {
  const lifeStages = [
    ["JUVENILE", "JUVENILE", "juvenile"],
    ["ADULT", "ADULT", "adult"],
    ["UNKNOWN", "JUVENILE", "juvenile"],
  ] as const;
  return {
    guidelineVersion: CARE_STANDARD_VERSION,
    speciesId: species.serverId,
    speciesCode: SPECIES_ROWS.find((r) => r.id === species.serverId)!.code,
    speciesName: species.commonName,
    lifeStages: lifeStages.map(([lifeStage, appliedLifeStage, code]) => ({
      lifeStage,
      appliedLifeStage,
      careItems: CARE_ITEMS[species.id].map((item) => careItemStandard(item, code)),
    })),
  };
}
