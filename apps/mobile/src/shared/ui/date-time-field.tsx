import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { formatDateTime, timeOf, toYmd, withTime, ymdOf } from "@pabom/core/lib/date";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { FieldButton } from "./form";
import { CalendarIcon } from "./icons";
import { Sheet } from "./sheet";
import { Text } from "./text";
import { radius, semantic } from "./theme";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type Clock = { pm: boolean; hour: number; minute: number };

const toClock = (hhmm: string): Clock => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return { pm: h >= 12, hour: h % 12 === 0 ? 12 : h % 12, minute: m };
};

const fromClock = ({ pm, hour, minute }: Clock) =>
  `${String((hour % 12) + (pm ? 12 : 0)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

/** 시각 끝 숫자를 읽는 소리에 맞춘 조사: 8:30(삼십)으로, 8:02(이)로 */
const roParticle = (iso: string) => (/[036]$/.test(timeOf(iso)) ? "으로" : "로");

/** 가로로 넘기는 숫자 고르기 한 칸 (오전·오후 / 시 / 분) */
function Wheel<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render = String,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  render?: (value: T) => string;
}) {
  return (
    <View style={styles.wheel} accessibilityLabel={label}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.wheelContent}
      >
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={String(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option)}
              style={[styles.wheelItem, selected && { backgroundColor: semantic.primary }]}
            >
              <Text
                variant="body-xl"
                weight="bold"
                color={selected ? "#ffffff" : semantic.foreground}
              >
                {render(option)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * 기록한 시각 칸 (D3 날짜 + 시각).
 * 지금까지만 고를 수 있고, 버튼에 고른 값을 그대로 보여 준다 (예: 10월 7일 (수) 오후 8:02로 고르기)
 */
export function DateTimeField({
  value,
  onChange,
  title = "기록한 시각",
}: {
  value: string;
  onChange: (iso: string) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(ymdOf(value));
  const [clock, setClock] = useState<Clock>(toClock(timeOf(value)));
  const draft = withTime(day, fromClock(clock));
  const future = new Date(draft) > new Date();

  return (
    <>
      <FieldButton
        icon={<CalendarIcon />}
        onPress={() => {
          setDay(ymdOf(value));
          setClock(toClock(timeOf(value)));
          setOpen(true);
        }}
      >
        {formatDateTime(value)}
      </FieldButton>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        footer={
          <Button
            size="xl"
            style={{ flex: 1 }}
            disabled={future}
            onPress={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            {`${formatDateTime(draft)}${roParticle(draft)} 고르기`}
          </Button>
        }
      >
        {open ? <Calendar value={day} onChange={setDay} max={toYmd(new Date())} /> : null}
        <View style={styles.clock}>
          <Wheel
            label="오전·오후"
            options={["am", "pm"] as const}
            value={clock.pm ? "pm" : "am"}
            onChange={(v) => setClock({ ...clock, pm: v === "pm" })}
            render={(v) => (v === "am" ? "오전" : "오후")}
          />
          <Wheel
            label="시"
            options={HOURS}
            value={clock.hour}
            onChange={(hour) => setClock({ ...clock, hour })}
          />
          <Wheel
            label="분"
            options={MINUTES}
            value={clock.minute}
            onChange={(minute) => setClock({ ...clock, minute })}
            render={(m) => String(m).padStart(2, "0")}
          />
        </View>
        <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 8 }}>
          지금보다 뒤 날짜·시각은 고를 수 없어요
        </Text>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  clock: {
    marginTop: 12,
    gap: 6,
    borderRadius: radius.lg,
    backgroundColor: semantic.muted,
    padding: 10,
  },
  wheel: { height: 40 },
  wheelContent: { gap: 4, alignItems: "center" },
  wheelItem: {
    minWidth: 48,
    height: 40,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: semantic.background,
  },
});
