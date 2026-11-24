import { Pressable, StyleSheet, View } from "react-native";
import type { CareRecord } from "@pabom/core/domain/record";
import type { FeedResultSet } from "@pabom/core/domain/species";
import { describeRecord } from "@/entities/record";
import { TaskIcon } from "@/entities/task";
import { formatTime } from "@pabom/core/lib/date";
import { PhotoBox } from "@/shared/ui/display";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";

/**
 * 지난 날짜 기록 한 줄 (Figma SCR-H01 지난 날짜 '묶음'): 할 일 아이콘 · 기록 요약 · 개체·메모 · 시각.
 * 사진이 있으면 시각 앞에 작은 썸네일, 누르면 크게 본다. 줄을 누르면 기록 고치기
 */
export function PastRecordRow({
  record,
  feedResultSet = null,
  divider = false,
  onPress,
  onPhotoPress,
}: {
  record: CareRecord;
  feedResultSet?: FeedResultSet | null;
  divider?: boolean;
  onPress: () => void;
  onPhotoPress?: () => void;
}) {
  const photo = record.photos[0];
  const title = describeRecord(photo ? { ...record, photos: [] } : record, feedResultSet);
  const subline = [record.petName, record.memo].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="기록 고치기"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: semantic.muted }]}
    >
      {divider ? <View style={styles.divider} accessibilityElementsHidden /> : null}
      <TaskIcon careItem={record.careItem} kind={record.recordKind} />
      <View style={styles.main}>
        <Text variant="body-xl" weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="body-md" weight="medium" color={semantic.mutedForeground} numberOfLines={1}>
          {subline}
        </Text>
      </View>
      {photo ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="사진 크게 보기"
          onPress={onPhotoPress}
        >
          <PhotoBox src={photo.url} size={36} style={styles.photo} />
        </Pressable>
      ) : null}
      <Text
        variant="body-lg"
        weight="semibold"
        color={semantic.mutedForeground}
        style={styles.time}
      >
        {formatTime(record.occurredAt)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  divider: {
    position: "absolute",
    top: 0,
    left: 64,
    right: 16,
    height: 1,
    backgroundColor: semantic.border,
  },
  main: { flex: 1, minWidth: 0, gap: 2 },
  photo: { borderRadius: radius.lg },
  time: { alignSelf: "flex-start", flexShrink: 0 },
});
