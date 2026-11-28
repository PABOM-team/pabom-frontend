"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { speciesQueries } from "@/entities/species";
import {
  SPECIES_GROUP_LABEL,
  SPECIES_GROUPS,
  SPECIES_LABEL,
  type Species,
  type SpeciesGroup,
} from "@pabom/core/domain/species";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/display";
import { Group, GroupRow, RoundThumb, RowText, SectionLabel } from "@/shared/ui/group";
import { ChevronRightIcon, SearchIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

type Filter = "all" | SpeciesGroup;

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  ...SPECIES_GROUPS.map((g) => ({ value: g, label: SPECIES_GROUP_LABEL[g] })),
];

const isFilter = (value: string | null): value is Filter => FILTERS.some((f) => f.value === value);

/** 검색어가 이름·공식 이름·별칭 어디든 들어 있으면 */
const matches = (species: Species, query: string) =>
  [species.commonName, species.officialName, ...species.aliases].some((name) =>
    name.toLowerCase().includes(query.toLowerCase()),
  );

/**
 * SCR-S04 관리 가이드라인 1 종 고르기 (앱 guidelines-screen.tsx 와 같다). 검색 · 분류 칩 · 내 개체 · 전체 종.
 * 뱀(볼파이톤)은 MVP 범위 밖이라 가이드라인이 없어 '준비 중' 줄만 흐리게 둔다
 */
export function GuidelinesScreen() {
  const group = useSearchParams().get("group");
  const [filter, setFilter] = useState<Filter>(isFilter(group) ? group : "all");
  const [query, setQuery] = useState("");
  const species = useQuery(speciesQueries.list());
  const pets = useQuery(petQueries.list());
  const list = species.data ?? [];
  // 종마다 할 일 가짓수 (가이드라인 표의 관리 항목 수). 종 화면에서도 같은 조회를 쓴다
  const tables = useQueries({
    queries: list.map((s) => speciesQueries.careStandards(s.id)),
  });
  const careCount = (id: Species["id"]) => {
    const table = tables[list.findIndex((s) => s.id === id)]?.data;
    return table ? new Set(table.standards.map((row) => row.careItem)).size : null;
  };

  const searching = query.trim().length > 0;
  const shown = searching
    ? list.filter((s) => matches(s, query.trim()))
    : list.filter((s) => filter === "all" || s.group === filter);
  const showSnake = !searching && (filter === "all" || filter === "snake");
  const myPets = filter === "all" || filter === "lizard" ? (pets.data ?? []) : [];

  return (
    <Screen>
      <TopBar title="관리 가이드라인" fallbackHref="/settings" />
      <ScreenBody flush className="px-4 pt-4">
        <h2 className="mb-3.5 text-title-sm leading-[34px] whitespace-pre-line text-foreground">
          {"어떤 종의 가이드라인을\n볼까요?"}
        </h2>

        <label className="flex h-12 items-center gap-2 rounded-lg bg-card px-3.5">
          <SearchIcon className="size-5 shrink-0 text-subtle-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="종 이름으로 찾기"
            aria-label="종 이름으로 찾기"
            enterKeyHint="search"
            className="h-12 min-w-0 flex-1 bg-transparent text-body-xl text-foreground outline-none placeholder:text-subtle-foreground [&::-webkit-search-cancel-button]:hidden"
          />
        </label>

        {searching ? null : (
          <div role="tablist" aria-label="분류" className="mt-3 flex gap-2">
            {FILTERS.map((f) => {
              const selected = f.value === filter;
              return (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-body-lg font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    selected
                      ? "bg-inverse text-inverse-foreground"
                      : "bg-card text-secondary-text active:bg-gray-200",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {!searching && myPets.length > 0 ? (
          <>
            <SectionLabel>내 개체</SectionLabel>
            <Group>
              {myPets.map((pet, index) => (
                <GroupRow
                  key={pet.id}
                  divider={index > 0}
                  dividerInset={72}
                  href={`/settings/guidelines/${pet.speciesId}?petId=${pet.id}`}
                >
                  <RoundThumb src={pet.photoUrl} />
                  <RowText
                    title={pet.name}
                    description={`${SPECIES_LABEL[pet.speciesId]} 가이드라인`}
                  />
                  <ChevronRightIcon className="size-5 text-foreground" />
                </GroupRow>
              ))}
            </Group>
          </>
        ) : null}

        <SectionLabel>
          {searching ? `찾은 종 ${shown.length}` : `전체 ${shown.length + (showSnake ? 1 : 0)}종`}
        </SectionLabel>
        {species.isPending ? (
          <Skeleton height={144} className="rounded-2xl" />
        ) : shown.length === 0 && !showSnake ? (
          <p className="text-body-md text-muted-foreground">찾는 종이 없어요</p>
        ) : (
          <Group>
            {shown.map((s, index) => {
              const count = careCount(s.id);
              return (
                <GroupRow
                  key={s.id}
                  divider={index > 0}
                  dividerInset={72}
                  href={`/settings/guidelines/${s.id}`}
                >
                  {/* 종 사진은 받을 데이터가 없어 기본 모양으로 */}
                  <RoundThumb />
                  <RowText
                    title={s.commonName}
                    description={[SPECIES_GROUP_LABEL[s.group], count ? `할 일 ${count}가지` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <ChevronRightIcon className="size-5 text-foreground" />
                </GroupRow>
              );
            })}
            {showSnake ? (
              <GroupRow divider={shown.length > 0} dividerInset={72}>
                <RoundThumb dim />
                <RowText dim title="볼파이톤" description="뱀 · 준비 중이에요" />
              </GroupRow>
            ) : null}
          </Group>
        )}
      </ScreenBody>
    </Screen>
  );
}
