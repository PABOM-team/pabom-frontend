import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { PetCard, petQueries } from "@/entities/pet";
import { stageName, useSpeciesMap } from "@/entities/species";
import { useTabBarInset } from "@/features/tab-bar";
import { SPECIES_LABEL, type Pet, type SpeciesId } from "@pabom/core/domain/pet";
import { Button } from "@/shared/ui/button";
import { LoadError, Skeleton } from "@/shared/ui/display";
import { SearchIcon, XIcon } from "@/shared/ui/icons";
import { Screen } from "@/shared/ui/screen";
import { Text, textStyles, weightStyle } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { IconButton } from "@/shared/ui/top-bar";
import emptyFigure from "../../../assets/images/pets-empty-figure.png";
import { ZoomLink } from "@/shared/ui/zoom-link";

/** Figma 본문 좌우 여백 · 2열 사이 간격 */
const GUTTER = 16;
const COLUMN_GAP = 12;
/** 7마리 이상 + 종 2개 이상이면 종 칩으로 좁혀 본다 (Figma 메모) */
const CHIP_MIN_PETS = 7;
/** 검색칸 열고 닫기 (Figma SMART_ANIMATE 0.25 ease-out) */
const SEARCH_MS = 250;

/** '크레스티드 게코' → '크레스티드' (칩은 짧게) */
const shortSpecies = (id: SpeciesId) => SPECIES_LABEL[id].replace(/\s*게코$/, "");

const matches = (pet: Pet, query: string) => {
  const q = query.trim().toLowerCase();
  return (
    !q ||
    pet.name.toLowerCase().includes(q) ||
    [SPECIES_LABEL[pet.speciesId], pet.morph ?? ""].some((s) => s.toLowerCase().includes(q))
  );
};

/** SCR-P01 내 개체 목록. 2열 사진 · 등록순 · 돋보기로 이름·종 찾기 · 많으면 종 칩 */
export function PetsScreen() {
  const species = useSpeciesMap();
  const tabBarInset = useTabBarInset();
  const { width } = useWindowDimensions();
  const cellWidth = (width - GUTTER * 2 - COLUMN_GAP) / 2;
  const { data, isPending, isError, refetch } = useQuery(petQueries.list());
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesId | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [searchProgress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(searchProgress, {
      toValue: searching ? 1 : 0,
      duration: SEARCH_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [searching, searchProgress]);

  const pets = data ?? [];
  const speciesIds = [...new Set(pets.map((p) => p.speciesId))];
  const showChips = !searching && pets.length >= CHIP_MIN_PETS && speciesIds.length >= 2;
  const visible = searching
    ? pets.filter((p) => matches(p, query))
    : pets.filter((p) => !showChips || !speciesFilter || p.speciesId === speciesFilter);

  const closeSearch = () => {
    setSearching(false);
    setQuery("");
  };

  const renderGrid = (list: Pet[]) => (
    <View style={styles.grid}>
      {list.map((pet) => (
        <PetCard
          key={pet.id}
          pet={pet}
          width={cellWidth}
          href={{ pathname: "/pets/[petId]", params: { petId: pet.id } }}
          stageName={stageName(species.get(pet.speciesId), pet.lifeStageCode)}
        />
      ))}
    </View>
  );

  const header = searching ? (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: searchProgress,
          transform: [
            {
              translateY: searchProgress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }),
            },
          ],
        },
      ]}
    >
      <View style={styles.searchField}>
        <SearchIcon size={20} color={semantic.subtleForeground} />
        <TextInput
          autoFocus
          accessibilityLabel="이름이나 종으로 찾기"
          placeholder="이름이나 종으로 찾기"
          placeholderTextColor={semantic.subtleForeground}
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          style={[textStyles["body-lg"], weightStyle("regular"), styles.searchInput]}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="지우기"
            hitSlop={8}
            onPress={() => setQuery("")}
            style={styles.clear}
          >
            <XIcon size={12} color={semantic.card} strokeWidth={3} />
          </Pressable>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" onPress={closeSearch} hitSlop={8}>
        <Text variant="body-lg" weight="medium" color={semantic.secondaryText}>
          취소
        </Text>
      </Pressable>
    </Animated.View>
  ) : (
    <View style={styles.header}>
      <Text variant="title-md" accessibilityRole="header">
        내 개체
        {pets.length && !showChips ? (
          <Text variant="title-md" color={semantic.subtleForeground}>
            {` ${pets.length}`}
          </Text>
        ) : null}
      </Text>
      <View style={{ flex: 1 }} />
      {pets.length ? (
        <>
          <IconButton accessibilityLabel="개체 찾기" onPress={() => setSearching(true)}>
            <SearchIcon size={24} color={semantic.mutedForeground} />
          </IconButton>
          <ZoomLink href="/pets/new">
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="개체 추가"
              hitSlop={8}
              style={styles.addLink}
            >
              <Text variant="body-xl" weight="semibold" color={semantic.primary}>
                추가
              </Text>
            </Pressable>
          </ZoomLink>
        </>
      ) : null}
    </View>
  );

  const body = () => {
    if (isPending) {
      return (
        <View style={styles.grid}>
          {[0, 1].map((i) => (
            <Skeleton key={i} width={cellWidth} height={cellWidth + 54} />
          ))}
        </View>
      );
    }
    if (isError) return <LoadError onRetry={() => refetch()} style={{ paddingTop: 128 }} />;
    if (pets.length === 0) {
      return (
        <View style={styles.empty}>
          <Image source={emptyFigure} alt="" style={styles.figure} resizeMode="contain" />
          <Text variant="title-xs" align="center">
            첫 개체를 등록해 주세요
          </Text>
          <Text variant="body-xl" color={semantic.mutedForeground} align="center">
            {"종을 고르면 그 아이에게 맞는\n할 일을 바로 만들어 드려요"}
          </Text>
          <ZoomLink href="/pets/new">
            <Button size="xl" style={styles.emptyButton}>
              개체 등록하기
            </Button>
          </ZoomLink>
        </View>
      );
    }
    if (searching) {
      const q = query.trim();
      if (q && visible.length === 0) {
        return (
          <View style={styles.noResult}>
            <Text variant="title-xs" weight="bold" align="center">
              {`'${q}'와 맞는 개체가 없어요`}
            </Text>
            <Text variant="body-xl" color={semantic.mutedForeground} align="center">
              이름이나 종 이름을 다시 확인해 주세요
            </Text>
          </View>
        );
      }
      return (
        <>
          <Text variant="body-lg" weight="semibold" color={semantic.mutedForeground}>
            {q ? `지금 함께하는 개체 ${visible.length}` : `전체 ${pets.length}마리`}
          </Text>
          {renderGrid(visible)}
        </>
      );
    }
    return (
      <>
        {showChips ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chips}
          >
            {[null, ...speciesIds].map((id) => {
              const selected = id === speciesFilter;
              const count = id ? pets.filter((p) => p.speciesId === id).length : pets.length;
              return (
                <Pressable
                  key={id ?? "all"}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSpeciesFilter(id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text
                    variant="body-lg"
                    weight="semibold"
                    color={selected ? semantic.inverseForeground : semantic.secondaryText}
                  >
                    {id ? shortSpecies(id) : "전체"}
                  </Text>
                  <Text
                    variant="body-lg"
                    weight="semibold"
                    color={selected ? semantic.inverseForeground : semantic.subtleForeground}
                  >
                    {count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {renderGrid(visible)}
      </>
    );
  };

  return (
    <Screen style={{ backgroundColor: semantic.screen }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarInset },
          pets.length === 0 && !isPending && !isError && { flexGrow: 1 },
        ]}
      >
        {header}
        {body()}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingHorizontal: GUTTER, paddingTop: 4 },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 8,
  },
  addLink: { paddingLeft: 10, paddingVertical: 10 },
  searchField: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    backgroundColor: semantic.card,
  },
  searchInput: { flex: 1, paddingVertical: 0, color: semantic.foreground },
  clear: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: semantic.subtleForeground,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: COLUMN_GAP, rowGap: 20 },
  chipScroll: { marginRight: -GUTTER },
  chips: { gap: 8, paddingRight: GUTTER },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: semantic.card,
  },
  chipSelected: { backgroundColor: semantic.inverse },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 60 },
  figure: { width: 150, height: 150 },
  emptyButton: { width: 220, marginTop: 8 },
  noResult: { gap: 6, paddingTop: 120, alignItems: "center" },
});
