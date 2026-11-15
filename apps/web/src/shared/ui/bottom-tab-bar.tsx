"use client";

import { PawPrint } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { CalendarIcon, CogIcon } from "./icons";

const TABS = [
  { href: "/home", label: "오늘", icon: CalendarIcon },
  // 발바닥 아이콘은 디자인 시스템 icon 에 없어 lucide 를 쓴다
  { href: "/pets", label: "개체", icon: PawPrint },
  { href: "/settings", label: "설정", icon: CogIcon },
] as const;

/** 하단 탭 3개. 화면 틀 안의 아래에 붙는다 */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="flex h-15">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-body-md",
                  active ? "font-semibold text-primary" : "font-medium text-muted-foreground",
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 2.4 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
