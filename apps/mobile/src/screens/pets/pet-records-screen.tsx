import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  min as minDate,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { petQueries } from "@/entities/pet";
import { recordQueries, RecordGroup, RecordRow } from "@/entities/record";
import { feedResultSetOf, speciesQueries } from "@/entities/species";
import { EditRecordSheet } from "@/features/record-editor";
import { careItemLabel, compareCareItems, MEMO_CODE } from "@pabom/core/domain/care";
import type { CareRecord } from "@pabom/core/domain/record";
import type { SpeciesId } from "@pabom/core/domain/species";
import { fromYmd, toYmd, ymdOf } from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { LoadError, Spinner, StateMessage } from "@/shared/ui/display";
import { ChevronDownIcon } from "@/shared/ui/icons";
import { Screen } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";

/** Figma 본문 좌우 여백 */
const GUTTER = 16;
/** 기록 조회 한 번의 최대 기간 (API-50: 366일) */
const RANGE_DAYS = 365;
/** 끝에서 이만큼 안으로 들어오면 다음 쪽을 불러온다 */
const END_THRESHOLD = 200;
/** 칩·달을 바꿀 때 목록 바꿈 (Figma SMART_ANIMATE 0.25 ease-out) */
const SWAP_MS = 250;

const monthKey = (date: Date) => format(date, "yyyy-MM");
const monthLabel = (date: Date) => format(date, "M월");
const dayHeading = (ymd: string) => format(fromYmd(ymd), "M월 d일 EEEE", { locale: ko });

/** SCR-P07 전체 기록. 종류 칩으로 좁히고, 달별로 끊김 없이 이어 보며, 'N월 ▾'로 달을 바로 고른다 */
export function PetRecordsScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data: detail } = useQuery(petQueries.detail(petId));
  const [today] = useState(() => new Date());
  const [careItem, setCareItem] = useState<string | null>(null);
  /** 목록 맨 위 달. null 이면 이번 달(오늘)부터 */
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));
  const [monthOpen, setMonthOpen] = useState(false);

  const pet = detail?.pet;
  const chips = [
    ...new Map(
      [...(detail?.routines ?? [])]
        .sort(compareCareItems)
        .map((r) => [r.careItem, careItemLabel(r.careItem, r.careItemName)] as const),
    ),
    [MEMO_CODE, careItemLabel(MEMO_CODE)] as const,
  ];
  const firstMonth = startOfMonth(
    pet?.firstRecordOn ? fromYmd(pet.firstRecordOn) : subDays(today, RANGE_DAYS),
  );
  const to = anchor ? minDate([endOfMonth(anchor), today]) : today;
  const listKey = `${careItem ?? "all"}:${toYmd(to)}`;

  const jumpTo = (month: Date) => {
    setAnchor(isSameMonth(month, today) ? null : month);
    setVisibleMonth(startOfMonth(month));
    setMonthOpen(false);
  };

  return (
    <Screen style={styles.screen}>
      <TopBar
        title={pet ? `${pet.name}의 전체 기록` : "전체 기록"}
        fallbackHref={{ pathname: "/pets/[petId]", params: { petId } }}
      />
      <View style={styles.top}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chips}
        >
          {[[null, "전체"] as const, ...chips].map(([code, label]) => {
            const selected = code === careItem;
            return (
              <Pressable
                key={code ?? "all"}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setCareItem(code)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  variant="body-lg"
                  weight="semibold"
                  color={selected ? semantic.inverseForeground : semantic.secondaryText}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${monthLabel(visibleMonth)}, 달 고르기`}
          onPress={() => setMonthOpen(true)}
          style={styles.monthButton}
        >
          <Text variant="title-xs">{monthLabel(visibleMonth)}</Text>
          <ChevronDownIcon size={20} color={semantic.foreground} />
        </Pressable>
      </View>
      <RecordList
        key={listKey}
        petId={petId}
        speciesId={pet?.speciesId}
        careItem={careItem}
        from={toYmd(subDays(to, RANGE_DAYS))}
        to={toYmd(to)}
        onVisibleMonth={setVisibleMonth}
      />
      <MonthSheet
        open={monthOpen}
        onOpenChange={setMonthOpen}
        months={eachMonthOfInterval({ start: firstMonth, end: startOfMonth(today) })}
        current={visibleMonth}
        onPick={jumpTo}
      />
    </Screen>
  );
}

type DayGroup = { day: string; items: CareRecord[] };
type MonthGroup = { month: string; date: Date; days: DayGroup[] };

/** 기록을 달 → 날로 묶는다 (응답은 최근 순) */
const groupByMonth = (records: CareRecord[]): MonthGroup[] =>
  records.reduce<MonthGroup[]>((months, record) => {
    const day = ymdOf(record.occurredAt);
    const date = parseISO(record.occurredAt);
    const key = monthKey(date);
    const last = months[months.length - 1];
    if (!last || last.month !== key) {
      return [
        ...months,
        { month: key, date: startOfMonth(date), days: [{ day, items: [record] }] },
      ];
    }
    const lastDay = last.days[last.days.length - 1]!;
    const days =
      lastDay.day === day
        ? [...last.days.slice(0, -1), { day, items: [...lastDay.items, record] }]
        : [...last.days, { day, items: [record] }];
    return [...months.slice(0, -1), { ...last, days }];
  }, []);

function RecordList({
  petId,
  speciesId,
  careItem,
  from,
  to,
  onVisibleMonth,
}: {
  petId: string;
  speciesId: SpeciesId | undefined;
  careItem: string | null;
  from: string;
  to: string;
  onVisibleMonth: (month: Date) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [appear] = useState(() => new Animated.Value(0));
  /** 달 묶음의 세로 위치. 스크롤하면서 위 'N월 ▾'를 바꾸는 데만 쓴다 (화면 상태 아님) */
  const offsets = useRef<Record<string, { y: number; date: Date }>>({});
  const shownMonth = useRef<string | null>(null);
  const query = useInfiniteQuery(
    recordQueries.infinite({ petId, careItem: careItem ?? undefined, from, to, limit: 30 }),
  );
  // 급여 기록의 먹은 정도 이름을 종의 먹이 묶음에 맞춘다
  const { data: careStandards } = useQuery({
    ...speciesQueries.careStandards(speciesId ?? "crested_gecko"),
    enabled: speciesId !== undefined,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: SWAP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [appear]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const nearEnd =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - END_THRESHOLD;
    if (nearEnd && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    // 달 묶음 머리가 위에 닿으면 위 제목을 그 달로 바꾼다
    const current = Object.entries(offsets.current)
      .filter(([, o]) => o.y <= contentOffset.y + 8)
      .sort(([, a], [, b]) => b.y - a.y)[0];
    if (current && current[0] !== shownMonth.current) {
      shownMonth.current = current[0];
      onVisibleMonth(current[1].date);
    }
  };

  if (query.isPending) {
    return (
      <View style={styles.loading}>
        <Spinner />
      </View>
    );
  }
  if (query.isError) return <LoadError onRetry={() => query.refetch()} />;

  const months = groupByMonth(query.data.pages.flatMap((p) => p.items));

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: appear,
        transform: [
          { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
        ],
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {months.length === 0 ? (
          <StateMessage compact icon={null} title="기록이 없어요" style={{ paddingTop: 80 }} />
        ) : null}
        {months.map((month, index) => (
          <View
            key={month.month}
            style={styles.month}
            onLayout={(e) => {
              offsets.current = {
                ...offsets.current,
                [month.month]: { y: e.nativeEvent.layout.y, date: month.date },
              };
            }}
          >
            {index > 0 ? (
              <Text variant="title-xs" accessibilityRole="header" style={styles.monthHeading}>
                {monthLabel(month.date)}
              </Text>
            ) : null}
            {month.days.map(({ day, items }) => (
              <View key={day} style={styles.day}>
                <Text variant="body-xl" weight="semibold" color={semantic.secondaryText}>
                  {dayHeading(day)}
                </Text>
                <RecordGroup>
                  {items.map((record, i) => (
                    <RecordRow
                      key={record.id}
                      record={record}
                      variant="list"
                      first={i === 0}
                      feedResultSet={feedResultSetOf(careStandards, record.careItem)}
                      onPress={() => setEditId(record.id)}
                    />
                  ))}
                </RecordGroup>
              </View>
            ))}
          </View>
        ))}
        <View style={styles.sentinel}>{isFetchingNextPage ? <Spinner /> : null}</View>
      </ScrollView>
      <EditRecordSheet
        recordId={editId}
        speciesId={speciesId}
        onOpenChange={(open) => !open && setEditId(null)}
      />
    </Animated.View>
  );
}

/** 월 고르기 시트: 해마다 4×3 · 지금 보는 달은 검정 · 기록 없는 달은 흐리게 */
function MonthSheet({
  open,
  onOpenChange,
  months,
  current,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 고를 수 있는 달 (첫 기록 달 ~ 이번 달) */
  months: Date[];
  current: Date;
  onPick: (month: Date) => void;
}) {
  const enabled = new Set(months.map(monthKey));
  const years = [...new Set(months.map((m) => m.getFullYear()))].reverse();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="어느 달로 갈까요?"
      description="기록이 있는 달만 고를 수 있어요"
      footer={
        <Button
          variant="secondary"
          size="xl"
          style={{ flex: 1 }}
          onPress={() => onOpenChange(false)}
        >
          닫기
        </Button>
      }
    >
      {years.map((year) => (
        <View key={year} style={styles.year}>
          <Text variant="body-xl" weight="semibold" color={semantic.secondaryText}>
            {`${year}년`}
          </Text>
          <View style={styles.monthGrid}>
            {Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)).map((month) => {
              const key = monthKey(month);
              const selected = key === monthKey(current);
              const disabled = !enabled.has(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onPick(month)}
                  style={[styles.monthCell, selected && styles.monthCellSelected]}
                >
                  <Text
                    variant="body-xl"
                    weight="semibold"
                    color={
                      selected
                        ? semantic.inverseForeground
                        : disabled
                          ? semantic.disabledForeground
                          : semantic.foreground
                    }
                  >
                    {monthLabel(month)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: semantic.screen },
  top: { flexShrink: 0, gap: 20, paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 10 },
  chipScroll: { marginHorizontal: -GUTTER },
  chips: { gap: 6, paddingHorizontal: GUTTER },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: semantic.card,
  },
  chipSelected: { backgroundColor: semantic.inverse },
  monthButton: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  loading: { flex: 1, alignItems: "center", paddingTop: 40 },
  list: { gap: 20, paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 40 },
  month: { gap: 20 },
  monthHeading: { marginTop: 4 },
  day: { gap: 10 },
  sentinel: { alignItems: "center", paddingVertical: 20 },
  year: { gap: 10, marginBottom: 12 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthCell: {
    width: "23%",
    height: 48,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: semantic.secondary,
  },
  monthCellSelected: { backgroundColor: semantic.inverse },
});
