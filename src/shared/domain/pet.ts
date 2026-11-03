import { z } from "zod";
import {
  isKnownStage,
  LIFE_STAGE_UNKNOWN,
  LIFE_STAGES,
  lifeStageFromHatch,
  morphSchema,
  speciesIdSchema,
  type Morph,
  type Species,
} from "./species";

export { SPECIES, SPECIES_LABEL, speciesIdSchema, type SpeciesId } from "./species";

export const sexSchema = z.enum(["male", "female", "unknown"]);
export type Sex = z.infer<typeof sexSchema>;
export const SEX_LABEL: Record<Sex, string> = { male: "수컷", female: "암컷", unknown: "모름" };
export const SEX_SYMBOL: Record<Sex, string> = { male: "♂", female: "♀", unknown: "" };

export const petStatusSchema = z.enum(["active", "ended"]);
export type PetStatus = z.infer<typeof petStatusSchema>;

/** 함께했던 개체로 바꾸는 이유 (SCR-P06) */
export const endReasonSchema = z.enum(["rehomed", "deceased", "other"]);
export type EndReason = z.infer<typeof endReasonSchema>;
export const END_REASON_LABEL: Record<EndReason, string> = {
  rehomed: "분양 보냄",
  deceased: "무지개다리",
  other: "기타",
};

export const petSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(20),
  speciesId: speciesIdSchema,
  morph: z.string().max(40).nullable(),
  sex: sexSchema,
  hatchedOn: z.iso.date().nullable(),
  /** juvenile(어린 개체) · adult(성체) · unknown(잘 모르겠어요 → '단계 확인 전') */
  lifeStageCode: z.string(),
  /** hatch: 부화일이 있어 부화일로 제안한 단계, manual: 부화일을 몰라 직접(또는 체중으로) 고름 */
  lifeStageSource: z.enum(["hatch", "manual"]),
  /** 고른 단계가 정확하지 않음 (어린 개체일 때만, U5) */
  stageUncertain: z.boolean(),
  acquiredOn: z.iso.date().nullable(),
  photoUrl: z.string().nullable(),
  status: petStatusSchema,
  endReason: endReasonSchema.nullable(),
  endedOn: z.iso.date().nullable(),
  createdAt: z.iso.datetime(),
  /** 오늘 남은 할 일 수 */
  todayRemaining: z.number().int().min(0),
  recordCount: z.number().int().min(0),
  firstRecordOn: z.iso.date().nullable(),
});
export type Pet = z.infer<typeof petSchema>;

export const petFormSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해 주세요").max(20, "20자까지 쓸 수 있어요"),
    speciesId: speciesIdSchema,
    morph: z.string().trim().max(40).nullable(),
    sex: sexSchema,
    hatchedOn: z.iso.date().nullable(),
    hatchUnknown: z.boolean(),
    /** 생애 단계 칩 (juvenile · adult · unknown). 부화일이 있으면 자동 제안되고 바꿀 수 있다 */
    lifeStageCode: z.string().nullable(),
    /** '잘 모르겠어요'일 때 넣는 체중(g, 선택). 단계 제안에만 쓴다 */
    weightG: z.number().positive().nullable(),
    acquiredOn: z.iso.date().nullable(),
    photoFileId: z.string().nullable(),
  })
  .refine((v) => v.hatchUnknown || v.hatchedOn, {
    path: ["hatchedOn"],
    message: "부화일을 고르거나 '부화일을 몰라요'를 체크해 주세요",
  })
  .refine((v) => Boolean(v.lifeStageCode), {
    path: ["lifeStageCode"],
    message: "생애 단계를 골라 주세요",
  });
export type PetFormValues = z.infer<typeof petFormSchema>;

const certaintySchema = z.enum(["CONFIRMED", "ESTIMATED", "UNKNOWN"]);
export type Certainty = z.infer<typeof certaintySchema>;
const serverSexSchema = z.enum(["MALE", "FEMALE", "UNKNOWN"]);

/** POST /pets 본문 (API-21 개체 등록만 한다. 기본 관리 일정은 만들지 않는다) */
export type PetCreateInput = {
  /** 중복 등록 방지용. 같은 등록 화면에서 다시 보내면 같은 값을 쓴다 */
  clientRequestId: string;
  /** 백엔드 종 ID (Species.serverId) */
  speciesId: number;
  name: string;
  morphIds: number[];
  customMorph: string | null;
  hatchedAt: string | null;
  adoptedAt: string | null;
  /** stageCertainty가 UNKNOWN이면 null */
  lifeStageId: number | null;
  stageCertainty: Certainty;
  sex: z.infer<typeof serverSexSchema>;
  sexCertainty: Certainty;
  photoFileId: number | null;
};

/** PATCH /pets/{id} 본문. 보낸 칸만 바꾸고, null을 보내면 그 값을 지운다 */
export type PetUpdateInput = Partial<Omit<PetCreateInput, "clientRequestId" | "speciesId">>;

export const toServerSex = (sex: Sex) => serverSexSchema.parse(sex.toUpperCase());

/** 생애 단계 code → 백엔드 lifeStageId. unknown·빈 값은 null (stageCertainty UNKNOWN과 짝) */
export const lifeStageIdOf = (code: string | null | undefined) =>
  LIFE_STAGES.find((s) => s.code === code)?.id ?? null;
/** 백엔드 lifeStageId → code. null·UNKNOWN(4)·모르는 ID는 unknown */
const lifeStageCodeOf = (id: number | null | undefined) =>
  LIFE_STAGES.find((s) => s.id === id)?.code ?? LIFE_STAGE_UNKNOWN.code;

/** 고른 모프 이름 → 본문. 목록에 있는 모프면 ID, 없으면 직접 입력으로 보낸다 */
export function morphFields(name: string | null, morphs: Morph[]) {
  const trimmed = name?.trim() || null;
  const morph = morphs.find((m) => m.name === trimmed);
  return { morphIds: morph ? [morph.id] : [], customMorph: morph ? null : trimmed };
}

/**
 * 부화일·생애 단계 → 본문 (Figma 댓글 #5·#7).
 * 단계는 칩에서 고른 값을 그대로 보낸다 (부화일이 있으면 제안값이 미리 골라져 있다).
 * '잘 모르겠어요'면 lifeStageId null + UNKNOWN, 어린 개체 + '정확하지 않아요'면 ESTIMATED
 */
export function stageFields(
  species: Pick<Species, "lifeStages">,
  v: {
    hatchedOn: string | null;
    hatchUnknown: boolean;
    lifeStageCode: string | null;
    stageUncertain: boolean;
  },
) {
  const hatchedAt = v.hatchUnknown ? null : v.hatchedOn;
  const code = isKnownStage(v.lifeStageCode)
    ? v.lifeStageCode
    : v.lifeStageCode === LIFE_STAGE_UNKNOWN.code
      ? null
      : (lifeStageFromHatch(species, hatchedAt)?.code ?? null);
  const lifeStageId = lifeStageIdOf(code);
  const stageCertainty: Certainty =
    lifeStageId === null
      ? "UNKNOWN"
      : code === "juvenile" && v.stageUncertain
        ? "ESTIMATED"
        : "CONFIRMED";
  return { hatchedAt, lifeStageId, stageCertainty };
}

/** 성별 → 본문. 앱에는 '정확성' 입력이 없어 고르면 CONFIRMED, 모름이면 UNKNOWN [가정] */
export const sexFields = (sex: Sex) => ({
  sex: toServerSex(sex),
  sexCertainty: (sex === "unknown" ? "UNKNOWN" : "CONFIRMED") as Certainty,
});

/** 화면의 사진 파일 ID(문자열) → 백엔드 파일 ID(숫자) */
export const serverFileId = (fileId: string | null) => (fileId ? Number(fileId) : null);

/**
 * 개체 응답 (백엔드 PetResponse·PetListResponse).
 * 백엔드가 아직 주지 않는 값(상태·할 일 수·기록 수)은 아래 기본값(임시 데이터)으로 채운다. 목업은 진짜 값을 준다.
 * 사진 주소는 photoFileId로 GET /files/{id}를 따로 불러 채운다 (endpoints.ts)
 */
export const petResponseSchema = z.object({
  id: z.number().int().transform(String),
  speciesId: z.number().int(),
  name: z.string(),
  morphs: z.array(morphSchema).default([]),
  customMorph: z.string().nullish(),
  /** 목록 응답에는 없다 → 모름 */
  hatchedAt: z.iso.date().nullish(),
  adoptedAt: z.iso.date().nullish(),
  lifeStageId: z.number().int().nullish(),
  stageCertainty: certaintySchema.default("UNKNOWN"),
  /** 목록 응답에는 없다 → 모름 */
  sex: serverSexSchema.default("UNKNOWN"),
  photoFileId: z.number().int().nullish(),
  /** 목록 응답에는 없다 */
  createdAt: z.iso.datetime({ offset: true, local: true }).nullish(),
  // ── 백엔드에 아직 없는 값 (임시 데이터). 스웨거에 status-changes API가 없다 ─────────
  /** 함께했던 개체 기능이 없어 모두 키우는 중 */
  status: petStatusSchema.default("active"),
  endReason: endReasonSchema.nullish(),
  endedOn: z.iso.date().nullish(),
  /** 오늘 할 일 수는 GET /today에 있지만 개체 목록에는 없어 0 */
  todayRemaining: z.number().int().min(0).default(0),
  /** 기록 수는 개체 응답에 없어 0 */
  recordCount: z.number().int().min(0).default(0),
  firstRecordOn: z.iso.date().nullish(),
});
export type PetResponse = z.infer<typeof petResponseSchema>;

/** 백엔드 개체를 앱 개체로. 종은 백엔드 종 ID로 찾고, 사진 주소는 따로 받아 넣는다 */
export function toPet(res: PetResponse, speciesList: Species[], photoUrl: string | null): Pet {
  const species = speciesList.find((s) => s.serverId === res.speciesId);
  if (!species) throw new Error(`알 수 없는 종이에요 (speciesId ${res.speciesId})`);
  const hatchedOn = res.hatchedAt ?? null;
  // 백엔드가 단계를 안 주고 부화일만 있으면 부화일로 제안한 단계를 보여 준다
  const stageCode =
    res.lifeStageId == null && hatchedOn
      ? (lifeStageFromHatch(species, hatchedOn)?.code ?? LIFE_STAGE_UNKNOWN.code)
      : lifeStageCodeOf(res.lifeStageId);
  const morph = [...res.morphs.map((m) => m.name), res.customMorph].filter(Boolean).join(", ");
  return {
    id: res.id,
    name: res.name,
    speciesId: species.id,
    morph: morph || null,
    sex: res.sex.toLowerCase() as Sex,
    hatchedOn,
    lifeStageCode: stageCode,
    lifeStageSource: hatchedOn ? "hatch" : "manual",
    stageUncertain: stageCode === "juvenile" && res.stageCertainty === "ESTIMATED",
    acquiredOn: res.adoptedAt ?? null,
    photoUrl,
    status: res.status,
    endReason: res.endReason ?? null,
    endedOn: res.endedOn ?? null,
    createdAt: res.createdAt ?? "",
    todayRemaining: res.todayRemaining,
    recordCount: res.recordCount,
    firstRecordOn: res.firstRecordOn ?? null,
  };
}

export type PetStatusChangeInput =
  { type: "end"; reason: EndReason; date: string } | { type: "revert" };
