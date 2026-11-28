"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { meQueries } from "@/entities/session";
import { FootprintWalk, LoginButtons, LoginLoading, safeNext, WelcomeHero } from "@/features/auth";
import { PabomLogo } from "@/shared/ui/pabom-logo";

/**
 * SCR-A01 첫 화면 (앱 welcome.tsx 와 같다). 파란 그라데이션 위 흰 로고 · 소개 문구 · 히어로(3D 게코) · 발자국 걷기,
 * 아래에 카카오·구글 버튼과 약관 안내. 로그인 중에는 A02(로그인하고 있어요)가 덮는다
 */
export function WelcomeScreen() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { data: me } = useQuery({ ...meQueries.detail(), retry: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me) router.replace(me.status === "PENDING_TERMS" ? "/agreements" : (next ?? "/home"));
  }, [me, next, router]);

  return (
    // 히어로 아래 흐림 막(brand 로 끝남)과 이어지도록 60% 에서 brand 에 닿는다
    <div className="relative flex min-h-0 flex-1 flex-col bg-brand bg-linear-to-b from-brand-from to-brand to-60%">
      {/* 키가 작은 화면에서는 로고 위 여백을 줄여 히어로와 버튼이 겹치지 않게 한다 */}
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden px-gutter pt-[calc(env(safe-area-inset-top)+96px)] [@media(max-height:759px)]:pt-[calc(env(safe-area-inset-top)+40px)]">
        <PabomLogo size="lg" className="text-primary-foreground" />
        <p className="mt-5 mb-12 text-center text-body-xl leading-[21px] font-medium whitespace-pre-line text-primary-foreground">
          {"파충류 키우기의 모든 순간!\n올인원 파충류 케어"}
        </p>
        <div className="relative">
          <WelcomeHero />
          {/* 발자국은 히어로 위쪽을 가로지른다 (Figma 프레임 x54 · 히어로 위 33px) */}
          <FootprintWalk className="absolute -top-8.25 left-6" />
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-3 px-4 pt-2.5 pb-[calc(max(env(safe-area-inset-bottom),26px)+8px)]">
        <LoginButtons next={next} onBusyChange={setBusy} />
        <p className="text-center text-body-md font-medium text-primary-foreground">
          계속 진행하면 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
      {/* A02 로그인 처리 중. 버튼을 누르면 0.2s 로 스며든다 (DISSOLVE) */}
      {busy ? (
        <LoginLoading className="absolute inset-0 z-10 animate-in duration-200 fade-in-0" />
      ) : null}
    </div>
  );
}
