import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { meQueries } from "@/entities/session";
import { speciesQueries } from "@/entities/species";
import { petsApi, recordsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage, getFieldErrors } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import { isPetPhotoDisabled, isRoutineDetached } from "@pabom/core/config/env";
import { WEIGHT_CODE } from "@pabom/core/domain/care";
import {
  morphFields,
  serverFileId,
  SEX_LABEL,
  sexFields,
  sexSchema,
  stageFields,
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
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ChipGroup } from "@/shared/ui/chip";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PhotoBox, Skeleton, StepProgress } from "@/shared/ui/display";
import { Field, Input } from "@/shared/ui/form";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { alpha, radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { IconButton, TopBar, TopBarAction } from "@/shared/ui/top-bar";
import { HatchFields, MorphPicker, PetPhotoPicker, type PhotoValue } from "./fields";

const STEPS = ["분류", "종", "모프", "기본 정보"] as const;

/** RN 에서는 crypto.randomUUID 가 보장되지 않아 시간 + 난수로 요청 ID를 만든다 */
const newRequestId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

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

/**
 * SCR-P02 개체 등록 4단계 (분류 · 종 · 모프 · 기본 정보).
 * onboarding이면 가입 직후 안내(A04 A안): 인사 문구와 '나중에 할게요'.
 */
export function RegisterPetFlow({ onboarding }: { onboarding: boolean }) {
  const queryClient = useQueryClient();
  const { data: me } = useQuery(meQueries.detail());
  const { data: speciesList, isPending: speciesPending } = useQuery(speciesQueries.list());
  const [step, setStep] = useState(1);
  // Figma(A04 A안·P02 1/4) 모두 도마뱀이 골라진 채로 시작한다
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, group: "lizard" });
  const [exitOpen, setExitOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  // 같은 화면에서 다시 눌러도 한 마리만 등록되도록 요청 ID를 한 번만 만든다
  const [clientRequestId] = useState(newRequestId);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const species = speciesList?.find((s) => s.id === draft.speciesId);
  const { data: morphs } = useQuery(speciesQueries.morphs(species?.serverId));
  const dirty = JSON.stringify(draft) !== JSON.stringify({ ...EMPTY, group: draft.group });
  const exit = () => router.replace(onboarding ? "/home" : "/pets");

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
      // 일정 쪽이 이 개체를 모르면(개체·일정이 한쪽만 진짜) 체크 리스트 대신 상세로 간다
      if (isRoutineDetached) {
        router.replace({ pathname: "/pets/[petId]", params: { petId: pet.id } });
      } else {
        router.replace({
          pathname: "/pets/[petId]/routines",
          params: { petId: pet.id, from: "register" },
        });
      }
    },
    onError: (error) => {
      const fields = getFieldErrors(error);
      if (fields.name) setNameError(fields.name);
      toast(getErrorMessage(error, "등록하지 못했어요."));
    },
  });

  const canNext =
    (step === 1 && draft.group === "lizard") ||
    (step === 2 && Boolean(draft.speciesId)) ||
    step === 3;
  const canSubmit =
    draft.name.trim().length > 0 &&
    (draft.hatchUnknown || Boolean(draft.hatchedOn)) &&
    Boolean(draft.lifeStageCode) &&
    Boolean(species) &&
    !uploading &&
    !create.isPending;

  const goBack = () => {
    if (step > 1) setStep(step - 1);
    else if (dirty) setExitOpen(true);
    else exit();
  };

  return (
    <Screen>
      <TopBar
        title="개체 등록"
        leading={step === 1 && onboarding ? "none" : "back"}
        onLeading={goBack}
        trailing={
          <>
            {step === 3 ? (
              <TopBarAction
                onPress={() => {
                  patch({ morph: null });
                  setStep(4);
                }}
              >
                건너뛰기
              </TopBarAction>
            ) : null}
            <IconButton
              accessibilityLabel="닫기"
              size={40}
              onPress={() => (dirty ? setExitOpen(true) : exit())}
            >
              <XIcon />
            </IconButton>
          </>
        }
      />
      <ScreenBody gap={20}>
        <StepProgress
          step={step}
          total={4}
          label={step === 1 && onboarding ? "분류 고르기" : STEPS[step - 1]!}
        />

        {step === 1 ? (
          <>
            <Text variant="title-xs" style={styles.snug}>
              {onboarding
                ? `${me?.nickname ? `${me.nickname}님, ` : ""}반가워요\n어떤 친구를 키우나요?`
                : "어떤 친구인가요?"}
            </Text>
            <View style={styles.cards}>
              <ChoiceCard
                selected={draft.group === "lizard"}
                title={SPECIES_GROUP_LABEL.lizard}
                onPress={() => patch({ group: "lizard" })}
              />
              {/* 뱀(볼파이톤)은 MVP 범위 밖이라 고를 수 없다 (CLAUDE.md). 글은 Figma 그대로 */}
              <ChoiceCard
                disabled
                title={SPECIES_GROUP_LABEL.snake}
                description={onboarding ? undefined : "볼파이톤"}
              />
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text variant="title-xs">어떤 종인가요?</Text>
            {speciesPending ? (
              <Skeleton height={160} />
            ) : (
              <View style={styles.cards}>
                {(speciesList ?? [])
                  .filter((s) => s.group === "lizard")
                  .map((s) => (
                    <ChoiceCard
                      key={s.id}
                      selected={draft.speciesId === s.id}
                      title={s.commonName}
                      onPress={() =>
                        patch({
                          speciesId: s.id,
                          morph: draft.speciesId === s.id ? draft.morph : null,
                          lifeStageCode: null,
                        })
                      }
                    />
                  ))}
              </View>
            )}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <View>
              <Text variant="title-xs">모프를 골라 주세요</Text>
              <Text variant="body-lg" color={semantic.mutedForeground} style={{ marginTop: 6 }}>
                {species?.commonName} · 모르면 오른쪽 위 ‘건너뛰기’
              </Text>
            </View>
            <MorphPicker
              species={species}
              value={draft.morph}
              onChange={(morph) => patch({ morph })}
            />
          </>
        ) : null}

        {step === 4 ? (
          <View style={{ gap: 20 }}>
            {/* 개체·사진이 한쪽만 진짜 백엔드면 서로 파일 ID를 몰라서 사진 칸을 숨긴다 */}
            {!isPetPhotoDisabled ? (
              <PetPhotoPicker
                value={draft.photo}
                onChange={(photo) => patch({ photo })}
                onBusyChange={setUploading}
              />
            ) : null}
            <Field label="이름" error={nameError}>
              <Input
                maxLength={20}
                placeholder="이름을 입력해 주세요"
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
            <View
              style={[
                styles.details,
                { borderColor: detailsOpen ? semantic.primary : semantic.input },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: detailsOpen }}
                onPress={() => setDetailsOpen((v) => !v)}
                style={styles.detailsHeader}
              >
                <View>
                  <Text variant="body-lg">더 자세한 정보 (선택)</Text>
                  {!detailsOpen ? (
                    <Text variant="body-md" color={semantic.mutedForeground}>
                      성별 · 데려온 날
                    </Text>
                  ) : null}
                </View>
                {detailsOpen ? (
                  <ChevronUpIcon size={16} color={semantic.primary} />
                ) : (
                  <ChevronDownIcon size={16} color={semantic.mutedForeground} />
                )}
              </Pressable>
              {detailsOpen ? (
                <View style={styles.detailsBody}>
                  <Field label="성별">
                    <ChipGroup
                      label="성별"
                      size="sm"
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
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScreenBody>

      <ScreenFooter>
        {step < 4 ? (
          <Button size="xl" disabled={!canNext} onPress={() => setStep(step + 1)}>
            다음
          </Button>
        ) : (
          <Button
            size="xl"
            disabled={!canSubmit}
            loading={create.isPending || uploading}
            onPress={() => create.mutate()}
          >
            {isRoutineDetached ? "등록하기" : "등록하고 체크 리스트 보기"}
          </Button>
        )}
        {onboarding && step === 1 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/home")}
            style={styles.later}
          >
            <Text variant="body-lg" color={semantic.secondaryText}>
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

function ChoiceCard({
  title,
  description,
  selected,
  disabled,
  onPress,
}: {
  title: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected
          ? { borderColor: semantic.primary, backgroundColor: alpha(semantic.primarySoft, 0.6) }
          : { borderColor: semantic.input, backgroundColor: semantic.background },
        pressed && !disabled && !selected && { backgroundColor: semantic.muted },
        disabled && { opacity: 0.5 },
      ]}
    >
      <PhotoBox size={60} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.choiceTitle}>
          <Text variant="body-xl" weight="bold">
            {title}
          </Text>
          {selected ? (
            <Text variant="body-xl" weight="bold" color={semantic.primary}>
              ✓
            </Text>
          ) : null}
        </View>
        {description ? (
          <Text variant="body-md" color={semantic.mutedForeground}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  snug: { lineHeight: 28 },
  cards: { gap: 10 },
  details: { borderRadius: radius.lg, borderWidth: 1 },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailsBody: { gap: 16, paddingHorizontal: 14, paddingBottom: 16 },
  later: { alignSelf: "center", paddingVertical: 4 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: radius.xl,
    borderWidth: 1.3,
    padding: 14,
  },
  choiceTitle: { flexDirection: "row", alignItems: "center", gap: 4 },
});
