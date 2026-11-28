"use client";

export type WeightKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";

const ROWS: readonly (readonly WeightKey[])[] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "back"],
];

/** 체중 g 은 소수 한 자리, 다섯 자리(5000g)까지 */
const MAX_INT_DIGITS = 4;

/** 키 하나를 누른 뒤의 값. 잘못된 입력(두 번째 점, 소수 둘째 자리 등)은 무시한다 */
export const pressWeightKey = (value: string, key: WeightKey) => {
  if (key === "back") return value.slice(0, -1);
  if (key === ".") return value.includes(".") ? value : `${value || "0"}.`;
  const [int = "", decimal] = value.split(".");
  if (decimal !== undefined) return decimal.length >= 1 ? value : `${value}${key}`;
  if (int === "0") return key;
  return int.length >= MAX_INT_DIGITS ? value : `${value}${key}`;
};

/** 물리 키보드의 키를 키패드 키로 (데스크톱 웹에서도 숫자를 칠 수 있게) */
export const weightKeyOf = (key: string): WeightKey | null => {
  if (/^[0-9]$/.test(key)) return key as WeightKey;
  if (key === "." || key === ",") return ".";
  if (key === "Backspace") return "back";
  return null;
};

const BackspaceIcon = () => (
  <svg width={26} height={20} viewBox="0 0 26 20" fill="none" aria-hidden>
    <path
      d="M8.5 2h13.5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8.5L2 10l6.5-8Z"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <path d="m12 7 6 6m0-6-6 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

/** 숫자 키패드 (Figma 체중 시트 '숫자 키패드'). 시스템 키보드 대신 시트 안에 붙는다 */
export function WeightKeypad({ onKey }: { onKey: (key: WeightKey) => void }) {
  return (
    <div role="group" aria-label="숫자 키패드" className="w-full pt-2">
      {ROWS.map((row) => (
        <div key={row.join("")} className="flex">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={key === "back" ? "지우기" : key === "." ? "소수점" : key}
              onClick={() => onKey(key)}
              className="flex h-15.5 flex-1 items-center justify-center rounded-lg text-title-sm font-medium text-foreground transition-colors outline-none select-none hover:bg-muted/60 focus-visible:bg-muted active:bg-muted"
            >
              {key === "back" ? <BackspaceIcon /> : key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
