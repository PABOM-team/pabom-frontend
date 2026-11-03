import { queryOptions, useQueries, useQuery } from "@tanstack/react-query";
import { speciesApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import {
  lifeStageName,
  SPECIES,
  type CareStandardTable,
  type FeedResultSet,
  type Species,
  type SpeciesId,
} from "@/shared/domain/species";

export const speciesQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.species,
      queryFn: speciesApi.list,
      staleTime: Infinity,
    }),
  /** 종별 모프 (로그인 없이 부른다). 종을 고르기 전에는 부르지 않는다 */
  morphs: (serverId: number | undefined) =>
    queryOptions({
      queryKey: queryKeys.morphs(serverId ?? 0),
      queryFn: () => speciesApi.morphs(serverId!),
      enabled: serverId !== undefined,
      staleTime: Infinity,
    }),
  careStandards: (speciesId: SpeciesId) =>
    queryOptions({
      queryKey: queryKeys.careStandards(speciesId),
      queryFn: () => speciesApi.careStandards(speciesId),
      staleTime: 30 * 60 * 1000,
    }),
};

/** 종 목록을 id로 찾는다. 성장 단계 이름 같은 값은 하드코딩하지 않고 API 값만 쓴다 */
export function useSpeciesMap() {
  const { data } = useQuery(speciesQueries.list());
  return new Map<SpeciesId, Species>((data ?? []).map((s) => [s.id, s]));
}

/** 단계 이름. 종 API에 단계 이름이 없어 공통 표(LIFE_STAGES)를 쓰고, 모르는 단계는 '단계 확인 전' */
export function stageName(species: Species | undefined, code: string) {
  return species?.lifeStages.find((s) => s.code === code)?.name ?? lifeStageName(code);
}

/**
 * 관리 항목의 먹이 묶음 (인공 사료·곤충·통먹이). 종 가이드라인에서 그 항목(코드 또는 이름)을 찾는다.
 * 급여가 아니거나 모르는 항목이면 null
 */
export function feedResultSetOf(
  table: Pick<CareStandardTable, "standards"> | undefined,
  careItem: string,
): FeedResultSet | null {
  const standard = table?.standards.find(
    (s) => s.feedResultSet && (s.careItem === careItem || s.careItemName === careItem),
  );
  return standard?.feedResultSet ?? null;
}

/** (개체의 종, 관리 항목)의 먹이 묶음. 종을 모르거나 아직 못 불렀으면 null (곤충 묶음으로 보인다) */
export function useFeedResultSet(
  speciesId: SpeciesId | undefined,
  careItem: string | null | undefined,
): FeedResultSet | null {
  const { data } = useQuery({
    ...speciesQueries.careStandards(speciesId ?? "crested_gecko"),
    enabled: speciesId !== undefined,
  });
  return speciesId && careItem ? feedResultSetOf(data, careItem) : null;
}

/**
 * 여러 개체·종의 기록을 한 화면에 늘어놓을 때 쓰는 먹이 묶음 찾기.
 * 지원 종 둘의 가이드라인을 미리 불러 두고 (종, 항목)으로 찾는다
 */
/** 급여 항목의 가이드라인 기본 먹이 이름 (예: 인공 사료·귀뚜라미). 없으면 null */
export function defaultFoodNameOf(
  table: Pick<CareStandardTable, "standards"> | undefined,
  careItem: string,
): string | null {
  return (
    table?.standards.find((s) => s.careItem === careItem && s.defaultFoodName)?.defaultFoodName ??
    null
  );
}

/** 여러 개체의 할 일을 한 화면에 늘어놓을 때 (종, 항목) → 기본 먹이 이름 */
export function useDefaultFoodNameResolver() {
  const tables = useQueries({
    queries: SPECIES.map((speciesId) => speciesQueries.careStandards(speciesId)),
  });
  const bySpecies = new Map<SpeciesId, CareStandardTable | undefined>(
    SPECIES.map((speciesId, i) => [speciesId, tables[i]?.data]),
  );
  return (speciesId: SpeciesId | undefined, careItem: string): string | null =>
    speciesId ? defaultFoodNameOf(bySpecies.get(speciesId), careItem) : null;
}

export function useFeedResultSetResolver() {
  const tables = useQueries({
    queries: SPECIES.map((speciesId) => speciesQueries.careStandards(speciesId)),
  });
  const bySpecies = new Map<SpeciesId, CareStandardTable | undefined>(
    SPECIES.map((speciesId, i) => [speciesId, tables[i]?.data]),
  );
  return (speciesId: SpeciesId | undefined, careItem: string): FeedResultSet | null =>
    speciesId ? feedResultSetOf(bySpecies.get(speciesId), careItem) : null;
}
