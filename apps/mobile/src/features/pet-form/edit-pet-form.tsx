import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { speciesQueries } from "@/entities/species";
import { petsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage, getFieldErrors } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import {
  morphFields,
  serverFileId,
  SEX_LABEL,
  sexFields,
  sexSchema,
  stageFields,
  type Pet,
  type PetUpdateInput,
  type Sex,
} from "@pabom/core/domain/pet";
import { todayYmd } from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ChipGroup } from "@/shared/ui/chip";
import { Field, FieldButton, Input } from "@/shared/ui/form";
import { ChevronDownIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";
import { HatchFields, MorphPicker, PetPhotoPicker, type PhotoValue } from "./fields";

type Draft = {
  name: string;
  morph: string | null;
  photo: PhotoValue;
  hatchedOn: string | null;
  hatchUnknown: boolean;
  lifeStageCode: string | null;
  stageUncertain: boolean;
  /** '잘 모르겠어요'일 때 단계 제안용 체중(g). 화면 상태로만 쓴다 [백엔드 확인 필요] UpdatePetRequest에 체중 칸 없음 */
  weightG: number | null;
  sex: Sex;
  acquiredOn: string | null;
};

const fromPet = (pet: Pet): Draft => ({
  name: pet.name,
  morph: pet.morph,
  photo: { fileId: null, url: pet.photoUrl },
  hatchedOn: pet.hatchedOn,
  hatchUnknown: !pet.hatchedOn,
  lifeStageCode: pet.lifeStageCode,
  stageUncertain: pet.stageUncertain,
  weightG: null,
  sex: pet.sex,
  acquiredOn: pet.acquiredOn,
});

/**
 * SCR-P05 개체 정보 수정. 회색 바탕 위 칸들, 아래 고정 '저장'은 바뀐 내용이 있을 때만 켜진다.
 * 종은 고칠 수 없어서(틀렸으면 삭제 뒤 다시 등록 [제안]) 보여 주지 않는다.
 */
export function EditPetForm({ pet, onDelete }: { pet: Pet; onDelete: () => void }) {
  const queryClient = useQueryClient();
  const { data: speciesList } = useQuery(speciesQueries.list());
  const species = speciesList?.find((s) => s.id === pet.speciesId);
  const { data: morphs } = useQuery(speciesQueries.morphs(species?.serverId));
  const [draft, setDraft] = useState<Draft>(() => fromPet(pet));
  const [morphOpen, setMorphOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const original = fromPet(pet);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const valid =
    draft.name.trim().length > 0 &&
    (draft.hatchUnknown || Boolean(draft.hatchedOn)) &&
    Boolean(draft.lifeStageCode);
  const back = () => router.replace({ pathname: "/pets/[petId]", params: { petId: pet.id } });

  const save = useMutation({
    mutationFn: () => {
      // 바뀐 칸만 보낸다 (PATCH는 보내지 않은 칸을 그대로 둔다)
      const stageChanged =
        draft.hatchUnknown !== original.hatchUnknown ||
        draft.hatchedOn !== original.hatchedOn ||
        draft.lifeStageCode !== original.lifeStageCode ||
        draft.stageUncertain !== original.stageUncertain;
      const input: PetUpdateInput = {
        ...(draft.name !== original.name ? { name: draft.name.trim() } : {}),
        ...(draft.morph !== original.morph ? morphFields(draft.morph, morphs ?? []) : {}),
        ...(draft.sex !== original.sex ? sexFields(draft.sex) : {}),
        ...(draft.acquiredOn !== original.acquiredOn ? { adoptedAt: draft.acquiredOn } : {}),
        ...(draft.photo.fileId ? { photoFileId: serverFileId(draft.photo.fileId) } : {}),
        // 부화일·단계·정확성은 백엔드가 함께 검증하니 하나라도 바뀌면 같이 보낸다
        ...(stageChanged && species ? stageFields(species, draft) : {}),
      };
      return petsApi.update(pet.id, input);
    },
    onSuccess: async (updated) => {
      await invalidateCareData(queryClient);
      back();
      // 생애 단계가 바뀌었을 때만 C3-3 토스트
      if (updated.lifeStageCode !== pet.lifeStageCode) {
        toast("체크 리스트를 다시 제안했어요", {
          action: {
            label: "확인하기",
            onClick: () =>
              router.push({ pathname: "/pets/[petId]/routines", params: { petId: pet.id } }),
          },
        });
      }
    },
    onError: (error) => {
      const fields = getFieldErrors(error);
      if (fields.name) setNameError(fields.name);
      toast(getErrorMessage(error, "저장하지 못했어요."));
    },
  });

  return (
    <Screen>
      <TopBar
        leading="close"
        title="개체 정보 수정"
        onLeading={() => (dirty ? setExitOpen(true) : back())}
      />
      <ScreenBody gap={24} contentStyle={styles.body}>
        <PetPhotoPicker
          value={draft.photo}
          onChange={(photo) => patch({ photo })}
          onBusyChange={setUploading}
        />
        <Field label="이름" error={nameError}>
          <Input
            maxLength={20}
            value={draft.name}
            invalid={Boolean(nameError)}
            onChangeText={(name) => {
              setNameError(null);
              patch({ name });
            }}
          />
        </Field>
        <Field label="모프">
          <FieldButton
            placeholder="모프를 골라 주세요"
            icon={<ChevronDownIcon size={16} color={semantic.mutedForeground} />}
            onPress={() => setMorphOpen(true)}
          >
            {draft.morph}
          </FieldButton>
        </Field>
        <HatchFields
          species={species}
          hatchedOn={draft.hatchedOn}
          hatchUnknown={draft.hatchUnknown}
          lifeStageCode={draft.lifeStageCode}
          stageUncertain={draft.stageUncertain}
          weightG={draft.weightG}
          variant="edit"
          onChange={patch}
        />
        <Field label="성별">
          <ChipGroup
            label="성별"
            options={sexSchema.options.map((value) => ({ value, label: SEX_LABEL[value] }))}
            value={draft.sex}
            onChange={(sex) => patch({ sex: sex ?? "unknown" })}
          />
        </Field>
        <Field label="데려온 날 (선택)">
          <DateField
            title="데려온 날"
            value={draft.acquiredOn}
            max={todayYmd()}
            onChange={(acquiredOn) => patch({ acquiredOn })}
          />
        </Field>
        {/* Figma P05: 흰 바탕 · 빨간 글자 '개체 삭제' */}
        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
        >
          <Text variant="body-xl" weight="semibold" color={semantic.destructive}>
            개체 삭제
          </Text>
        </Pressable>
      </ScreenBody>
      <ScreenFooter minBottom={26}>
        <Button
          size="xl"
          disabled={!dirty || !valid || uploading}
          loading={save.isPending}
          onPress={() => save.mutate()}
        >
          저장
        </Button>
      </ScreenFooter>

      <Sheet
        open={morphOpen}
        onOpenChange={setMorphOpen}
        title="모프 바꾸기"
        description={species?.commonName}
        footer={
          <Button size="xl" style={{ flex: 1 }} onPress={() => setMorphOpen(false)}>
            고르기
          </Button>
        }
      >
        <MorphPicker species={species} value={draft.morph} onChange={(morph) => patch({ morph })} />
      </Sheet>
      <ConfirmDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title="작성 중인 내용이 있어요"
        description="나가면 입력한 내용이 사라져요."
        cancelLabel="계속 작성"
        confirmLabel="나가기"
        tone="inverse"
        onConfirm={back}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16 },
  delete: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: semantic.card,
  },
  pressed: { opacity: 0.7 },
});
