import type { RecordKind } from "@pabom/core/domain/care";
import { cn } from "@/shared/lib/utils";
import { CareIcon } from "@/shared/ui/care-icons";

/**
 * 관리 항목 아이콘 칸 (Figma '할 일 아이콘': 회색 둥근 칸 + 그림). 앱 entities/record/care-item-icon.tsx 와 같다.
 * 기본 36칸 · 22 그림, 기록 추가 타일은 56칸 · 34 그림
 */
export function CareItemIcon({
  code,
  recordKind,
  size = 36,
  className,
}: {
  code: string;
  /** 모르는 코드일 때 기록 방식으로 그림을 고른다 */
  recordKind?: RecordKind | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-screen",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
    >
      <CareIcon code={code} recordKind={recordKind} size={Math.round(size * 0.61)} />
    </span>
  );
}
