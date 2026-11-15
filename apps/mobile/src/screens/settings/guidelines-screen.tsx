import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { speciesQueries } from "@/entities/species";
import { SPECIES_GROUP_LABEL, SPECIES_GROUPS, type SpeciesGroup } from "@pabom/core/domain/species";
import { PhotoBox, Skeleton } from "@/shared/ui/display";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";

const isGroup = (value: string | undefined): value is SpeciesGroup =>
  SPECIES_GROUPS.includes(value as SpeciesGroup);

/** SCR-S04 관리 가이드라인 1 분류 → 2 종. 분류·종 목록은 서버에서 받아 그린다 [제안] */
export function GuidelinesScreen() {
  const { group } = useLocalSearchParams<{ group?: string }>();
  const { data, isPending } = useQuery(speciesQueries.list());

  if (isGroup(group)) {
    const list = (data ?? []).filter((s) => s.group === group);
    return (
      <Screen>
        <TopBar title={SPECIES_GROUP_LABEL[group]} fallbackHref="/settings/guidelines" />
        <ScreenBody>
          <Text variant="title-xs" style={styles.heading}>
            어떤 종인가요?
          </Text>
          {isPending ? <Skeleton height={128} /> : null}
          <View>
            {list.map((s) => (
              <Row
                key={s.id}
                href={{ pathname: "/settings/guidelines/[speciesId]", params: { speciesId: s.id } }}
                title={s.commonName}
              />
            ))}
          </View>
          <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 12 }}>
            종이 늘면 이 목록만 길어져요
          </Text>
        </ScreenBody>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="관리 가이드라인" fallbackHref="/settings" />
      <ScreenBody>
        <Text variant="title-xs" style={styles.heading}>
          어떤 친구의 가이드라인을 볼까요?
        </Text>
        <View>
          {SPECIES_GROUPS.map((g) => {
            const count = (data ?? []).filter((s) => s.group === g).length;
            // 뱀(볼파이톤)은 MVP 범위 밖이라 가이드라인이 없다. 줄은 Figma 그대로 두고 누를 곳만 없다
            return (
              <Row
                key={g}
                href={
                  g === "snake"
                    ? undefined
                    : { pathname: "/settings/guidelines", params: { group: g } }
                }
                title={SPECIES_GROUP_LABEL[g]}
                description={g === "snake" ? "볼파이톤" : data ? `종 ${count}개` : undefined}
              />
            );
          })}
        </View>
      </ScreenBody>
    </Screen>
  );
}

function Row({ href, title, description }: { href?: Href; title: string; description?: string }) {
  const body = (
    <>
      <PhotoBox />
      <View style={styles.grow}>
        <Text variant="body-xl" weight="bold">
          {title}
        </Text>
        {description ? (
          <Text variant="body-md" color={semantic.mutedForeground}>
            {description}
          </Text>
        ) : null}
      </View>
      <ChevronRightIcon size={16} color={semantic.subtleForeground} />
    </>
  );
  return href ? (
    <Pressable accessibilityRole="link" onPress={() => router.push(href)} style={styles.row}>
      {body}
    </Pressable>
  ) : (
    <View style={styles.row}>{body}</View>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  grow: { flex: 1, minWidth: 0 },
});
