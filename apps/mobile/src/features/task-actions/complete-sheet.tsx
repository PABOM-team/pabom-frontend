import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
import { Keyboard, LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { petQueries } from "@/entities/pet";
import { recordQueries } from "@/entities/record";
import { useFeedResultSet } from "@/entities/species";
import { intakeOptionsFor, WEIGHT_CODE, type Intake } from "@pabom/core/domain/care";
import { MEMO_MAX, type CompleteInput } from "@pabom/core/domain/record";
import type { Task } from "@pabom/core/domain/today";
import { nowIso } from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/form";
import { PlusIcon } from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { SheetFrame } from "./sheet-frame";
import { WeightKeypad, pressWeightKey } from "./weight-keypad";

/**
 * 완료 체크 시트 (SCR-H02 기록 시트). 급여는 먹은 결과 카드, 체중은 큰 숫자 + 숫자 키패드.
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
  /** 미리 채운 체중을 아직 건드리지 않았다: 첫 숫자를 누르면 새로 쓴다 */
  const [weightFresh, setWeightFresh] = useState(false);
  const [memo, setMemo] = useState("");
  const [memoOpen, setMemoOpen] = useState(false);
  /** 체중 시트에서 지금 고치는 칸. 메모를 쓰는 동안은 숫자 키패드를 내린다 */
  const [editing, setEditing] = useState<"weight" | "memo">("weight");
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);

  // 새 할 일로 열릴 때마다 입력을 비운다
  if (task && task.routineId !== shown?.routineId) {
    setShown(task);
    setIntake(null);
    setWeight("");
    setWeightFresh(false);
    setMemo("");
    setMemoOpen(false);
    setEditing("weight");
    setPrefilledFor(null);
  }

  const current = task ?? shown;
  const kind = current?.recordKind ?? null;
  // 급여 카드는 그 개체 종의 먹이 묶음(인공 사료·곤충·통먹이)에 맞춘다 (D2)
  const { data: pets } = useQuery({ ...petQueries.list(), enabled: kind === "intake" });
  const feedResultSet = useFeedResultSet(
    pets?.find((p) => p.id === current?.petId)?.speciesId,
    kind === "intake" ? current?.careItem : null,
  );
  const { data: lastWeight } = useQuery({
    ...recordQueries.list({ petId: current?.petId, careItem: WEIGHT_CODE, limit: 1 }),
    enabled: kind === "weight" && Boolean(task),
  });
  const last = lastWeight?.items[0];
  const lastWeightG = last?.weightG;
  if (current && lastWeightG && prefilledFor !== current.routineId && weight === "") {
    setPrefilledFor(current.routineId);
    setWeight(lastWeightG.toFixed(1));
    setWeightFresh(true);
  }
  const weightValue = weight ? Number(weight) : null;
  const weightInvalid = weight !== "" && (!weightValue || weightValue <= 0 || weightValue > 5000);
  const missingValue =
    (kind === "intake" && !intake) || (kind === "weight" && (!weightValue || weightInvalid));

  const options = intakeOptionsFor(feedResultSet);
  const mainOptions = options.filter((o) => o.value !== "unobserved");
  const unobserved = options.find((o) => o.value === "unobserved");

  const title = !current
    ? ""
    : kind === "intake"
      ? `${current.petName}, 오늘 먹었나요?`
      : kind === "weight"
        ? `${current.petName}, 몸무게는 얼마인가요?`
        : `${current.petName} · ${current.title}`;

  const keypadOpen = kind === "weight" && editing === "weight";
  const edit = (next: "weight" | "memo") => {
    if (next === editing) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditing(next);
  };
  // 메모 칸은 바로 키보드를 올린다. 레이아웃 애니메이션을 같이 걸면 키보드 따라 올라가는 시트와 겹쳐 튄다
  const openMemo = () => {
    setMemoOpen(true);
    setEditing("memo");
  };
  const editWeight = () => {
    Keyboard.dismiss();
    edit("weight");
  };

  return (
    <SheetFrame
      open={Boolean(task)}
      onOpenChange={onOpenChange}
      footer={
        <>
          <Button
            size="xl"
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
            기록하기
          </Button>
          {keypadOpen ? (
            <WeightKeypad
              onKey={(key) => {
                setWeight((value) => pressWeightKey(weightFresh ? "" : value, key));
                setWeightFresh(false);
              }}
            />
          ) : null}
        </>
      }
    >
      <Text variant="title-xs" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>

      {kind === "intake" ? (
        <View accessibilityRole="radiogroup" accessibilityLabel="먹은 정도" style={styles.intake}>
          <View style={styles.cards}>
            {mainOptions.map((option) => {
              const selected = intake === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setIntake(selected ? null : option.value)}
                  style={[styles.card, selected && styles.selected]}
                >
                  <Text
                    variant="body-xl"
                    weight="bold"
                    align="center"
                    color={selected ? semantic.primary : semantic.foreground}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {unobserved ? (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: intake === unobserved.value }}
              onPress={() => setIntake(intake === unobserved.value ? null : unobserved.value)}
              style={[styles.secondary, intake === unobserved.value && styles.selected]}
            >
              <Text
                variant="body-lg"
                weight="medium"
                color={intake === unobserved.value ? semantic.primary : semantic.secondaryText}
              >
                {unobserved.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {kind === "weight" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="몸무게"
          accessibilityValue={{ text: weight ? `${weight} g` : "비어 있음" }}
          onPress={editWeight}
          style={styles.value}
        >
          <View style={styles.number}>
            <Text
              variant="title-xl"
              color={
                weightInvalid
                  ? semantic.destructive
                  : weight
                    ? semantic.foreground
                    : semantic.disabledForeground
              }
            >
              {weight || "0.0"}
            </Text>
            {keypadOpen ? <View style={styles.cursor} /> : null}
            <Text variant="title-sm" weight="semibold" color={semantic.mutedForeground}>
              g
            </Text>
          </View>
          {lastWeightG && last ? (
            <Text variant="body-lg" color={semantic.mutedForeground}>
              지난번 {lastWeightG}g ·{" "}
              {formatDistanceToNowStrict(parseISO(last.occurredAt), { locale: ko })} 전
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      <View style={styles.divider} />
      {memoOpen ? (
        <View style={styles.memo} onTouchStart={() => edit("memo")}>
          <Text variant="body-lg" weight="medium" color={semantic.secondaryText}>
            메모
          </Text>
          <Textarea
            accessibilityLabel="메모"
            placeholder="메모를 남겨 주세요"
            maxLength={MEMO_MAX}
            value={memo}
            autoFocus={kind !== "weight" || editing === "memo"}
            onChangeText={setMemo}
          />
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={openMemo} style={styles.memoButton}>
          <PlusIcon size={18} color={semantic.mutedForeground} strokeWidth={1.8} />
          <Text variant="body-lg" weight="medium" color={semantic.mutedForeground}>
            메모 남기기
          </Text>
        </Pressable>
      )}
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  title: { paddingBottom: 20 },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    minWidth: "45%",
    height: 94,
    flexGrow: 1,
    flexBasis: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: semantic.muted,
    paddingHorizontal: 8,
  },
  selected: { borderColor: semantic.primary, backgroundColor: semantic.primarySoft },
  secondary: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: semantic.muted,
  },
  value: { gap: 6, paddingBottom: 18 },
  number: { flexDirection: "row", alignItems: "center", gap: 6 },
  cursor: { width: 2, height: 32, backgroundColor: semantic.primary },
  intake: { paddingBottom: 16 },
  divider: { height: 1, backgroundColor: semantic.border },
  memo: { gap: 8, paddingVertical: 14 },
  memoButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingTop: 6,
    paddingBottom: 12,
  },
});
