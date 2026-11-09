import { useLocalSearchParams } from "expo-router";
import { RegisterPetFlow } from "@/features/pet-form";

/** SCR-P02 개체 등록. ?onboarding=1 이면 가입 직후 안내 흐름 */
export function RegisterPetScreen() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  return <RegisterPetFlow onboarding={onboarding === "1"} />;
}
