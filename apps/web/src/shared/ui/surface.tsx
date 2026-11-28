"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * 지금 그리는 곳의 바탕 (Figma 부품의 `바탕=회색 화면 | 흰 화면`). 앱 apps/mobile/src/shared/ui/surface.tsx 와 같다.
 * 회색 화면(Screen 기본) 위에서는 칩·안내 상자·접힘 칸이 흰색, 흰 바탕(시트·창·카드) 위에서는 회색이 된다.
 * 바깥에서 정하지 않으면 흰 바탕으로 본다 (회색 부품이 어느 바탕에서도 보이도록)
 */
export type Surface = "gray" | "white";

const SurfaceContext = createContext<Surface>("white");

export const useSurface = () => useContext(SurfaceContext);

export function SurfaceProvider({ value, children }: { value: Surface; children: ReactNode }) {
  return <SurfaceContext value={value}>{children}</SurfaceContext>;
}

/** 그 바탕 위에 올릴 면 색 (회색 화면 → 흰색, 흰 바탕 → gray-100) */
export const raisedClass = (surface: Surface) => (surface === "gray" ? "bg-card" : "bg-secondary");

/** 그 면을 눌렀을 때 (hover·active) */
export const raisedPressedClass = (surface: Surface) =>
  surface === "gray"
    ? "hover:bg-secondary active:bg-secondary"
    : "hover:bg-gray-200 active:bg-gray-200";

/** 카드처럼 면을 하나 올리면 그 안은 반대 바탕이 된다 */
export const flipSurface = (surface: Surface): Surface => (surface === "gray" ? "white" : "gray");
