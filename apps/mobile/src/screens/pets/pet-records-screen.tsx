import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  endOfMonth,
  format,
  max as maxDate,
  min as minDate,
  startOfMonth,
  subMonths,
} from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { petQueries } from "@/entities/pet";
import { recordQueries, RecordRow } from "@/entities/record";
import { feedResultSetOf, speciesQueries } from "@/entities/species";
import { EditRecordSheet } from "@/features/record-editor";
import type { CareRecord } from "@pabom/core/domain/record";
import type { SpeciesId } from "@pabom/core/domain/species";
import { addDays, formatDayLabel, toYmd, ymdOf } from "@pabom/core/lib/date";
import { LoadError, Segmented, Spinner } from "@/shared/ui/display";
import { CheckIcon, DotsVerticalIcon } from "@/shared/ui/icons";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { semantic, spacing } from "@/shared/ui/theme";
import { IconButton, TopBar } from "@/shared/ui/top-bar";

const PERIODS = [1, 2, 6, 12] as const;
type Period = (typeof PERIODS)[number];
/** 달 탭 한 칸의 최소 너비 (웹 min-w-[64px]) */
const MONTH_TAB_WIDTH = 64;

/** SCR-P07 전체 기록. 기본 기간 최근 2개월 [제안], 달별로 나눠 보여 준다 */
export function PetRecordsScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data: detail } = useQuery(petQueries.detail(petId));
  const [period, setPeriod] = useState<Period>(2);
  const [periodOpen, setPeriodOpen] = useState(false);
  const today = new Date();
  const rangeStart = addDays(subMonths(today, period), 1);
  const months = Array.from({ length: period + 1 }, (_, i) =>
    startOfMonth(subMonths(today, period - i)),
  );
  const [monthIndex, setMonthIndex] = useState<number | null>(null);
  const selectedIndex = monthIndex ?? months.length - 1;
  const tablistRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [tablistWidth, setTablistWidth] = useState(0);

  // 기간을 늘려 달 탭이 넘치면 고른 달이 화면 안에 오도록 가로로 스크롤한다
  useEffect(() => {
    if (!tablistWidth) return;
    const x = Math.max(0, (selectedIndex + 1) * MONTH_TAB_WIDTH - tablistWidth);
    tablistRef.current?.scrollTo({ x, animated: false });
  }, [period, selectedIndex, tablistWidth]);
  const month = months[selectedIndex]!;
  const from = toYmd(maxDate([month, rangeStart]));
  const to = toYmd(minDate([endOfMonth(month), today]));
  const monthOptions = months.map((m) => ({ value: m.toISOString(), label: format(m, "M월") }));

  return (
    <Screen>
      <TopBar
        title={detail ? `${detail.pet.name}의 전체 기록` : "전체 기록"}
        fallbackHref={{ pathname: "/pets/[petId]", params: { petId } }}
        trailing={
          <IconButton accessibilityLabel="조회 기간" size={40} onPress={() => setPeriodOpen(true)}>
            <DotsVerticalIcon size={20} />
          </IconButton>
        }
      />
      <View style={styles.tabs}>
        <ScrollView
          ref={tablistRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          onLayout={(e) => setTablistWidth(e.nativeEvent.layout.width)}
        >
          <View style={{ flex: 1 }}>
            <Segmented
              label="달"
              options={monthOptions}
              value={month.toISOString()}
              minItemWidth={MONTH_TAB_WIDTH}
              onChange={(iso) => setMonthIndex(monthOptions.findIndex((o) => o.value === iso))}
            />
          </View>
        </ScrollView>
        <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 8 }}>
          최근 {period}개월 · {format(rangeStart, "M월 d일")} ~ {format(today, "M월 d일")}
        </Text>
      </View>
      <MonthRecords
        key={`${from}-${to}`}
        petId={petId}
        speciesId={detail?.pet.speciesId}
        from={from}
        to={to}
        isOldest={selectedIndex === 0}
        period={period}
        onExtend={() => setPeriodOpen(true)}
      />
      <Sheet
        open={periodOpen}
        onOpenChange={setPeriodOpen}
        title="조회 기간"
        description="고른 기간의 기록을 달별로 보여 줘요."
      >
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            accessibilityRole="button"
            accessibilityState={{ selected: p === period }}
            onPress={() => {
              setPeriod(p);
              setMonthIndex(null);
              setPeriodOpen(false);
            }}
            style={styles.periodRow}
          >
            <Text variant="body-xl">최근 {p}개월</Text>
            {p === period ? <CheckIcon size={16} color={semantic.primary} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  );
}

/** 끝에서 이만큼 안으로 들어오면 다음 쪽을 불러온다 */
const END_THRESHOLD = 200;

function MonthRecords({
  petId,
  speciesId,
  from,
  to,
  isOldest,
  period,
  onExtend,
}: {
  petId: string;
  speciesId: SpeciesId | undefined;
  from: string;
  to: string;
  isOldest: boolean;
  period: number;
  onExtend: () => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<CareRecord | null>(null);
  const query = useInfiniteQuery(recordQueries.infinite({ petId, from, to, limit: 20 }));
  // 급여 기록의 먹은 정도 이름을 종의 먹이 묶음에 맞춘다
  const { data: careStandards } = useQuery({
    ...speciesQueries.careStandards(speciesId ?? "crested_gecko"),
    enabled: speciesId !== undefined,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  // 웹의 IntersectionObserver 대신 스크롤이 끝에 가까워지면 다음 쪽을 불러온다
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const nearEnd =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - END_THRESHOLD;
    if (nearEnd && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };

  if (query.isPending) {
    return (
      <View style={styles.loading}>
        <Spinner />
      </View>
    );
  }
  if (query.isError) return <LoadError onRetry={() => query.refetch()} />;

  const records = query.data.pages.flatMap((p) => p.items);
  const groups = records.reduce<Map<string, CareRecord[]>>((map, record) => {
    const day = ymdOf(record.occurredAt);
    return new Map(map).set(day, [...(map.get(day) ?? []), record]);
  }, new Map());

  return (
    <ScreenBody flush contentStyle={{ paddingTop: 0 }} onScroll={onScroll} scrollEventThrottle={16}>
      {[...groups.entries()].map(([day, items]) => (
        <View key={day}>
          <Text variant="body-lg" color={semantic.secondaryText} style={styles.dayHeader}>
            {formatDayLabel(day)}
          </Text>
          <View style={{ paddingHorizontal: spacing.gutter }}>
            {items.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                variant="list"
                feedResultSet={feedResultSetOf(careStandards, record.careItem)}
                onPress={() => setEditId(record.id)}
                onPhotoPress={() => setViewing(record)}
              />
            ))}
          </View>
        </View>
      ))}
      <View style={styles.sentinel}>
        {isFetchingNextPage ? (
          <Spinner />
        ) : !hasNextPage && isOldest ? (
          <Text variant="body-md" color={semantic.mutedForeground} align="center">
            최근 {period}개월 기록을 모두 봤어요 ·{" "}
            <Text
              variant="body-md"
              weight="medium"
              color={semantic.primary}
              accessibilityRole="button"
              onPress={onExtend}
            >
              기간 늘리기
            </Text>
          </Text>
        ) : null}
      </View>
      <EditRecordSheet
        recordId={editId}
        speciesId={speciesId}
        onOpenChange={(open) => !open && setEditId(null)}
      />
      <PhotoViewer
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewing(null)}
        photos={viewing?.photos ?? []}
        caption={
          viewing ? (
            <Text weight="bold" color="#ffffff">
              {formatDayLabel(ymdOf(viewing.occurredAt))}
            </Text>
          ) : null
        }
      />
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  tabs: { flexShrink: 0, paddingHorizontal: spacing.gutter, paddingBottom: 8 },
  periodRow: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  loading: { flex: 1, alignItems: "center", paddingTop: 40 },
  dayHeader: {
    backgroundColor: semantic.muted,
    paddingHorizontal: spacing.gutter,
    paddingVertical: 6,
  },
  sentinel: { alignItems: "center", paddingVertical: 20 },
});
