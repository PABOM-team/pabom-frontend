import { cn } from "@/shared/lib/utils";

const SIZE = { small: 22, large: 30 } as const;

/**
 * 로딩 스피너 (Figma 로딩 스피너 22 · 30). 연한 고리 위로 파란 호가 돈다. 앱 spinner.tsx 와 같다.
 * tone="inverse" 는 그라데이션·검정 버튼 위의 흰 스피너
 */
export function Spinner({
  className,
  label = "불러오는 중",
  size = "small",
  tone = "primary",
}: {
  className?: string;
  label?: string;
  size?: keyof typeof SIZE | number;
  tone?: "primary" | "inverse";
}) {
  const px = typeof size === "number" ? size : SIZE[size];
  const stroke = Math.max(2, Math.round(px * 0.12 * 10) / 10);
  const r = (px - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex shrink-0", className)}
      style={{ width: px, height: px }}
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        fill="none"
        aria-hidden
        className="animate-spin [animation-duration:800ms]"
      >
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          strokeWidth={stroke}
          className={tone === "inverse" ? "stroke-white/30" : "stroke-gray-200"}
        />
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.28} ${circumference}`}
          className={tone === "inverse" ? "stroke-white" : "stroke-primary"}
        />
      </svg>
    </span>
  );
}
