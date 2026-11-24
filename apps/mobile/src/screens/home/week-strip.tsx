import { addDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View, type GestureResponderEvent } from "react-native";
import type { Pet } from "@pabom/core/domain/pet";
import { fromYmd, toYmd } from "@pabom/core/lib/date";
import { Avatar, Skeleton } from "@/shared/ui/display";
import { PlusIcon } from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { colors, radius, semantic } from "@/shared/ui/theme";
import { ZoomPressable } from "@/shared/ui/zoom-link";

/** 가로로 이만큼 끌면 주를 넘긴다 (px) */
const SWIPE_THRESHOLD = 48;
/** 화면 좌우 여백 (Figma 본문 px 16). 개체 줄이 화면 끝까지 밀리게 한다 */
export const HOME_GUTTER = 16;

const GRADIENT: [string, string] = [semantic.brandFrom, semantic.brand];

/**
 * 주간 달력 (Figma 주간 캘린더): 흰 카드에 7일, 고른 날은 파랑 그라데이션.
 * 오늘은 파란 점, 기록이 있는 날은 회색 점. 좌우로 밀면 앞·뒤 주로
 */
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
        const dot = isSelected
          ? null
          : isToday
            ? semantic.primary
            : marked.has(ymd)
              ? semantic.input
              : null;
        return (
          <Pressable
            key={ymd}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${format(date, "M월 d일 EEEE", { locale: ko })}${isToday ? ", 오늘" : ""}`}
            onPress={() => onSelect(ymd)}
            style={({ pressed }) => [styles.day, pressed && !isSelected && styles.pressed]}
          >
            {isSelected ? (
              <LinearGradient
                colors={GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, styles.dayFill]}
              />
            ) : null}
            <Text
              variant="body-md"
              weight="medium"
              color={isSelected ? colors.white : semantic.mutedForeground}
            >
              {format(date, "EEEEE", { locale: ko })}
            </Text>
            <Text
              variant="body-xl"
              weight="medium"
              color={isSelected ? colors.white : semantic.foreground}
            >
              {format(date, "d")}
            </Text>
            {dot ? (
              <View accessibilityElementsHidden style={[styles.dot, { backgroundColor: dot }]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** 개체 고르기 줄 (Figma ③): 전체 · 개체 알약 · 추가. 남은 할 일이 있는 개체에 빨간 점 */
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
  // 불러오는 동안은 알약 자리만 (C1-1)
  if (loading) {
    return (
      <View accessibilityLabel="불러오는 중" style={styles.skeletonRow}>
        {[56, 84, 84].map((width, i) => (
          <Skeleton key={i} height={36} width={width} style={styles.pill} />
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
          style={[styles.pill, styles.allPill, selected === null && styles.pillSelected]}
        >
          <Text
            variant="body-lg"
            weight="semibold"
            color={selected === null ? semantic.inverseForeground : semantic.foreground}
          >
            전체
          </Text>
        </Pressable>
      ) : null}
      {pets.map((pet) => {
        const active = selected === pet.id;
        return (
          <Pressable
            key={pet.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${pet.name}${pet.todayRemaining > 0 ? ", 남은 할 일 있음" : ""}`}
            onPress={() => onSelect(pet.id)}
            style={[styles.pill, styles.petPill, active && styles.pillSelected]}
          >
            <View>
              <Avatar src={pet.photoUrl} size={28} style={styles.avatar} />
              {pet.todayRemaining > 0 ? <View style={styles.remainingDot} /> : null}
            </View>
            <Text
              variant="body-lg"
              weight={active ? "semibold" : "medium"}
              color={active ? semantic.inverseForeground : semantic.foreground}
              numberOfLines={1}
            >
              {pet.name}
            </Text>
          </Pressable>
        );
      })}
      <ZoomPressable
        href="/pets/new"
        accessibilityRole="link"
        accessibilityLabel="개체 추가"
        style={({ pressed }) => [styles.addCircle, pressed && styles.pressed]}
      >
        <PlusIcon size={18} color={semantic.foreground} strokeWidth={1.8} />
      </ZoomPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    borderRadius: radius["2xl"],
    backgroundColor: semantic.card,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  day: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 2,
    overflow: "hidden",
    borderRadius: radius.lg,
    paddingVertical: 8,
  },
  dayFill: { borderRadius: radius.lg },
  pressed: { backgroundColor: semantic.muted },
  dot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: radius.full,
  },
  // 좌우 여백을 밀어 가로 스크롤이 화면 끝까지 닿는다
  rowBleed: { flexGrow: 0, marginHorizontal: -HOME_GUTTER },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: HOME_GUTTER,
  },
  skeletonRow: { flexDirection: "row", gap: 8 },
  pill: { height: 36, borderRadius: radius.full },
  allPill: {
    justifyContent: "center",
    backgroundColor: semantic.card,
    paddingHorizontal: 16,
  },
  petPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: semantic.card,
    paddingLeft: 4,
    paddingRight: 14,
  },
  pillSelected: { backgroundColor: semantic.inverse },
  avatar: { borderWidth: 0, backgroundColor: semantic.primarySoft },
  remainingDot: {
    position: "absolute",
    top: -1,
    left: 21,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: semantic.card,
    backgroundColor: semantic.destructive,
  },
  addCircle: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: semantic.card,
  },
});
