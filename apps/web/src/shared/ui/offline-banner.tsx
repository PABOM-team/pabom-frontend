"use client";

import { useSyncExternalStore } from "react";
import { ExclamationIcon } from "./icons";

const subscribe = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

/** 연결이 끊기면 위쪽에 붙는 배너 (C5-1). 연결되면 저절로 사라진다 */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="flex h-7.5 shrink-0 items-center justify-between bg-inverse px-gutter text-body-md font-medium text-inverse-foreground"
    >
      <span className="flex items-center gap-1">
        <ExclamationIcon className="size-4" aria-hidden />
        인터넷 연결이 끊겼어요
      </span>
      <span className="text-white/80">연결되면 다시 불러와요</span>
    </div>
  );
}
