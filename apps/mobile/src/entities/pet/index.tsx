import { router, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SPECIES_LABEL, type Pet } from "@pabom/core/domain/pet";
import { Avatar, Card } from "@/shared/ui/display";
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
