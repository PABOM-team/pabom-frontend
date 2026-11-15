import { describeRecord, recordMethodLabel } from "@pabom/core/entities/record";
import type { CareRecord } from "@pabom/core/domain/record";
import type { FeedResultSet } from "@pabom/core/domain/species";
import { formatTime } from "@pabom/core/lib/date";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { cn } from "@/shared/lib/utils";
import { Avatar, PhotoBox } from "@/shared/ui/display";

// 조회·표시 로직은 웹·앱이 함께 쓰는 @pabom/core 에 있다. 여기는 웹 UI만
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
  onClick,
  onPhotoClick,
}: {
  record: CareRecord;
  variant: "day" | "list";
  /** 줄 앞에 붙는 글 (개체 상세의 '10월 7일') */
  prefix?: string;
  /** 급여 기록의 먹이 묶음. 먹은 정도 이름이 묶음에 맞춰 보인다 */
  feedResultSet?: FeedResultSet | null;
  onClick: () => void;
  onPhotoClick?: () => void;
}) {
  const compact = Boolean(prefix);
  const photo = compact ? undefined : record.photos[0];
  // 썸네일이 보이면 '사진 N'은 제목에서 뺀다
  const title =
    variant === "day"
      ? `${record.petName} · ${describeRecord({ ...record, photos: [] }, feedResultSet)}`
      : describeRecord(photo ? { ...record, photos: [] } : record, feedResultSet);

  return (
    <div className="flex items-center gap-3 border-b border-border py-2.5">
      {variant === "day" || photo ? (
        photo ? (
          <button
            type="button"
            onClick={onPhotoClick}
            aria-label="사진 크게 보기"
            className="shrink-0"
          >
            <PhotoBox src={photo.url} />
          </button>
        ) : (
          <Avatar size={28} />
        )
      ) : null}
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-body-xl", variant === "day" && "font-bold")}>
            {prefix ? `${prefix} · ` : null}
            {title}
          </span>
          {record.memo && !compact ? (
            <span className="block truncate text-body-lg text-secondary-text">{record.memo}</span>
          ) : null}
          <span className="block text-body-md text-muted-foreground">
            {[
              recordMethodLabel(record),
              variant === "day" || !prefix ? formatTime(record.occurredAt) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        {variant === "day" ? (
          <span className="shrink-0 text-body-lg text-secondary-text">고치기</span>
        ) : null}
        <ChevronRightIcon className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
      </button>
    </div>
  );
}
