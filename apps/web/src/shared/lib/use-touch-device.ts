import { useSyncExternalStore } from "react";

const TOUCH_QUERY = "(pointer: coarse)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** 휴대폰·태블릿처럼 손가락으로 쓰는 기기인지. 서버 렌더에서는 아니라고 본다 */
export function useTouchDevice() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false,
  );
}
