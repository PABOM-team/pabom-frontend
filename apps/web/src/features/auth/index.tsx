"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { meQueries } from "@/entities/session";
import { authApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { clearSession, isSignedOut } from "@pabom/core/api/session";
import type { AuthProvider } from "@pabom/core/domain/user";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { toast } from "@/shared/ui/toast";
import { PawLoader } from "./paw-loader";

export { PawLoader } from "./paw-loader";
export { FootprintWalk, WelcomeHero } from "./welcome-hero";

/** 로그인 뒤 돌아갈 곳. 같은 사이트 경로만 허용한다 */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

const LOGIN_NEXT_KEY = "pabom-login-next";

/** 카카오·구글에 다녀오는 동안 로그인 뒤 돌아갈 곳을 기억해 둔다 */
function rememberLoginNext(next: string | null | undefined) {
  try {
    if (next) sessionStorage.setItem(LOGIN_NEXT_KEY, next);
    else sessionStorage.removeItem(LOGIN_NEXT_KEY);
  } catch {
    // 저장소를 못 쓰면 로그인 뒤 홈으로 간다
  }
}

/** 기억해 둔 돌아갈 곳을 꺼내고 지운다 */
export function takeLoginNext() {
  try {
    const next = sessionStorage.getItem(LOGIN_NEXT_KEY);
    sessionStorage.removeItem(LOGIN_NEXT_KEY);
    return safeNext(next);
  } catch {
    return null;
  }
}

/** 카카오톡·인스타그램 등 앱 안 브라우저. 구글은 여기서 로그인을 막는다 (RK-03) */
const IN_APP_BROWSER = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\//i;

/** 앱 안 브라우저에서 같은 주소를 기기 기본 브라우저로 연다. 못 열면 false */
function openInExternalBrowser() {
  const url = window.location.href;
  if (/KAKAOTALK/i.test(navigator.userAgent)) {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    return true;
  }
  if (/Android/i.test(navigator.userAgent)) {
    window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    return true;
  }
  return false;
}

/**
 * 카카오·구글 로그인 버튼 (각 서비스 가이드 모양, Figma A01 하단 고정 영역).
 * 백엔드에서 로그인 주소를 받아(state 쿠키도 함께) 카카오·구글 화면으로 보낸다.
 * 앱 안 브라우저에서 구글을 누르면 다른 브라우저로 열라는 확인 창 (C4-1).
 * onBusyChange 로 로그인 중인지 알려 주면 첫 화면이 '로그인하고 있어요'(A02)를 덮어 보여 준다
 */
export function LoginButtons({
  next,
  labels = { kakao: "카카오로 시작하기", google: "Google 계정으로 시작하기" },
  onBusyChange,
}: {
  next?: string | null;
  labels?: Record<AuthProvider, string>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [inAppOpen, setInAppOpen] = useState(false);
  const loginUrl = useMutation({
    mutationFn: authApi.loginUrl,
    onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
    onError: (error) => toast(getErrorMessage(error, "로그인을 시작하지 못했어요.")),
  });
  // 주소를 받은 뒤 화면이 넘어갈 때까지도 다시 누르지 못하게 한다
  const busy = loginUrl.isPending || loginUrl.isSuccess;
  const { reset } = loginUrl;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // 카카오·구글 화면에서 뒤로 오면 페이지가 그대로 복원되니 버튼을 다시 풀어 준다
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [reset]);

  const start = (provider: AuthProvider) => {
    if (provider === "google" && IN_APP_BROWSER.test(navigator.userAgent)) {
      setInAppOpen(true);
      return;
    }
    rememberLoginNext(next);
    loginUrl.mutate(provider);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 카카오(노랑 · 심볼 18) · 구글(흰 바탕 · 회색 테두리 · G 20). 56px · 모서리 12 */}
      <Button
        variant="kakao"
        size="xl"
        className="gap-2 font-medium"
        disabled={busy}
        loading={busy && loginUrl.variables === "kakao"}
        onClick={() => start("kakao")}
      >
        <KakaoSymbol />
        {labels.kakao}
      </Button>
      <Button
        variant="google"
        size="xl"
        className="gap-2.5 text-body-lg font-medium"
        disabled={busy}
        loading={busy && loginUrl.variables === "google"}
        onClick={() => start("google")}
      >
        <GoogleSymbol />
        {labels.google}
      </Button>
      <ConfirmDialog
        open={inAppOpen}
        onOpenChange={setInAppOpen}
        title="다른 브라우저로 열어 주세요"
        description={
          "카카오톡 안에서는 Google 로그인을 쓸 수 없어요.\nSafari나 Chrome에서 열어 주세요."
        }
        confirmLabel="다른 브라우저로 열기"
        onConfirm={async () => {
          setInAppOpen(false);
          if (openInExternalBrowser()) return;
          // iOS 앱 안 브라우저는 열 방법이 없어 주소만 복사해 둔다 (Figma에 따로 안내 화면은 없다)
          await navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
        }}
      />
    </div>
  );
}

function KakaoSymbol() {
  return (
    <svg viewBox="0 0 18 18" className="size-[18px]" aria-hidden>
      <path
        fill="#191919"
        d="M9 1.5C4.58 1.5 1 4.32 1 7.8c0 2.24 1.5 4.2 3.74 5.32l-.95 3.48c-.08.3.26.54.52.37l4.15-2.74c.18.01.36.02.54.02 4.42 0 8-2.82 8-6.3S13.42 1.5 9 1.5Z"
      />
    </svg>
  );
}

function GoogleSymbol() {
  return (
    <svg viewBox="0 0 18 18" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * 로그아웃·탈퇴 뒤 이 기기에 남은 로그인 흔적을 모두 지운다.
 * access·가입 토큰, 로그인 회원 정보, 로그인 뒤 돌아갈 곳, 불러 둔 내 정보·목록.
 * 남겨 두면 같은 소셜 계정으로 다시 가입할 때 약관 동의 대신 이전 화면(설정 등)으로 갈 수 있다
 */
export function useResetSession() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return () => {
    clearSession();
    rememberLoginNext(null);
    // 보던 화면이 내 정보를 다시 불러 첫 화면 주소에 next를 붙이지 않도록 먼저 옮긴다
    router.replace("/welcome");
    queryClient.clear();
  };
}

export function useLogout() {
  const resetSession = useResetSession();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: resetSession,
  });
}

/** 화면을 불러오는 동안 (Figma 파봄 로딩). label 을 주면 아래에 한 줄 안내 */
export function FullScreenLoading({ label, className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn("flex flex-1 flex-col items-center justify-center gap-4 bg-screen", className)}
    >
      <PawLoader label={label} />
      {label ? <p className="text-body-xl font-medium text-muted-foreground">{label}</p> : null}
    </div>
  );
}

/** SCR-A02 로그인 처리 중 */
export function LoginLoading({ className }: { className?: string }) {
  return <FullScreenLoading label="로그인하고 있어요" className={className} />;
}

/**
 * 로그인이 필요한 화면을 감싼다.
 * - 로그인 안 됨 → 첫 화면(보던 주소를 기억)
 * - 약관 동의 전 → 약관 동의 (동의 전에는 다른 화면으로 못 감)
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, isError } = useQuery(meQueries.detail());
  const needsAgreement = me?.status === "PENDING_TERMS" && pathname !== "/agreements";

  useEffect(() => {
    // 로그아웃·탈퇴한 직후에는 보던 화면을 기억하지 않는다 (다시 로그인하면 그 화면으로 가 버린다)
    if (isError)
      router.replace(isSignedOut() ? "/welcome" : `/welcome?next=${encodeURIComponent(pathname)}`);
    else if (needsAgreement) router.replace("/agreements");
  }, [isError, needsAgreement, pathname, router]);

  if (!me || needsAgreement) return <FullScreenLoading />;
  return children;
}
