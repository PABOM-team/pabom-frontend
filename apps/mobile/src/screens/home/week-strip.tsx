import { addDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import { router } from "expo-router";
import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View, type GestureResponderEvent } from "react-native";
import type { Pet } from "@pabom/core/domain/pet";
import { fromYmd, toYmd } from "@pabom/core/lib/date";
import { Avatar, Skeleton } from "@/shared/ui/display";
import { PlusIcon } from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { colors, radius, semantic, spacing } from "@/shared/ui/theme";

/** 가로로 이만큼 끌면 주를 넘긴다 (px) */
const SWIPE_THRESHOLD = 48;

/** 주간 달력 (Figma 주간 캘린더). 기록·할 일이 있는 날에 점. 좌우로 밀면 앞·뒤 주로 */
export function WeekStrip({
  weekStart,
  selected,
  today,
  marked,
  onSelect,
  onSwipe,
}: {
  weekStart: string;
  selected: string;
  today: string;
  marked: Set<string>;
  onSelect: (ymd: string) => void;
  /** -1: 지난 주, 1: 다음 주 */
  onSwipe?: (direction: -1 | 1) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => toYmd(addDays(fromYmd(weekStart), i)));
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <View
      accessibilityRole="list"
      style={styles.strip}
      onTouchStart={(e: GestureResponderEvent) => {
        const t = e.nativeEvent.touches[0];
        touchStart.current = t ? { x: t.pageX, y: t.pageY } : null;
      }}
      onTouchEnd={(e: GestureResponderEvent) => {
        const start = touchStart.current;
        const t = e.nativeEvent.changedTouches[0];
        touchStart.current = null;
        if (!start || !t || !onSwipe) return;
        const dx = t.pageX - start.x;
        const dy = t.pageY - start.y;
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
        onSwipe(dx < 0 ? 1 : -1);
      }}
    >
      {days.map((ymd) => {
        const isToday = ymd === today;
        const isSelected = ymd === selected;
        const date = fromYmd(ymd);
        const textColor = isToday
          ? colors.white
          : isSelected
            ? semantic.primary
            : semantic.foreground;
        return (
          <View key={ymd} style={styles.dayCell}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={format(date, "M월 d일 EEEE", { locale: ko })}
              onPress={() => onSelect(ymd)}
              style={[
                styles.day,
                isToday && { backgroundColor: semantic.primary },
                isSelected && !isToday && { backgroundColor: semantic.primarySoft },
              ]}
            >
              <Text
                variant="body-sm"
                color={
                  isToday ? colors.white : isSelected ? semantic.primary : semantic.mutedForeground
                }
              >
                {format(date, "EEEEE", { locale: ko })}
              </Text>
              <Text variant="body-xl" weight="medium" color={textColor}>
                {format(date, "d")}
              </Text>
              <View
                accessibilityElementsHidden
                style={[
                  styles.dot,
                  {
                    backgroundColor: marked.has(ymd)
                      ? isToday
                        ? colors.white
                        : semantic.subtleForeground
                      : "transparent",
                  },
                ]}
              />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

/** 개체 고르기 줄 (전체 · 개체들 · 추가). 남은 할 일이 있는 개체에 빨간 점 */
export function PetFilterRow({
  pets,
  selected,
  onSelect,
  loading,
}: {
  pets: Pet[];
  selected: string | null;
  onSelect: (petId: string | null) => void;
  loading?: boolean;
}) {
  const label = (active: boolean, text: string) => (
    <Text
      variant="body-md"
      weight={active ? "bold" : "regular"}
      color={active ? semantic.primary : semantic.mutedForeground}
      numberOfLines={1}
      style={styles.itemLabel}
    >
      {text}
    </Text>
  );

  // 불러오는 동안은 동그라미 자리만 (C1-1)
  if (loading) {
    return (
      <View
        accessibilityLabel="불러오는 중"
        style={[styles.row, styles.rowBleed, styles.rowContent]}
      >
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.item}>
            <Skeleton height={52} width={52} style={styles.circle} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.rowBleed}
      contentContainerStyle={styles.rowContent}
    >
      {pets.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selected === null }}
          onPress={() => onSelect(null)}
          style={styles.item}
        >
          <View style={[styles.allCircle, selected === null && styles.ring]}>
            <Text variant="body-md" color={semantic.secondaryText}>
              전체
            </Text>
          </View>
          {label(selected === null, "전체")}
        </Pressable>
      ) : null}
      {pets.map((pet) => (
        <Pressable
          key={pet.id}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === pet.id }}
          onPress={() => onSelect(pet.id)}
          style={styles.item}
        >
          <View>
            <Avatar src={pet.photoUrl} size={52} ring={selected === pet.id} />
            {pet.todayRemaining > 0 ? (
              <View accessibilityLabel="남은 할 일 있음" style={styles.remainingDot} />
            ) : null}
          </View>
          {label(selected === pet.id, pet.name)}
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push("/pets/new")}
        style={styles.item}
      >
        <View style={styles.addCircle}>
          <PlusIcon size={20} color={semantic.mutedForeground} />
        </View>
        {label(false, "추가")}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row" },
  dayCell: { flex: 1, alignItems: "center" },
  day: {
    width: "100%",
    maxWidth: 51,
    alignItems: "center",
    gap: 2,
    borderRadius: radius.md,
    paddingVertical: 4,
  },
  dot: { width: 5, height: 5, borderRadius: radius.full },
  row: { flexDirection: "row", overflow: "hidden" },
  // 웹의 -mx-4 px-4: 좌우 여백을 밀어 가로 스크롤이 화면 끝까지 닿는다
  rowBleed: { marginHorizontal: -spacing.gutter },
  rowContent: { flexDirection: "row", gap: 12, paddingHorizontal: spacing.gutter },
  item: { width: 56, flexShrink: 0, alignItems: "center", gap: 6 },
  itemLabel: { maxWidth: "100%" },
  circle: { borderRadius: radius.full },
  allCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.muted,
  },
  ring: { borderWidth: 2.5, borderColor: semantic.primary },
  remainingDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.white,
    backgroundColor: semantic.destructive,
  },
  addCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: semantic.input,
  },
});
