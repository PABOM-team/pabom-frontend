"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  CogIcon,
  HomeIcon,
  PawPrintIcon,
  SolidCogIcon,
  SolidHomeIcon,
  SolidPawPrintIcon,
} from "./icons";

const TABS = [
  { href: "/home", label: "홈", icon: HomeIcon, activeIcon: SolidHomeIcon },
  { href: "/pets", label: "개체", icon: PawPrintIcon, activeIcon: SolidPawPrintIcon },
  { href: "/settings", label: "설정", icon: CogIcon, activeIcon: SolidCogIcon },
] as const;

/**
 * 하단 탭 3개 (Figma 탭바 · 앱 features/tab-bar/navigation-bar.tsx 의 Navigation bar 모양).
 * 화면 틀 아래에 붙은 80px 막대(흰 바탕 + 위 구분선). 고른 탭은 아이콘 뒤 64×32 알약(primary-50)이
 * 가운데서 옆으로 펼쳐지고, 아이콘은 채운 파랑 · 라벨은 semibold 가 된다
 */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-t-[0.5px] border-input bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="flex h-20">
        {TABS.map(({ href, label, icon, activeIcon }) => {
          const active = pathname.startsWith(href);
          const Icon = active ? activeIcon : icon;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="group/tab flex h-full flex-col items-center justify-center gap-1 pt-3 pb-4 outline-none"
              >
                <span className="relative flex h-8 w-16 items-center justify-center overflow-hidden rounded-full">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 rounded-full bg-primary-soft transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
                      active ? "scale-x-100 opacity-100" : "scale-x-40 opacity-0",
                    )}
                  />
                  {/* 누르면 물결 대신 16% 파랑을 덮는다 */}
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-primary/16 opacity-0 transition-opacity group-focus-visible/tab:opacity-100 group-active/tab:opacity-100"
                  />
                  <Icon
                    aria-hidden
                    className={cn(
                      "relative size-6",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "text-body-md",
                    active ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
