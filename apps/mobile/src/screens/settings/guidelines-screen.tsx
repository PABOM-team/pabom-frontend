import { useQueries, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { petQueries } from "@/entities/pet";
import { speciesQueries } from "@/entities/species";
import {
  SPECIES_GROUP_LABEL,
  SPECIES_GROUPS,
  SPECIES_LABEL,
  type Species,
  type SpeciesGroup,
} from "@pabom/core/domain/species";
import { Skeleton } from "@/shared/ui/display";
import { ChevronRightIcon, SearchIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text, textStyles, weightStyle } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";
import { Group, GroupRow, PAGE_PADDING, RoundThumb, RowText, SectionLabel } from "./settings-ui";

type Filter = "all" | SpeciesGroup;

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  ...SPECIES_GROUPS.map((g) => ({ value: g, label: SPECIES_GROUP_LABEL[g] })),
];

const isFilter = (value: string | undefined): value is Filter =>
  FILTERS.some((f) => f.value === value);

/** 검색어가 이름·공식 이름·별칭 어디든 들어 있으면 */
const matches = (species: Species, query: string) =>
  [species.commonName, species.officialName, ...species.aliases].some((name) =>
    name.toLowerCase().includes(query.toLowerCase()),
  );

/**
 * SCR-S04 관리 가이드라인 1 종 고르기. 검색 · 분류 칩 · 내 개체 · 전체 종.
 * 뱀(볼파이톤)은 MVP 범위 밖이라 가이드라인이 없어 '준비 중' 줄만 흐리게 둔다
 */
export function GuidelinesScreen() {
  const params = useLocalSearchParams<{ group?: string }>();
  const [filter, setFilter] = useState<Filter>(isFilter(params.group) ? params.group : "all");
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

  const speciesRow = (s: Species, index: number) => {
    const count = careCount(s.id);
    return (
      <GroupRow
        key={s.id}
        accessibilityRole="link"
        divider={index > 0}
        dividerInset={72}
        href={{ pathname: "/settings/guidelines/[speciesId]", params: { speciesId: s.id } }}
      >
        {/* 종 사진은 받을 데이터가 없어 기본 모양으로 */}
        <RoundThumb />
        <RowText
          title={s.commonName}
          description={[SPECIES_GROUP_LABEL[s.group], count ? `할 일 ${count}가지` : null]
            .filter(Boolean)
            .join(" · ")}
        />
        <ChevronRightIcon size={20} color={semantic.foreground} />
      </GroupRow>
    );
  };

  return (
    <Screen style={{ backgroundColor: semantic.screen }}>
      <TopBar
        title="관리 가이드라인"
        fallbackHref="/settings"
        style={{ backgroundColor: semantic.screen }}
      />
      <ScreenBody flush contentStyle={styles.content}>
        <Text variant="title-sm" style={styles.heading}>
          {"어떤 종의 가이드라인을\n볼까요?"}
        </Text>

        <View style={styles.search}>
          <SearchIcon size={20} color={semantic.subtleForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="종 이름으로 찾기"
            placeholderTextColor={semantic.subtleForeground}
            returnKeyType="search"
            accessibilityLabel="종 이름으로 찾기"
            style={[textStyles["body-xl"], weightStyle("regular"), styles.searchInput]}
          />
        </View>

        {searching ? null : (
          <View accessibilityRole="tablist" style={styles.chips}>
            {FILTERS.map((f) => {
              const selected = f.value === filter;
              return (
                <Pressable
                  key={f.value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(f.value)}
                  style={[styles.chip, selected && { backgroundColor: semantic.inverse }]}
                >
                  <Text
                    variant="body-lg"
                    weight="semibold"
                    color={selected ? semantic.inverseForeground : semantic.secondaryText}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {!searching && myPets.length > 0 ? (
          <>
            <SectionLabel>내 개체</SectionLabel>
            <Group>
              {myPets.map((pet, index) => (
                <GroupRow
                  key={pet.id}
                  accessibilityRole="link"
                  divider={index > 0}
                  dividerInset={72}
                  href={{
                    pathname: "/settings/guidelines/[speciesId]",
                    params: { speciesId: pet.speciesId, petId: pet.id },
                  }}
                >
                  <RoundThumb src={pet.photoUrl} />
                  <RowText
                    title={pet.name}
                    description={`${SPECIES_LABEL[pet.speciesId]} 가이드라인`}
                  />
                  <ChevronRightIcon size={20} color={semantic.foreground} />
                </GroupRow>
              ))}
            </Group>
          </>
        ) : null}

        <SectionLabel>
          {searching ? `찾은 종 ${shown.length}` : `전체 ${shown.length + (showSnake ? 1 : 0)}종`}
        </SectionLabel>
        {species.isPending ? (
          <Skeleton height={144} style={{ borderRadius: radius["2xl"] }} />
        ) : shown.length === 0 && !showSnake ? (
          <Text variant="body-md" color={semantic.mutedForeground}>
            찾는 종이 없어요
          </Text>
        ) : (
          <Group>
            {shown.map(speciesRow)}
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: PAGE_PADDING, paddingTop: 16 },
  heading: { lineHeight: 34, marginBottom: 14 },
  search: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: semantic.card,
  },
  searchInput: { flex: 1, height: 48, paddingVertical: 0, color: semantic.foreground },
  chips: { flexDirection: "row", gap: 8, marginTop: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: semantic.card,
  },
});
