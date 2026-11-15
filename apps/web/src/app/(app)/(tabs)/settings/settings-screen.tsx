"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon } from "@/shared/ui/icons";
import Link from "next/link";
import { useState } from "react";
import { meQueries } from "@/entities/session";
import { useLogout } from "@/features/auth";
import { getStoredAccount } from "@pabom/core/api/session";
import { AUTH_PROVIDER_LABEL } from "@pabom/core/domain/user";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

const MENU = [
  { href: "/settings/guidelines", label: "관리 가이드라인" },
  { href: "/terms", label: "이용약관" },
  { href: "/terms?tab=privacy", label: "개인정보 처리방침" },
];

/** SCR-S01 설정(계정 메뉴). Figma 그대로: 메뉴 3개, 로그아웃(확인 창 C4 → 첫 화면), 회원 탈퇴 */
export function SettingsScreen() {
  const { data: me } = useQuery(meQueries.detail());
  const logout = useLogout();
  const [confirmLogout, setConfirmLogout] = useState(false);
  // 내 정보 응답에는 소셜 종류가 없어서 로그인할 때 저장해 둔 값을 쓴다 (me가 온 뒤에만 그려서 SSR과 어긋나지 않는다)
  const provider = me ? getStoredAccount()?.provider : undefined;

  return (
    <>
      <TopBar leading="none" title="설정" />
      <ScreenBody>
        <ul>
          {MENU.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-[50px] items-center justify-between border-b border-border text-body-xl"
              >
                {item.label}
                <ChevronRightIcon className="size-4 text-subtle-foreground" />
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          disabled={logout.isPending}
          className="mt-4 flex h-[50px] w-full items-center justify-between border-b border-border text-body-xl"
        >
          로그아웃
          {provider ? (
            <span className="text-body-lg text-muted-foreground">
              {AUTH_PROVIDER_LABEL[provider]} 계정
            </span>
          ) : null}
        </button>
        <Link
          href="/settings/withdraw"
          className="mt-1 inline-flex min-h-11 items-center text-body-md text-muted-foreground"
        >
          회원 탈퇴
        </Link>
      </ScreenBody>
      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="로그아웃할까요?"
        description="다시 로그인하면 기록은 그대로 있어요."
        confirmLabel="로그아웃"
        tone="inverse"
        pending={logout.isPending}
        onConfirm={() => logout.mutate(undefined, { onSettled: () => setConfirmLogout(false) })}
      />
    </>
  );
}
