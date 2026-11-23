import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { CareRecord } from "@pabom/core/domain/record";
import type { FeedResultSet } from "@pabom/core/domain/species";
import { describeRecord } from "@pabom/core/entities/record";
import { formatTime } from "@pabom/core/lib/date";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { CareItemIcon } from "./care-item-icon";

// 조회·표시 로직은 웹·앱이 함께 쓰는 @pabom/core 에 있다. 여기는 앱 UI만
export { describeRecord, recordMethodLabel, recordQueries } from "@pabom/core/entities/record";
export { CareItemIcon } from "./care-item-icon";

/** 기록 줄을 담는 흰 묶음 (Figma '묶음': 흰 바탕 · 반경 20 · 위아래 4) */
export function RecordGroup({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.group, style]}>{children}</View>;
}

/**
 * 기록 한 줄 (Figma P04 최근 기록 · P07 전체 기록): 항목 아이콘 · 제목 · 아랫줄 · 오른쪽 시각.
 * - list: 개체 상세·전체 기록. 제목은 '급여 · 먹은 흔적 있음', 아랫줄은 메모 · 사진 N
 * - day: 홈 지난 날짜. 제목 앞에 개체 이름
 * - date 를 주면 아랫줄 맨 앞에 날짜를 붙인다 (개체 상세 '10월 9일')
 * RecordGroup 안에 두고, 두 번째 줄부터 first={false} 로 위 구분선을 그린다
 */
export function RecordRow({
  record,
  variant,
  date,
  first = true,
  feedResultSet = null,
  onPress,
}: {
  record: CareRecord;
  variant: "day" | "list";
  /** 아랫줄 앞에 붙는 날짜 (개체 상세의 '10월 7일') */
  date?: string;
  /** 묶음의 첫 줄이면 위 구분선을 그리지 않는다 */
  first?: boolean;
  /** 급여 기록의 먹이 묶음. 먹은 정도 이름이 묶음에 맞춰 보인다 */
  feedResultSet?: FeedResultSet | null;
  onPress: () => void;
  /** 예전 썸네일 탭. 새 디자인은 줄을 누르면 정정 시트(사진 크게 보기 포함)로 간다 */
  onPhotoPress?: () => void;
}) {
  const summary = describeRecord({ ...record, photos: [] }, feedResultSet);
  const title = variant === "day" ? `${record.petName} · ${summary}` : summary;
  const sub = [
    date ?? null,
    record.memo?.trim() || null,
    record.photos.length ? `사진 ${record.photos.length}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="기록 정정"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {first ? null : <View style={styles.divider} />}
      <CareItemIcon code={record.careItem} />
      <View style={styles.body}>
        <Text variant="body-xl" weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text
            variant="body-md"
            weight="medium"
            color={semantic.mutedForeground}
            numberOfLines={1}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      <Text variant="body-md" weight="medium" color={semantic.subtleForeground}>
        {formatTime(record.occurredAt)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 묶음 위아래 여백은 줄 안에 둔다. 묶음에 두면 맨 위·아래 줄을 누를 때 눌림 색이 가장자리까지 닿지 않는다
  group: {
    overflow: "hidden",
    borderRadius: radius["2xl"],
    backgroundColor: semantic.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pressed: { backgroundColor: semantic.muted },
  divider: {
    position: "absolute",
    top: 0,
    left: 64,
    right: 16,
    height: 1,
    backgroundColor: semantic.border,
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
});
