import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { speciesQueries } from "@/entities/species";
import { newRequestId } from "@pabom/core/api/adapters";
import { petsApi, recordsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage, getFieldErrors } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import { WEIGHT_CODE } from "@pabom/core/domain/care";
import {
  isPetDraftReady,
  morphFields,
  serverFileId,
  SEX_LABEL,
  sexFields,
  sexSchema,
  stageFields,
  type Pet,
  type PetCreateInput,
  type Sex,
} from "@pabom/core/domain/pet";
import {
  SPECIES_GROUP_LABEL,
  type Morph,
  type Species,
  type SpeciesGroup,
  type SpeciesId,
} from "@pabom/core/domain/species";
import { nowIso, todayYmd } from "@pabom/core/lib/date";
import { requestPushPermission } from "@/features/push";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ChipGroup } from "@/shared/ui/chip";
import { Badge, Skeleton, StepProgress } from "@/shared/ui/display";
import { Field, Input } from "@/shared/ui/form";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic, shadows, toNativeShadow } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { IconButton, TopBar } from "@/shared/ui/top-bar";
import snakeFigure from "../../../assets/images/species-snake-disabled.png";
import { ChecklistBuilder } from "./checklist-builder";
import { PushIn, SectionLabel } from "./choice";
import { HatchFields, LIZARD_FIGURE, MorphPicker, PetPhotoPicker, type PhotoValue } from "./fields";

/** 입력한 내용을 POST /pets 본문으로 */
function toCreateInput(
  draft: Draft,
  species: Species,
  morphs: Morph[],
  clientRequestId: string,
): PetCreateInput {
  return {
    clientRequestId,
    speciesId: species.serverId,
    name: draft.name.trim(),
    ...morphFields(draft.morph, morphs),
    ...stageFields(species, draft),
    adoptedAt: draft.acquiredOn,
    ...sexFields(draft.sex),
    photoFileId: serverFileId(draft.photo.fileId),
  };
}

type Draft = {
  group: SpeciesGroup | null;
  speciesId: SpeciesId | null;
  morph: string | null;
  name: string;
  photo: PhotoValue;
  hatchedOn: string | null;
  hatchUnknown: boolean;
  lifeStageCode: string | null;
  stageUncertain: boolean;
  /** '잘 모르겠어요'일 때 넣은 체중(g). 단계 제안에 쓰고, 등록 뒤 체중 기록으로 남긴다 */
  weightG: number | null;
  sex: Sex;
  acquiredOn: string | null;
};

const EMPTY: Draft = {
  group: null,
  speciesId: null,
  morph: null,
  name: "",
  photo: { fileId: null, url: null },
  hatchedOn: null,
  hatchUnknown: false,
  lifeStageCode: null,
  stageUncertain: false,
  weightG: null,
  sex: "unknown",
  acquiredOn: null,
};

const STEPS = ["분류", "상세 종과 모프", "기본 정보"] as const;
const STEP_COUNT = STEPS.length;

/**
 * SCR-P02 개체 등록 3단계 (분류 · 상세 종과 모프 · 기본 정보).
 * onboarding이면 가입 직후 안내(A04 A안): 뒤로 대신 '나중에 할게요'.
 * 등록이 끝나면 체크 리스트 만드는 중 → 준비 완료 화면을 보여 준 뒤 P03 으로 간다
 */
export function RegisterPetFlow({ onboarding }: { onboarding: boolean }) {
  const queryClient = useQueryClient();
  const { data: speciesList, isPending: speciesPending } = useQuery(speciesQueries.list());
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Figma(A04 A안·P02 1/3) 모두 도마뱀이 골라진 채로 시작한다
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, group: "lizard" });
  const [exitOpen, setExitOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [created, setCreated] = useState<Pet | null>(null);
  // 같은 화면에서 다시 눌러도 한 마리만 등록되도록 요청 ID를 한 번만 만든다
  const [clientRequestId] = useState(newRequestId);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const species = speciesList?.find((s) => s.id === draft.speciesId);
  const { data: morphs } = useQuery(speciesQueries.morphs(species?.serverId));
  const dirty = JSON.stringify(draft) !== JSON.stringify({ ...EMPTY, group: draft.group });
  const exit = () => router.replace(onboarding ? "/home" : "/pets");
  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const create = useMutation({
    mutationFn: async () => {
      const pet = await petsApi.create(
        toCreateInput(draft, species!, morphs ?? [], clientRequestId),
      );
      // [백엔드 확인 필요] CreatePetRequest에 체중 칸이 없어, 넣은 체중은 체중 기록(WEIGHT)으로 남긴다.
      // 기록 저장이 실패해도 등록은 끝난 것이므로 조용히 넘어간다
      if (draft.weightG) {
        await recordsApi
          .create({
            petId: pet.id,
            careItem: WEIGHT_CODE,
            occurredAt: nowIso(),
            weightG: draft.weightG,
          })
          .catch(() => undefined);
      }
      return pet;
    },
    onSuccess: async (pet) => {
      await invalidateCareData(queryClient);
      setCreated(pet);
      // 첫 개체의 관리 일정이 막 생긴 때라 알림이 왜 필요한지 알 수 있다. 아직 안 물었을 때만 창이 뜬다
      void requestPushPermission();
    },
    onError: (error) => {
      const fields = getFieldErrors(error);
      if (fields.name) setNameError(fields.name);
      toast(getErrorMessage(error, "등록하지 못했어요."));
    },
  });

  const canNext = (step === 1 && draft.group === "lizard") || (step === 2 && Boolean(species));
  // 필수는 종·이름뿐이다. 부화일·생애 단계·체중·더 자세한 정보는 비워도 등록된다
  // (비우면 단계는 UNKNOWN으로 보낸다, stageFields)
  const canSubmit = isPetDraftReady(draft) && Boolean(species) && !uploading && !create.isPending;

  const goBack = () => {
    if (step > 1) goTo(step - 1);
    else if (dirty) setExitOpen(true);
    else exit();
  };

  if (created) return <ChecklistBuilder pet={created} photoUrl={draft.photo.url} />;

  return (
    <Screen>
      <TopBar
        title="개체 등록"
        leading={step === 1 && onboarding ? "none" : "back"}
        onLeading={goBack}
        trailing={
          <IconButton
            accessibilityLabel="닫기"
            size={40}
            onPress={() => (dirty ? setExitOpen(true) : exit())}
          >
            <XIcon />
          </IconButton>
        }
      />
      <ScreenBody gap={step === 3 ? 24 : 12} contentStyle={styles.body}>
        <StepProgress step={step} total={STEP_COUNT} label={STEPS[step - 1]!} />
        <PushIn stepKey={step} direction={direction}>
          {step === 1 ? (
            <View style={styles.stack12}>
              <Text variant="title-sm">어떤 친구를 키우고 있나요?</Text>
              <View style={styles.groupCards}>
                <GroupCard
                  selected={draft.group === "lizard"}
                  title={SPECIES_GROUP_LABEL.lizard}
                  figure={LIZARD_FIGURE}
                  onPress={() => patch({ group: "lizard" })}
                />
                {/* 뱀(볼파이톤)은 MVP 범위 밖이라 고를 수 없다 (CLAUDE.md). Figma 그대로 흑백 카드로 두고,
                    왜 못 고르는지 보이게 '준비 중' 배지만 붙인다 (QA T02-01) */}
                <GroupCard
                  disabled
                  badge="준비 중"
                  title={SPECIES_GROUP_LABEL.snake}
                  figure={snakeFigure}
                />
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stack12}>
              <Text variant="title-sm">상세 종과 모프를 골라 주세요</Text>
              <View style={styles.stack20}>
                <View style={styles.pickedRow}>
                  <PickedChip label={SPECIES_GROUP_LABEL.lizard} onPress={() => goTo(1)} />
                </View>
                <View style={styles.stack12}>
                  <SectionLabel>상세 종</SectionLabel>
                  {speciesPending ? (
                    <Skeleton height={44} />
                  ) : (
                    <ChipGroup
                      label="상세 종"
                      options={(speciesList ?? [])
                        .filter((s) => s.group === "lizard")
                        .map((s) => ({ value: s.id, label: s.commonName }))}
                      value={draft.speciesId}
                      onChange={(id) => {
                        if (!id) return;
                        patch({
                          speciesId: id,
                          // 종을 바꾸면 모프 선택은 비운다 (Figma 메모 2/3)
                          morph: draft.speciesId === id ? draft.morph : null,
                          lifeStageCode: null,
                        });
                      }}
                    />
                  )}
                </View>
                {species ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.stack12}>
                      <SectionLabel>모프</SectionLabel>
                      <MorphPicker
                        species={species}
                        value={draft.morph}
                        onChange={(morph) => patch({ morph })}
                      />
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stack24}>
              <PetPhotoPicker
                value={draft.photo}
                onChange={(photo) => patch({ photo })}
                onBusyChange={setUploading}
              />
              <Field label="이름" error={nameError}>
                <Input
                  maxLength={20}
                  placeholder="이름을 지어 주세요"
                  value={draft.name}
                  invalid={Boolean(nameError)}
                  onChangeText={(name) => {
                    setNameError(null);
                    patch({ name });
                  }}
                />
              </Field>
              <HatchFields
                species={species}
                hatchedOn={draft.hatchedOn}
                hatchUnknown={draft.hatchUnknown}
                lifeStageCode={draft.lifeStageCode}
                stageUncertain={draft.stageUncertain}
                weightG={draft.weightG}
                onChange={patch}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: detailsOpen }}
                onPress={() => setDetailsOpen((v) => !v)}
                style={({ pressed }) => [styles.details, pressed && styles.pressed]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body-lg" weight="medium">
                    더 자세한 정보 (선택)
                  </Text>
                  {!detailsOpen ? (
                    <Text variant="body-md" color={semantic.mutedForeground}>
                      성별 · 데려온 날
                    </Text>
                  ) : null}
                </View>
                {detailsOpen ? (
                  <ChevronUpIcon size={14} color={semantic.primary} />
                ) : (
                  <ChevronDownIcon size={14} color={semantic.mutedForeground} />
                )}
              </Pressable>
              {detailsOpen ? (
                <>
                  <Field label="성별">
                    <ChipGroup
                      label="성별"
                      options={sexSchema.options.map((value) => ({
                        value,
                        label: SEX_LABEL[value],
                      }))}
                      value={draft.sex}
                      onChange={(sex) => patch({ sex: sex ?? "unknown" })}
                    />
                  </Field>
                  <Field label="데려온 날">
                    <DateField
                      title="데려온 날"
                      value={draft.acquiredOn}
                      max={todayYmd()}
                      onChange={(acquiredOn) => patch({ acquiredOn })}
                    />
                  </Field>
                </>
              ) : null}
            </View>
          ) : null}
        </PushIn>
      </ScreenBody>

      <ScreenFooter minBottom={26}>
        {step < STEP_COUNT ? (
          <Button size="xl" disabled={!canNext} onPress={() => goTo(step + 1)}>
            다음
          </Button>
        ) : (
          <Button
            size="xl"
            disabled={!canSubmit}
            loading={create.isPending || uploading}
            onPress={() => create.mutate()}
          >
            등록하기
          </Button>
        )}
        {onboarding && step === 1 ? (
          <Pressable accessibilityRole="button" onPress={exit} style={styles.later}>
            <Text variant="body-lg" weight="medium" color={semantic.secondaryText}>
              나중에 할게요
            </Text>
          </Pressable>
        ) : null}
      </ScreenFooter>

      <ConfirmDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title="작성 중인 내용이 있어요"
        description="나가면 입력한 내용이 사라져요."
        cancelLabel="계속 작성"
        confirmLabel="나가기"
        tone="inverse"
        onConfirm={exit}
      />
    </Screen>
  );
}

/**
 * 분류 큰 선택 카드 (Figma 종 고르기 · 도마뱀 카드/뱀 카드, 184px).
 * 고르면 연파랑 바탕 + 파란 2px 테두리, 아니면 흰 카드 + 그림자. 누르면 살짝 눌렸다 튄다
 */
function GroupCard({
  title,
  figure,
  badge,
  selected,
  disabled,
  onPress,
}: {
  title: string;
  figure: number;
  badge?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={badge ? `${title} (${badge})` : title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.groupCard,
        selected ? styles.groupCardOn : [styles.groupCardOff, toNativeShadow(shadows.sm)],
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={styles.groupFigure}>
        <Image source={figure} alt="" resizeMode="contain" style={styles.fill} />
      </View>
      <View style={styles.groupTitle}>
        <Text
          variant="body-xl"
          weight="semibold"
          color={disabled ? semantic.mutedForeground : undefined}
        >
          {title}
        </Text>
        {badge ? <Badge>{badge}</Badge> : null}
      </View>
    </Pressable>
  );
}

/** 앞 단계에서 고른 값 (Figma 선택값 칩). 누르면 그 단계로 돌아가 다시 고를 수 있다 */
function PickedChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} 다시 고르기`}
      onPress={onPress}
      style={({ pressed }) => [styles.picked, pressed && styles.pressed]}
    >
      <View style={styles.pickedFigure}>
        <View style={styles.pickedFigureImage}>
          <Image source={LIZARD_FIGURE} alt="" resizeMode="contain" style={styles.fill} />
        </View>
      </View>
      <Text variant="body-lg" weight="semibold" color={semantic.inverseForeground}>
        {label}
      </Text>
      <XIcon size={16} color={semantic.inverseForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16 },
  stack12: { gap: 12 },
  stack20: { gap: 20 },
  stack24: { gap: 24 },
  groupCards: { flexDirection: "row", gap: 12 },
  groupCard: {
    flex: 1,
    height: 184,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 12,
    borderRadius: radius["2xl"],
  },
  groupCardOn: {
    borderWidth: 2,
    borderColor: semantic.primary,
    backgroundColor: semantic.primarySoft,
  },
  groupCardOff: { borderWidth: 1, borderColor: semantic.border, backgroundColor: semantic.card },
  // 흰 배경 피규어 사진이라 곱하기로 카드 색에 섞는다 (Figma mix-blend multiply)
  groupFigure: { width: 132, height: 100, mixBlendMode: "multiply" },
  groupTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  fill: { width: "100%", height: "100%" },
  pickedRow: { flexDirection: "row", flexWrap: "wrap" },
  picked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: semantic.inverse,
  },
  pickedFigure: {
    width: 24,
    height: 24,
    overflow: "hidden",
    borderRadius: radius.full,
    backgroundColor: semantic.card,
  },
  pickedFigureImage: {
    position: "absolute",
    left: 1,
    top: 3,
    width: 22,
    height: 18,
    mixBlendMode: "multiply",
  },
  divider: { height: 1, backgroundColor: semantic.border },
  details: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius["2xl"],
    backgroundColor: semantic.card,
  },
  pressed: { opacity: 0.7 },
  later: { alignSelf: "center", paddingVertical: 4 },
});
