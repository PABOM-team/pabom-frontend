"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { meQueries } from "@/entities/session";
import { useLogout } from "@/features/auth";
import { getStoredAccount } from "@pabom/core/api/session";
import { AUTH_PROVIDER_LABEL } from "@pabom/core/domain/user";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Group, GroupRow, RoundThumb, RowText, SectionLabel } from "@/shared/ui/group";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody } from "@/shared/ui/screen";

const MENU = [
  { href: "/settings/guidelines", label: "관리 가이드라인" },
  { href: "/terms", label: "이용약관" },
  { href: "/terms?tab=privacy", label: "개인정보 처리방침" },
];

/**
 * SCR-S01 설정(계정 메뉴, 앱 settings-screen.tsx 와 같은 모양). 계정 카드 · 정보 메뉴 · 로그아웃(확인 창 C4) · 회원 탈퇴.
 * 웹은 푸시 알림이 없어 앱의 '알림' 묶음은 그리지 않는다
 */
export function SettingsScreen() {
  const { data: me } = useQuery(meQueries.detail());
  const logout = useLogout();
  const [confirmLogout, setConfirmLogout] = useState(false);
  // 내 정보 응답에는 소셜 종류가 없어서 로그인할 때 저장해 둔 값을 쓴다 (me가 온 뒤에만 그려서 SSR과 어긋나지 않는다)
  const provider = me ? getStoredAccount()?.provider : undefined;
  const providerLabel = provider ? AUTH_PROVIDER_LABEL[provider] : null;

  return (
    <Screen>
      <ScreenBody flush className="px-4 pt-[calc(env(safe-area-inset-top)+36px)]">
        <h1 className="mb-3 text-title-sm text-foreground">설정</h1>

        <div className="flex items-center gap-3 rounded-xl bg-card p-4">
          {/* 내 정보 응답에 프로필 사진이 없어 기본 프로필(발자국)을 그린다 */}
          <RoundThumb />
          <RowText
            title={me?.nickname ?? "파봄 회원"}
            description={providerLabel ? `${providerLabel} 계정으로 로그인했어요` : null}
          />
        </div>

        <SectionLabel>정보</SectionLabel>
        <Group>
          {MENU.map((item, index) => (
            <GroupRow key={item.href} href={item.href} divider={index > 0}>
              <span className="min-w-0 flex-1 text-body-lg text-foreground">{item.label}</span>
              <ChevronRightIcon className="size-5 text-subtle-foreground" />
            </GroupRow>
          ))}
        </Group>

        <Group className="mt-3">
          <GroupRow onClick={() => setConfirmLogout(true)} disabled={logout.isPending}>
            <span className="min-w-0 flex-1 text-body-lg text-foreground">로그아웃</span>
            {providerLabel ? (
              <span className="text-body-lg text-muted-foreground">{providerLabel} 계정</span>
            ) : null}
          </GroupRow>
        </Group>

        <div className="mt-1 flex justify-center">
          <Link
            href="/settings/withdraw"
            className="flex min-h-11 items-center px-2 text-body-md font-medium text-subtle-foreground"
          >
            회원 탈퇴
          </Link>
        </div>
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
    </Screen>
  );
}
