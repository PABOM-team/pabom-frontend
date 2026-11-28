import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** 분류 피규어 (Figma 이미지 원본 · 3D 피규어). MVP 는 도마뱀(게코)만 */
export const LIZARD_FIGURE = "/images/species-lizard.png";
export const SNAKE_FIGURE_DISABLED = "/images/species-snake-disabled.png";

/** 칸 이름 (Figma 라벨: body-lg medium · text/secondary) */
export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-body-lg font-medium text-secondary-text">
      {children}
    </label>
  );
}

/** 섹션 이름 (Figma 섹션 라벨: body-md semibold · text/secondary) */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-body-md font-semibold text-secondary-text">{children}</p>;
}

/**
 * 단계를 옮길 때 내용이 옆에서 밀려 들어온다 (Figma PUSH 0.35s ease-in-out, 앱 choice.tsx PushIn).
 * direction 1이면 오른쪽에서(다음), -1이면 왼쪽에서(이전). stepKey 가 바뀌면 다시 그려 애니메이션을 다시 튼다
 */
export function PushIn({
  stepKey,
  direction,
  children,
  className,
}: {
  stepKey: string | number;
  direction: 1 | -1;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      key={stepKey}
      className={cn(
        "animate-in duration-350 ease-in-out fade-in-0 motion-reduce:animate-none",
        direction === 1 ? "slide-in-from-right-[30%]" : "slide-in-from-left-[30%]",
        className,
      )}
    >
      {children}
    </div>
  );
}
