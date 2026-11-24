import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { routineQueries } from "@/entities/routine";
import { stageName, useSpeciesMap } from "@/entities/species";
import { SPECIES_LABEL, type Pet } from "@pabom/core/domain/pet";
import { isKnownStage } from "@pabom/core/domain/species";
import { Button } from "@/shared/ui/button";
import { CheckIcon } from "@/shared/ui/icons";
import { ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { LIZARD_FIGURE } from "./fields";

/**
 * 만드는 중 화면의 단계 사이 시간 (Figma SCR-P02 체크 리스트 만드는 중 / 0~5 의 AFTER_TIMEOUT).
 * 0→1 0.3s, 그 뒤 0.45s 씩, 마지막 5→준비 완료 0.4s
 */
const PHASE_MS = [300, 450, 450, 450, 450, 400] as const;
const LAST_PHASE = 5;
/** 마지막 단계(할 일 N개 만들기)가 진행 중인 phase */
const MAKING_PHASE = 4;

/**
 * SCR-P02 · 체크 리스트 만드는 중 → 준비 완료.
 * 등록이 끝난 개체의 체크 리스트(백엔드가 등록 때 만든 루틴)를 불러오는 동안 네 단계를 차례로 체크하고,
 * 다 되면 '체크 리스트가 준비됐어요'와 '체크 리스트 보기'(P03)로 넘어간다
 */
export function ChecklistBuilder({ pet, photoUrl }: { pet: Pet; photoUrl: string | null }) {
  const species = useSpeciesMap();
  const routines = useQuery(routineQueries.list(pet.id));
  const [phase, setPhase] = useState(0);

  const count = routines.data?.filter((r) => r.enabled).length ?? null;
  const speciesLabel = SPECIES_LABEL[pet.speciesId];
  // 단계 확인 전 개체는 어린 개체 기준으로 만든다 (P03 '단계 확인 전')
  const stage = isKnownStage(pet.lifeStageCode)
    ? stageName(species.get(pet.speciesId), pet.lifeStageCode)
    : "어린 개체";
  // 루틴을 다 불러오기(실패 포함) 전에는 마지막 단계(할 일 N개 만들기)를 돌리며 기다린다
  const loaded = !routines.isPending;
  const ready = phase > LAST_PHASE;

  useEffect(() => {
    if (ready || (phase === MAKING_PHASE && !loaded)) return;
    const timer = setTimeout(() => setPhase((p) => p + 1), PHASE_MS[phase]);
    return () => clearTimeout(timer);
  }, [phase, loaded, ready]);

  const photo = photoUrl ?? pet.photoUrl;
  const steps = [
    `${speciesLabel} · ${stage} 기준 찾기`,
    "급여 · 분무 · 물 갈기 주기 맞추기",
    "체중 · 청소 · 탈피 일정 정하기",
    count ? `할 일 ${count}개 만들기` : "할 일 만들기",
  ];

  return ready ? (
    <ChecklistReady name={pet.name} photo={photo} count={count} petId={pet.id} />
  ) : (
    <Building
      name={pet.name}
      photo={photo}
      subtitle={`${speciesLabel} · ${stage} 기준이에요`}
      steps={steps}
      phase={phase}
    />
  );
}

/** 개체 사진 동그라미. 사진이 없으면 연파랑 원 안에 종 피규어 */
function PetCircle({ photo, size }: { photo: string | null; size: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      {photo ? (
        <Image source={{ uri: photo }} alt="" resizeMode="cover" style={styles.fill} />
      ) : (
        <View style={styles.figure}>
          <Image source={LIZARD_FIGURE} alt="" resizeMode="contain" style={styles.fill} />
        </View>
      )}
    </View>
  );
}

function Building({
  name,
  photo,
  subtitle,
  steps,
  phase,
}: {
  name: string;
  photo: string | null;
  subtitle: string;
  steps: string[];
  phase: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.screen, styles.building, { paddingTop: insets.top + 74 }]}
    >
      <PetCircle photo={photo} size={72} />
      <Text variant="title-sm" style={styles.buildingTitle}>
        {name}에게 꼭 맞는{"\n"}체크 리스트를 만들고 있어요
      </Text>
      <Text variant="body-xl" color={semantic.mutedForeground} style={styles.subtitle}>
        {subtitle}
      </Text>
      <View style={styles.stepCard}>
        {steps.map((label, i) => {
          // phase 1이면 1단계 진행, 2면 1단계 완료·2단계 진행 … 5면 모두 완료
          const state = i < phase - 1 ? "done" : i === phase - 1 ? "active" : "waiting";
          return (
            <View key={label} style={styles.stepRow}>
              <StepIcon state={state} />
              <Text
                variant="body-xl"
                weight={state === "active" ? "semibold" : "medium"}
                color={
                  state === "done"
                    ? semantic.secondaryText
                    : state === "active"
                      ? semantic.foreground
                      : semantic.subtleForeground
                }
                style={{ flex: 1 }}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** 생성 단계 아이콘 (Figma 대기 · 진행 · 완료) */
function StepIcon({ state }: { state: "waiting" | "active" | "done" }) {
  if (state === "done") {
    return (
      <View style={styles.stepDone}>
        <CheckIcon size={14} color={semantic.primaryForeground} strokeWidth={3} />
      </View>
    );
  }
  if (state === "active") return <Spinning />;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={semantic.input} strokeWidth={2} fill="none" />
    </Svg>
  );
}

/** 진행 중: 연회색 고리 위 파란 1/4 호가 돈다 */
function Spinning() {
  const [turn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [turn]);
  return (
    <View style={styles.stepIcon}>
      <Animated.View
        style={{
          transform: [
            { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
          ],
        }}
      >
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Circle cx={11} cy={11} r={9.75} stroke={semantic.border} strokeWidth={2.5} fill="none" />
          <Path
            d="M11 1.25A9.75 9.75 0 0 1 20.75 11"
            stroke={semantic.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** SCR-P02 체크 리스트 준비 완료. 사진이 살짝 커지며 체크 배지가 튀어나온다 (준비 완료/0 → 준비 완료, 0.35s) */
function ChecklistReady({
  name,
  photo,
  count,
  petId,
}: {
  name: string;
  photo: string | null;
  count: number | null;
  petId: string;
}) {
  const [appear] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(appear, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [appear]);

  return (
    <View style={styles.screen}>
      <View style={styles.ready}>
        <Animated.View
          style={{
            transform: [
              { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [94 / 104, 1] }) },
            ],
          }}
        >
          <PetCircle photo={photo} size={104} />
          <Animated.View style={[styles.badge, { transform: [{ scale: appear }] }]}>
            <CheckIcon size={18} color={semantic.primaryForeground} strokeWidth={3} />
          </Animated.View>
        </Animated.View>
        <Text variant="title-sm" align="center" style={styles.readyTitle}>
          {name}의 체크 리스트가{"\n"}준비됐어요
        </Text>
        <Text
          variant="body-xl"
          color={semantic.mutedForeground}
          align="center"
          style={styles.subtitle}
        >
          {count ? `매일 챙길 할 일 ${count}개를 만들었어요.` : "매일 챙길 할 일을 만들었어요."}
          {"\n"}필요 없는 건 다음 화면에서 바로 끌 수 있어요.
        </Text>
      </View>
      <ScreenFooter minBottom={34} style={{ backgroundColor: semantic.background }}>
        <Button
          size="xl"
          onPress={() =>
            router.replace({
              pathname: "/pets/[petId]/routines",
              params: { petId, from: "register" },
            })
          }
        >
          체크 리스트 보기
        </Button>
      </ScreenFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: semantic.background },
  building: { paddingHorizontal: 24 },
  circle: { overflow: "hidden", backgroundColor: semantic.primarySoft },
  figure: {
    position: "absolute",
    left: "-6%",
    top: "14%",
    width: "112%",
    height: "72%",
    mixBlendMode: "multiply",
  },
  fill: { width: "100%", height: "100%" },
  buildingTitle: { marginTop: 20, lineHeight: 34 },
  subtitle: { marginTop: 12, lineHeight: 21 },
  stepCard: {
    marginTop: 40,
    gap: 22,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: radius["2xl"],
    backgroundColor: semantic.muted,
  },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepIcon: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  stepDone: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: semantic.primary,
  },
  ready: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  readyTitle: { marginTop: 24, lineHeight: 36 },
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: semantic.card,
    backgroundColor: semantic.primary,
  },
});
