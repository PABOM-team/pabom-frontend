import { useEffect, useRef, useState, type ComponentRef } from "react";
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

/** 고른 값 칸 높이 (Figma 시각 고르기: 흰 32px 칸 위아래로 앞뒤 값) */
const ROW = 32;

/**
 * 세로로 굴리는 값 고르기 한 칸 (오전·오후 / 시 / 분).
 * 가운데 흰 칸이 고른 값이고, 위아래 흐린 값을 누르거나 굴려서 바꾼다
 */
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
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  /** 굴리거나 눌러서 바꾼 값이면 이미 그 자리에 있으니 다시 옮기지 않는다 */
  const fromWheel = useRef(false);
  const index = Math.max(0, options.indexOf(value));

  // 바깥에서 값이 바뀌면(시트를 다시 열 때 등) 그 자리로 옮긴다
  useEffect(() => {
    if (fromWheel.current) {
      fromWheel.current = false;
      return;
    }
    ref.current?.scrollTo({ y: index * ROW, animated: false });
  }, [index]);

  const pick = (next: T | undefined) => {
    if (next === undefined || next === value) return;
    fromWheel.current = true;
    onChange(next);
  };

  const settle = (offsetY: number) =>
    pick(options[Math.min(options.length - 1, Math.max(0, Math.round(offsetY / ROW)))]);

  const step = (delta: number) => {
    const next = options[index + delta];
    if (next === undefined) return;
    ref.current?.scrollTo({ y: (index + delta) * ROW, animated: true });
    pick(next);
  };

  return (
    <View
      style={styles.wheel}
      accessible
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: render(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
    >
      <View style={styles.wheelSelected} pointerEvents="none" />
      <ScrollView
        ref={ref}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: index * ROW }}
        contentContainerStyle={styles.wheelContent}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          // 손을 떼며 멈추면 관성 끝 이벤트가 오지 않을 수 있다
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05)
            settle(e.nativeEvent.contentOffset.y);
        }}
      >
        {options.map((option, i) => {
          const selected = option === value;
          return (
            <Pressable
              key={String(option)}
              onPress={() => {
                ref.current?.scrollTo({ y: i * ROW, animated: true });
                pick(option);
              }}
              style={styles.wheelItem}
            >
              <Text
                variant={selected ? "body-xl" : "body-lg"}
                weight={selected ? "semibold" : "regular"}
                color={selected ? semantic.foreground : semantic.subtleForeground}
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
  /** Figma 시각 고르기: gray-100 · 모서리 12 · 세 칸 */
  clock: {
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: semantic.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  wheel: { flex: 1, height: ROW * 3 },
  wheelSelected: {
    position: "absolute",
    top: ROW,
    left: 0,
    right: 0,
    height: ROW,
    borderRadius: radius.md,
    backgroundColor: semantic.card,
  },
  wheelContent: { paddingVertical: ROW },
  wheelItem: { height: ROW, alignItems: "center", justifyContent: "center" },
});
