import { Pressable, StyleSheet, View } from "react-native";
import type { CareRecord } from "@pabom/core/domain/record";
import type { FeedResultSet } from "@pabom/core/domain/species";
import { describeRecord, recordMethodLabel } from "@pabom/core/entities/record";
import { formatTime } from "@pabom/core/lib/date";
import { Avatar, PhotoBox } from "@/shared/ui/display";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";

// 조회·표시 로직은 웹·앱이 함께 쓰는 @pabom/core 에 있다. 여기는 앱 UI만
export { describeRecord, recordMethodLabel, recordQueries } from "@pabom/core/entities/record";

/**
 * 기록 한 줄.
 * - day: 홈 지난 날짜 (개체 이름 + '고치기 ›')
 * - list: 전체 기록 (날짜 머리 아래, 사진이 있으면 썸네일·메모) · '›'
 * - list + prefix: 개체 상세 최근 기록 ('10월 5일 · 탈피 · 사진 1', 썸네일·메모 없음)
 */
export function RecordRow({
  record,
  variant,
  prefix,
  feedResultSet = null,
  onPress,
  onPhotoPress,
}: {
  record: CareRecord;
  variant: "day" | "list";
  /** 줄 앞에 붙는 글 (개체 상세의 '10월 7일') */
  prefix?: string;
  /** 급여 기록의 먹이 묶음. 먹은 정도 이름이 묶음에 맞춰 보인다 */
  feedResultSet?: FeedResultSet | null;
  onPress: () => void;
  onPhotoPress?: () => void;
}) {
  const compact = Boolean(prefix);
  const photo = compact ? undefined : record.photos[0];
  // 썸네일이 보이면 '사진 N'은 제목에서 뺀다
  const title =
    variant === "day"
      ? `${record.petName} · ${describeRecord({ ...record, photos: [] }, feedResultSet)}`
      : describeRecord(photo ? { ...record, photos: [] } : record, feedResultSet);
  const meta = [
    recordMethodLabel(record),
    variant === "day" || !prefix ? formatTime(record.occurredAt) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.row}>
      {variant === "day" || photo ? (
        photo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="사진 크게 보기"
            onPress={onPhotoPress}
          >
            <PhotoBox src={photo.url} />
          </Pressable>
        ) : (
          <Avatar size={28} />
        )
      ) : null}
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.main}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="body-xl" weight={variant === "day" ? "bold" : "regular"} numberOfLines={1}>
            {prefix ? `${prefix} · ` : ""}
            {title}
          </Text>
          {record.memo && !compact ? (
            <Text variant="body-lg" color={semantic.secondaryText} numberOfLines={1}>
              {record.memo}
            </Text>
          ) : null}
          {meta ? (
            <Text variant="body-md" color={semantic.mutedForeground}>
              {meta}
            </Text>
          ) : null}
        </View>
        {variant === "day" ? (
          <Text variant="body-lg" color={semantic.secondaryText}>
            고치기
          </Text>
        ) : null}
        <ChevronRightIcon size={16} color={semantic.subtleForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  main: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
});
