import { router, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { END_REASON_LABEL, SPECIES_LABEL, type Pet } from "@pabom/core/domain/pet";
import { formatYearMonth } from "@pabom/core/lib/date";
import { Avatar, Badge, Card } from "@/shared/ui/display";
import { ChevronRightIcon, PlusIcon } from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";

// 조회 로직은 웹·앱이 함께 쓰는 @pabom/core 에 있다. 여기는 앱 UI만
export { petQueries } from "@pabom/core/entities/pet";

export function petSpeciesLine(pet: Pick<Pet, "speciesId" | "morph">) {
  return [SPECIES_LABEL[pet.speciesId], pet.morph].filter(Boolean).join(" · ");
}

/** 내 개체 목록 카드 (SCR-P01) */
export function PetCard({ pet, stageName, href }: { pet: Pet; stageName: string; href: Href }) {
  return (
    <Card onPress={() => router.push(href)} accessibilityLabel={pet.name} style={styles.card}>
      <Avatar src={pet.photoUrl} size={56} />
      <View style={styles.body}>
        <Text variant="title-xs" numberOfLines={1}>
          {pet.name}
        </Text>
        <Text variant="body-lg" color={semantic.mutedForeground} numberOfLines={1}>
          {petSpeciesLine(pet)}
        </Text>
        <Text variant="body-lg" color={semantic.mutedForeground} numberOfLines={1}>
          {stageName} · 오늘 할 일 {pet.todayRemaining}
        </Text>
      </View>
      <ChevronRightIcon size={16} color={semantic.subtleForeground} />
    </Card>
  );
}

/** 함께했던 개체 카드 (SCR-P08). 흐리게 하지 않고 회색 바탕 + 상태 배지 */
export function EndedPetCard({ pet, href }: { pet: Pet; href: Href }) {
  const period = [pet.firstRecordOn ?? pet.createdAt.slice(0, 10), pet.endedOn]
    .filter((d): d is string => Boolean(d))
    .map((d) => formatYearMonth(d))
    .join(" ~ ");
  return (
    <Card
      onPress={() => router.push(href)}
      accessibilityLabel={pet.name}
      style={[styles.card, { backgroundColor: semantic.muted }]}
    >
      <Avatar src={pet.photoUrl} size={56} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="title-xs" numberOfLines={1} style={{ flexShrink: 1 }}>
            {pet.name}
          </Text>
          {pet.endReason ? <Badge>{END_REASON_LABEL[pet.endReason]}</Badge> : null}
        </View>
        <Text variant="body-lg" color={semantic.mutedForeground} numberOfLines={1}>
          {petSpeciesLine(pet)}
        </Text>
        <Text variant="body-lg" color={semantic.mutedForeground} numberOfLines={1}>
          {period} · 기록 {pet.recordCount}
        </Text>
      </View>
      <ChevronRightIcon size={16} color={semantic.subtleForeground} />
    </Card>
  );
}

export function AddPetCard({ href }: { href: Href }) {
  return (
    <Card
      dashed
      onPress={() => router.push(href)}
      accessibilityLabel="개체 추가"
      style={styles.addCard}
    >
      <View style={styles.addCircle}>
        <PlusIcon size={20} color={semantic.mutedForeground} />
      </View>
      <Text variant="body-xl" weight="bold">
        개체 추가
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  addCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  addCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: semantic.input,
  },
});
