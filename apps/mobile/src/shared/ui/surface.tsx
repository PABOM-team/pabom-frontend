import { createContext, useContext, type ReactNode } from "react";

/**
 * 지금 그리는 곳의 바탕 (Figma 부품의 `바탕=회색 화면 | 흰 화면`).
 * 회색 화면(Screen 기본) 위에서는 칩·안내 상자·접힘 칸이 흰색, 흰 바탕(시트·창·카드) 위에서는 회색이 된다.
 * 바깥에서 정하지 않으면 흰 바탕으로 본다 (회색 부품이 어느 바탕에서도 보이도록)
 */
export type Surface = "gray" | "white";

const SurfaceContext = createContext<Surface>("white");

export const useSurface = () => useContext(SurfaceContext);

export function SurfaceProvider({ value, children }: { value: Surface; children: ReactNode }) {
  return <SurfaceContext value={value}>{children}</SurfaceContext>;
}
