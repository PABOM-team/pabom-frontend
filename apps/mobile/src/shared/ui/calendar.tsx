import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  setMonth as setMonthOf,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { formatFullDate, fromYmd, toYmd } from "@pabom/core/lib/date";
import { Button } from "./button";
import { FieldButton } from "./form";
import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { Sheet } from "./sheet";
import { Text } from "./text";
import { radius, semantic } from "./theme";
import { IconButton } from "./top-bar";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = Array.from({ length: 12 }, (_, i) => i);

/** 연·월 고르기. 헤더를 누르면 날짜 격자 대신 보인다 */
function YearMonthPicker({
  month,
  min,
  max,
  onPick,
}: {
  month: Date;
  min?: string;
  max?: string;
  onPick: (month: Date) => void;
}) {
  const [year, setYear] = useState(() => startOfYear(month));
  const canPrevYear = !min || toYmd(endOfYear(subYears(year, 1))) >= min;
  const canNextYear = !max || toYmd(startOfYear(addYears(year, 1))) <= max;

  return (
    <View>
      <View style={styles.nav}>
        <IconButton
          accessibilityLabel="이전 해"
          size={40}
          disabled={!canPrevYear}
          onPress={() => setYear((y) => subYears(y, 1))}
          style={!canPrevYear && { opacity: 0.3 }}
        >
          <ChevronLeftIcon size={16} color={semantic.mutedForeground} />
        </IconButton>
        <Text variant="body-xl" weight="bold">
          {format(year, "yyyy년")}
        </Text>
        <IconButton
          accessibilityLabel="다음 해"
          size={40}
          disabled={!canNextYear}
          onPress={() => setYear((y) => addYears(y, 1))}
          style={!canNextYear && { opacity: 0.3 }}
        >
          <ChevronRightIcon size={16} color={semantic.mutedForeground} />
        </IconButton>
      </View>
      <View style={styles.monthGrid}>
        {MONTHS.map((i) => {
          const candidate = setMonthOf(year, i);
          const disabled = Boolean(
            (min && toYmd(endOfMonth(candidate)) < min) ||
            (max && toYmd(startOfMonth(candidate)) > max),
          );
          const selected = isSameMonth(candidate, month);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onPick(startOfMonth(candidate))}
              style={({ pressed }) => [
                styles.monthCell,
                pressed && !disabled && { backgroundColor: semantic.muted },
                selected && { backgroundColor: semantic.primary },
              ]}
            >
              <Text
                variant="body-lg"
                weight={selected ? "bold" : "regular"}
                color={
                  selected
                    ? "#ffffff"
                    : disabled
                      ? semantic.disabledForeground
                      : semantic.foreground
                }
              >
                {i + 1}월
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 달력 한 달 (D3). min/max 밖의 날은 고를 수 없다 */
export function Calendar({
  value,
  onChange,
  min,
  max,
  today = toYmd(new Date()),
}: {
  value: string | null;
  onChange: (ymd: string) => void;
  min?: string;
  max?: string;
  today?: string;
}) {
  const [month, setMonth] = useState(() => startOfMonth(fromYmd(value ?? today)));
  const [picking, setPicking] = useState(false);
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const blanks = getDay(days[0]!);
  const canPrev = !min || toYmd(endOfMonth(subMonths(month, 1))) >= min;
  const canNext = !max || toYmd(startOfMonth(addMonths(month, 1))) <= max;

  return (
    <View>
      <View style={styles.nav}>
        <IconButton
          accessibilityLabel="이전 달"
          size={40}
          disabled={!canPrev || picking}
          onPress={() => setMonth((m) => subMonths(m, 1))}
          style={[!canPrev && { opacity: 0.3 }, picking && { opacity: 0 }]}
        >
          <ChevronLeftIcon size={16} color={semantic.mutedForeground} />
        </IconButton>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="연·월 고르기"
          accessibilityState={{ expanded: picking }}
          onPress={() => setPicking((p) => !p)}
          style={({ pressed }) => [
            styles.monthTitle,
            pressed && { backgroundColor: semantic.muted },
          ]}
        >
          <Text variant="body-xl" weight="bold">
            {format(month, "yyyy년 M월")}
          </Text>
          <View style={picking && { transform: [{ rotate: "180deg" }] }}>
            <ChevronDownIcon size={16} color={semantic.mutedForeground} />
          </View>
        </Pressable>
        <IconButton
          accessibilityLabel="다음 달"
          size={40}
          disabled={!canNext || picking}
          onPress={() => setMonth((m) => addMonths(m, 1))}
          style={[!canNext && { opacity: 0.3 }, picking && { opacity: 0 }]}
        >
          <ChevronRightIcon size={16} color={semantic.mutedForeground} />
        </IconButton>
      </View>
      {picking ? (
        <YearMonthPicker
          month={month}
          min={min}
          max={max}
          onPick={(m) => {
            setMonth(m);
            setPicking(false);
          }}
        />
      ) : (
        <>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d) => (
              <View key={d} style={styles.weekCell}>
                <Text variant="body-md" color={semantic.mutedForeground}>
                  {d}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.dayGrid}>
            {Array.from({ length: blanks }, (_, i) => (
              <View key={`b${i}`} style={styles.dayCell} />
            ))}
            {days.map((day) => {
              const ymd = toYmd(day);
              const disabled = Boolean((min && ymd < min) || (max && ymd > max));
              const selected = value === ymd;
              const isToday = isSameDay(day, fromYmd(today));
              return (
                <View key={ymd} style={styles.dayCell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={formatFullDate(day)}
                    accessibilityState={{ selected, disabled }}
                    disabled={disabled}
                    onPress={() => onChange(ymd)}
                    style={({ pressed }) => [
                      styles.day,
                      pressed && !disabled && { backgroundColor: semantic.muted },
                      isToday && !selected && styles.today,
                      selected && { backgroundColor: semantic.primary },
                    ]}
                  >
                    <Text
                      variant="body-lg"
                      weight={selected || isToday ? "bold" : "regular"}
                      color={
                        selected
                          ? "#ffffff"
                          : disabled
                            ? semantic.disabledForeground
                            : isToday
                              ? semantic.primary
                              : semantic.foreground
                      }
                    >
                      {format(day, "d")}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

/** 달력을 시트로 띄워 날짜 하나를 고른다 */
export function DatePickerSheet({
  open,
  onOpenChange,
  title,
  value,
  onConfirm,
  min,
  max,
  hint,
  previewText,
  confirmLabel = "고르기",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string | null;
  onConfirm: (ymd: string) => void;
  min?: string;
  max?: string;
  hint?: string;
  previewText?: (ymd: string) => string;
  confirmLabel?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setDraft(value);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <Button
          size="xl"
          style={{ flex: 1 }}
          disabled={!draft}
          onPress={() => {
            if (!draft) return;
            onConfirm(draft);
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      }
    >
      {open ? (
        <Calendar key={value ?? "none"} value={draft} onChange={setDraft} min={min} max={max} />
      ) : null}
      {hint ? (
        <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 12 }}>
          {hint}
        </Text>
      ) : null}
      {draft && previewText ? (
        <Text variant="body-lg" weight="medium" color={semantic.primary} style={{ marginTop: 8 }}>
          {previewText(draft)}
        </Text>
      ) : null}
    </Sheet>
  );
}

/** 날짜 칸. 누르면 달력 시트 */
export function DateField({
  value,
  onChange,
  title,
  placeholder = "날짜를 골라 주세요",
  min,
  max,
  hint,
  disabled,
  invalid,
  format: formatValue = formatFullDate,
}: {
  value: string | null;
  onChange: (ymd: string) => void;
  title: string;
  placeholder?: string;
  min?: string;
  max?: string;
  hint?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** 칸에 보이는 날짜 모양. 기본은 '2026년 3월 2일' */
  format?: (ymd: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldButton
        disabled={disabled}
        invalid={invalid}
        placeholder={placeholder}
        icon={<CalendarIcon />}
        onPress={() => setOpen(true)}
      >
        {value ? formatValue(value) : null}
      </FieldButton>
      <DatePickerSheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        value={value}
        onConfirm={onChange}
        min={min}
        max={max}
        hint={hint}
      />
    </>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  monthTitle: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.lg,
    paddingHorizontal: 8,
  },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", paddingVertical: 4, gap: 8 },
  monthCell: {
    width: "22%",
    flexGrow: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
  },
  weekRow: { flexDirection: "row" },
  weekCell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 6 },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 4 },
  dayCell: { width: `${100 / 7}%`, alignItems: "center" },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  today: { borderWidth: 1.5, borderColor: semantic.primary },
});
