import type { Href } from "expo-router";
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SEX_SYMBOL, SPECIES_LABEL, type Pet } from "@pabom/core/domain/pet";
import { PawPrintIcon } from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { ZoomPressable, ZoomSource } from "@/shared/ui/zoom-link";
import { radius, semantic } from "@/shared/ui/theme";

// 조회 로직은 웹·앱이 함께 쓰는 @pabom/core 에 있다. 여기는 앱 UI만
export { petQueries } from "@pabom/core/entities/pet";

export function petSpeciesLine(pet: Pick<Pet, "speciesId" | "morph">) {
  return [SPECIES_LABEL[pet.speciesId], pet.morph].filter(Boolean).join(" · ");
}

/** 개체 사진 (네모, 둥근 모서리). 사진이 없으면 회색 칸 + 발자국 */
export function PetPhoto({
  src,
  style,
  rounded = radius["2xl"],
  iconSize = 32,
}: {
  src: string | null;
  style?: StyleProp<ViewStyle>;
  rounded?: number;
  /** 사진이 없을 때 발자국 크기 */
  iconSize?: number;
}) {
  return (
    <View style={[styles.photo, { borderRadius: rounded }, style]}>
      {src ? (
        <Image source={{ uri: src }} alt="" style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <PawPrintIcon size={iconSize} color={semantic.subtleForeground} />
      )}
    </View>
  );
}

/** 이름 + 성별 기호 (콩이 ♂) */
export function PetName({
  pet,
  variant = "body-xl",
}: {
  pet: Pick<Pet, "name" | "sex">;
  variant?: "body-xl" | "title-md";
}) {
  const symbol = SEX_SYMBOL[pet.sex];
  return (
    <Text variant={variant} weight="bold" numberOfLines={1}>
      {pet.name}
      {symbol ? (
        <Text
          variant={variant === "title-md" ? "title-xs" : "body-lg"}
          weight="medium"
          color={semantic.subtleForeground}
        >
          {` ${symbol}`}
        </Text>
      ) : null}
    </Text>
  );
}

/** 내 개체 목록 칸 (SCR-P01 2열 사진): 사진 · 이름 ♂ · 종 · 생애 단계 */
export function PetCard({
  pet,
  stageName,
  href,
  width,
}: {
  pet: Pet;
  stageName: string;
  href: Href;
  /** 2열 칸 너비 (화면 너비에서 계산) */
  width: number;
}) {
  // 사진에서 개체 상세가 커져 나오고, 밀어서 돌아가면 이 사진으로 작아져 들어간다 (iOS 줌 전환 · 상세의 큰 사진과 맞춰짐)
  return (
    <ZoomPressable
      href={href}
      sourceInside
      accessibilityRole="link"
      accessibilityLabel={pet.name}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}
    >
      <ZoomSource>
        <PetPhoto src={pet.photoUrl} style={{ width, height: width }} />
      </ZoomSource>
      <View style={styles.text}>
        <PetName pet={pet} />
        <Text variant="body-md" color={semantic.mutedForeground} numberOfLines={1}>
          {[SPECIES_LABEL[pet.speciesId], stageName].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </ZoomPressable>
  );
}

const styles = StyleSheet.create({
  photo: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.border,
  },
  text: { gap: 2, paddingTop: 10 },
  pressed: { opacity: 0.7 },
});
