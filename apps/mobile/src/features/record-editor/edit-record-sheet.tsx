import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { petQueries } from "@/entities/pet";
import { recordQueries } from "@/entities/record";
import { useDefaultFoodNameResolver, useFeedResultSet } from "@/entities/species";
import { recordsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import { intakeOptionsFor, type Intake } from "@pabom/core/domain/care";
import { MEMO_MAX, type CareRecord, type Photo } from "@pabom/core/domain/record";
import type { SpeciesId } from "@pabom/core/domain/species";
import { formatDayLabel, ymdOf } from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { DateTimeField } from "@/shared/ui/date-time-field";
import { InfoBox, LoadError, Spinner } from "@/shared/ui/display";
import { Textarea } from "@/shared/ui/form";
import { PhotoInput } from "@/shared/ui/photo-input";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Sheet } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { colors, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import {
  AddExtraLink,
  DetailRow,
  IntakeChoice,
  Keypad,
  pressKey,
  SheetDivider,
  StepView,
  WeightDisplay,
} from "./parts";

type Draft = {
  occurredAt: string;
  intake: Intake | null;
  weight: string;
  memo: string;
  photos: Photo[];
};

const toDraft = (record: CareRecord): Draft => ({
  occurredAt: record.occurredAt,
  intake: record.intake,
  weight: record.weightG ? String(record.weightG) : "",
  memo: record.memo ?? "",
  photos: record.photos,
});

/**
 * 기록 정정 시트 (SCR-R02). 날짜·시각·결과·값·메모를 고치면 이전 값은 정정 내역에 남는다.
 * 삭제해도 토스트의 '되돌리기'로 복구할 수 있다.
 */
export function EditRecordSheet({
  recordId,
  speciesId,
  onOpenChange,
}: {
  recordId: string | null;
  /** 기록 개체의 종. 모르면 키우는 개체 목록에서 찾는다 (급여 칩의 먹이 묶음용) */
  speciesId?: SpeciesId;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const {
    data: record,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...recordQueries.detail(recordId ?? ""),
    enabled: Boolean(recordId),
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);

  if (record && draftFor !== `${record.id}:${record.revisions.length}`) {
    setDraftFor(`${record.id}:${record.revisions.length}`);
    setDraft(toDraft(record));
    setExtraOpen(false);
  }

  const kind = record?.recordKind ?? null;
  const { data: pets } = useQuery({
    ...petQueries.list(),
    enabled: speciesId === undefined && kind === "intake",
  });
  const feedResultSet = useFeedResultSet(
    speciesId ?? pets?.find((p) => p.id === record?.petId)?.speciesId,
    kind === "intake" ? record?.careItem : null,
  );
  const resolveFoodName = useDefaultFoodNameResolver();
  const foodName =
    kind === "intake" && record
      ? resolveFoodName(
          speciesId ?? pets?.find((p) => p.id === record.petId)?.speciesId,
          record.careItem,
        )
      : null;
  const original = record ? toDraft(record) : null;
  const dirty = Boolean(draft && original && JSON.stringify(draft) !== JSON.stringify(original));
  const weightValue = draft?.weight ? Number(draft.weight) : null;
  const weightInvalid = kind === "weight" && (!weightValue || weightValue <= 0);

  const refresh = () => invalidateCareData(queryClient);

  const save = useMutation({
    mutationFn: () =>
      recordsApi.update(record!, {
        occurredAt: draft!.occurredAt,
        intake: kind === "intake" ? draft!.intake : undefined,
        weightG: kind === "weight" ? weightValue : undefined,
        memo: draft!.memo.trim() || null,
        photoFileIds: draft!.photos.map((p) => p.id),
      }),
    onSuccess: () => onOpenChange(false),
    // 실패해도 편집 내용은 그대로 둔다
    onError: (error) => toast(getErrorMessage(error, "정정하지 못했어요.")),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: () => recordsApi.remove(record!.id),
    // 백엔드가 삭제 기록을 잠시 보관(restorableUntil)하므로 토스트의 '되돌리기'로 복구한다 (API-54 restore)
    onSuccess: () => {
      const removedId = record!.id;
      setConfirmDelete(false);
      onOpenChange(false);
      toast("기록을 삭제했어요", {
        action: {
          label: "되돌리기",
          onClick: () =>
            recordsApi
              .restore(removedId)
              .then(() => toast("기록을 되돌렸어요"))
              .catch((error) => toast(getErrorMessage(error, "되돌리지 못했어요.")))
              .finally(refresh),
        },
      });
    },
    onError: (error) => toast(getErrorMessage(error, "삭제하지 못했어요.")),
    onSettled: refresh,
  });

  const extraVisible = extraOpen || kind === "memo" || Boolean(draft?.memo || draft?.photos.length);
  const recordDay = draft ? format(parseISO(draft.occurredAt), "M월 d일") : "";
  const title = !record
    ? "기록"
    : kind === "intake"
      ? `${record.petName}, ${recordDay}에 먹었나요?`
      : kind === "weight"
        ? `${record.petName}, 몸무게는 얼마인가요?`
        : kind === "memo"
          ? `${record.petName}에게 무슨 일이 있었나요?`
          : `${record.petName} · ${record.careItemName} · ${formatDayLabel(ymdOf(record.occurredAt))}`;
  const viewerCaption = record
    ? `${record.petName} · ${record.careItemName} · ${formatDayLabel(ymdOf(record.occurredAt))}`
    : "";

  return (
    <>
      <Sheet
        open={Boolean(recordId)}
        onOpenChange={onOpenChange}
        title={title}
        footer={
          record && draft ? (
            <View style={styles.footer}>
              <Button
                size="xl"
                disabled={!dirty || weightInvalid || uploading || save.isPending}
                loading={save.isPending}
                accessibilityLabel={save.isPending ? "저장 중" : undefined}
                onPress={() => save.mutate()}
              >
                저장
              </Button>
              <Pressable
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => setConfirmDelete(true)}
                style={styles.deleteLink}
              >
                <Text variant="body-lg" color={semantic.subtleForeground}>
                  이 기록 삭제하기
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      >
        {isPending ? (
          <View style={styles.loading}>
            <Spinner />
          </View>
        ) : isError || !record || !draft ? (
          <LoadError onRetry={() => refetch()} />
        ) : (
          <StepView key={record.id}>
            {kind === "intake" && record.type === "done" ? (
              <View style={{ paddingBottom: 16 }}>
                <IntakeChoice
                  options={intakeOptionsFor(feedResultSet)}
                  value={draft.intake}
                  onChange={(intake) => setDraft({ ...draft, intake })}
                />
              </View>
            ) : null}
            {kind === "weight" ? <WeightDisplay value={draft.weight} /> : null}
            {kind === "check" && record.method === "routine" && !draft.photos.length ? (
              <InfoBox style={styles.notice}>
                O/X 기록이라 고칠 값이 없어요. 시각과 메모만 고칠 수 있어요.
              </InfoBox>
            ) : null}
            {kind === "memo" ? (
              <View style={styles.extra}>
                <Textarea
                  accessibilityLabel="메모"
                  placeholder="무슨 일이 있었는지 남겨 주세요"
                  maxLength={MEMO_MAX}
                  value={draft.memo}
                  onChangeText={(memo) => setDraft({ ...draft, memo })}
                />
                <PhotoInput
                  value={draft.photos}
                  max={5}
                  onChange={(photos) => setDraft((d) => (d ? { ...d, photos } : d))}
                  onView={setViewer}
                  onBusyChange={setUploading}
                />
              </View>
            ) : null}
            <SheetDivider />
            <View style={styles.when}>
              <Text variant="body-xl" color={semantic.secondaryText}>
                언제
              </Text>
              <DateTimeField
                value={draft.occurredAt}
                onChange={(occurredAt) => setDraft({ ...draft, occurredAt })}
              />
            </View>
            {foodName ? <DetailRow label="먹이" value={foodName} /> : null}
            {kind === "memo" ? null : extraVisible ? (
              <View style={styles.extra}>
                <Textarea
                  accessibilityLabel="메모 (선택)"
                  placeholder="메모를 남겨 주세요"
                  maxLength={MEMO_MAX}
                  value={draft.memo}
                  onChangeText={(memo) => setDraft({ ...draft, memo })}
                />
                <PhotoInput
                  value={draft.photos}
                  max={5}
                  onChange={(photos) => setDraft((d) => (d ? { ...d, photos } : d))}
                  onView={setViewer}
                  onBusyChange={setUploading}
                />
              </View>
            ) : (
              <AddExtraLink onPress={() => setExtraOpen(true)} />
            )}
            {kind === "weight" ? (
              <Keypad
                onKey={(key) => setDraft({ ...draft, weight: pressKey(draft.weight, key) })}
              />
            ) : null}
          </StepView>
        )}
      </Sheet>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="이 기록을 삭제할까요?"
        description="삭제 직후에는 '되돌리기'로 복구할 수 있어요."
        confirmLabel="삭제"
        tone="danger"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
      <PhotoViewer
        open={viewer !== null}
        onOpenChange={(o) => !o && setViewer(null)}
        photos={draft?.photos ?? []}
        initialIndex={viewer ?? 0}
        caption={
          record ? (
            <>
              <Text variant="body-lg" weight="bold" color={colors.white}>
                {viewerCaption}
              </Text>
              {record.memo ? (
                <Text variant="body-lg" color={colors.white}>
                  {record.memo}
                </Text>
              ) : null}
            </>
          ) : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  footer: { flex: 1, gap: 4 },
  deleteLink: { alignSelf: "center", paddingVertical: 8 },
  loading: { alignItems: "center", paddingVertical: 40 },
  notice: { marginBottom: 16 },
  when: { gap: 8, paddingVertical: 14 },
  extra: { gap: 12, paddingTop: 6, paddingBottom: 18 },
});
