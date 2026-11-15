import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { recordQueries } from "@/entities/record";
import { useFeedResultSet } from "@/entities/species";
import { intakeOptionsFor, WEIGHT_CODE, type Intake } from "@pabom/core/domain/care";
import { MEMO_MAX, type CompleteInput } from "@pabom/core/domain/record";
import type { Task } from "@pabom/core/domain/today";
import { nowIso } from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { ChipGroup } from "@/shared/ui/chip";
import { Input, Textarea } from "@/shared/ui/form";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";

/**
 * 완료 체크 시트 (SCR-H02). 급여는 먹은 결과, 체중은 g.
 * 값을 고르기 전에는 저장할 수 없다 (C2-3). 체중은 지난 기록을 미리 채워 둔다
 */
export function CompleteSheet({
  task,
  onOpenChange,
  onSubmit,
  pending,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Task, input: CompleteInput) => void;
  pending: boolean;
}) {
  const [shown, setShown] = useState<Task | null>(task);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [weight, setWeight] = useState("");
  const [memo, setMemo] = useState("");
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);

  // 새 할 일로 열릴 때마다 입력을 비운다
  if (task && task.routineId !== shown?.routineId) {
    setShown(task);
    setIntake(null);
    setWeight("");
    setMemo("");
    setPrefilledFor(null);
  }

  const current = task ?? shown;
  const kind = current?.recordKind ?? null;
  // 급여 칩은 그 개체 종의 먹이 묶음(인공 사료·곤충·통먹이)에 맞춘다 (D2)
  const { data: pets } = useQuery({ ...petQueries.list("active"), enabled: kind === "intake" });
  const feedResultSet = useFeedResultSet(
    pets?.find((p) => p.id === current?.petId)?.speciesId,
    kind === "intake" ? current?.careItem : null,
  );
  const { data: lastWeight } = useQuery({
    ...recordQueries.list({ petId: current?.petId, careItem: WEIGHT_CODE, limit: 1 }),
    enabled: kind === "weight" && Boolean(task),
  });
  const lastWeightG = lastWeight?.items[0]?.weightG;
  if (current && lastWeightG && prefilledFor !== current.routineId && weight === "") {
    setPrefilledFor(current.routineId);
    setWeight(lastWeightG.toFixed(1));
  }
  const weightValue = weight ? Number(weight) : null;
  const weightInvalid = weight !== "" && (!weightValue || weightValue <= 0 || weightValue > 5000);
  const missingValue =
    (kind === "intake" && !intake) || (kind === "weight" && (!weightValue || weightInvalid));

  return (
    <Sheet
      open={Boolean(task)}
      onOpenChange={onOpenChange}
      title={current ? `${current.petName} · ${current.title}` : ""}
      footer={
        <Button
          size="xl"
          style={{ flex: 1 }}
          disabled={pending || missingValue}
          loading={pending}
          accessibilityLabel={pending ? "저장 중" : undefined}
          onPress={() =>
            current &&
            onSubmit(current, {
              occurredAt: nowIso(),
              intake,
              weightG: weightValue,
              memo: memo.trim() || null,
            })
          }
        >
          저장
        </Button>
      }
    >
      {kind === "intake" ? (
        <>
          <SheetLabel first>얼마나 먹었나요?</SheetLabel>
          <ChipGroup
            label="먹은 정도"
            columns={2}
            allowDeselect
            options={intakeOptionsFor(feedResultSet)}
            value={intake}
            onChange={setIntake}
          />
        </>
      ) : null}
      {kind === "weight" ? (
        <>
          <SheetLabel first>몸무게</SheetLabel>
          <Input
            accessibilityLabel="몸무게"
            inputMode="decimal"
            keyboardType="decimal-pad"
            placeholder="0.0"
            suffix="g"
            value={weight}
            invalid={weightInvalid}
            onChangeText={(text) => setWeight(text.replace(/[^0-9.]/g, ""))}
          />
        </>
      ) : null}
      <SheetLabel>메모 (선택)</SheetLabel>
      <Textarea
        accessibilityLabel="메모 (선택)"
        placeholder="메모를 남겨 주세요"
        maxLength={MEMO_MAX}
        value={memo}
        onChangeText={setMemo}
      />
    </Sheet>
  );
}
