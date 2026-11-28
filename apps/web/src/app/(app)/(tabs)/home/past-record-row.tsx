"use client";

import type { CareRecord } from "@pabom/core/domain/record";
import type { FeedResultSet } from "@pabom/core/domain/species";
import { formatTime } from "@pabom/core/lib/date";
import { describeRecord } from "@/entities/record";
import { PressableRow, TaskIcon } from "@/entities/task";
import { PhotoBox } from "@/shared/ui/display";

/**
 * 지난 날짜 기록 한 줄 (Figma SCR-H01 지난 날짜 '묶음'): 할 일 아이콘 · 기록 요약 · 개체·메모 · 시각.
 * 사진이 있으면 시각 앞에 작은 썸네일, 누르면 크게 본다. 줄을 누르면 기록 고치기
 */
export function PastRecordRow({
  record,
  feedResultSet = null,
  divider = false,
  onClick,
  onPhotoClick,
}: {
  record: CareRecord;
  feedResultSet?: FeedResultSet | null;
  divider?: boolean;
  onClick: () => void;
  onPhotoClick?: () => void;
}) {
  const photo = record.photos[0];
  const title = describeRecord(photo ? { ...record, photos: [] } : record, feedResultSet);
  const subline = [record.petName, record.memo].filter(Boolean).join(" · ");
  const time = formatTime(record.occurredAt);

  return (
    <PressableRow label={`${title}, ${time}, 기록 고치기`} onClick={onClick} divider={divider}>
      <TaskIcon
        careItem={record.careItem}
        kind={record.recordKind}
        className="pointer-events-none relative"
      />
      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body-xl font-semibold text-foreground">{title}</span>
        <span className="truncate text-body-md font-medium text-muted-foreground">{subline}</span>
      </div>
      {photo ? (
        <button
          type="button"
          aria-label="사진 크게 보기"
          onClick={onPhotoClick}
          className="relative shrink-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <PhotoBox src={photo.url} size={36} />
        </button>
      ) : null}
      <span className="pointer-events-none relative shrink-0 self-start text-body-lg font-semibold text-muted-foreground">
        {time}
      </span>
    </PressableRow>
  );
}
