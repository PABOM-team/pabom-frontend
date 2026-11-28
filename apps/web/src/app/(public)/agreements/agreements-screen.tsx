"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon } from "@/shared/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { meApi } from "@pabom/core/api/endpoints";
import { getApiError, getErrorMessage } from "@pabom/core/api/errors";
import { queryKeys } from "@pabom/core/api/query-keys";
import { clearSignupSession, getSignupSession, setAccessToken } from "@pabom/core/api/session";
import { AGREEMENTS, type AgreementType } from "@pabom/core/domain/user";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/form";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/ui/toast";

/** 가입 토큰이 없거나 10분이 지나 처음부터 다시 로그인해야 할 때 */
class SignupExpired extends Error {}

/**
 * SCR-A03 첫 로그인 약관 동의. Figma 그대로 머리줄 없이 제목·흰 카드 동의 목록·시작하기만.
 * 로그인 결과로 받은 가입 토큰으로 동의를 보내고, 가입이 끝나면 access 토큰을 받는다
 */
export function AgreementsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<Set<AgreementType>>(new Set());

  // 로그인을 거치지 않고 들어왔으면 첫 화면으로
  useEffect(() => {
    if (!getSignupSession()) router.replace("/welcome");
  }, [router]);

  const allChecked = AGREEMENTS.every((a) => checked.has(a.type));
  const requiredDone = AGREEMENTS.filter((a) => a.required).every((a) => checked.has(a.type));

  const toggle = (type: AgreementType, on: boolean) =>
    setChecked((prev) => {
      const nextSet = new Set(prev);
      if (on) nextSet.add(type);
      else nextSet.delete(type);
      return nextSet;
    });

  const agree = useMutation({
    mutationFn: () => {
      const signup = getSignupSession();
      if (!signup) throw new SignupExpired();
      return meApi.agree([...checked], signup.token);
    },
    onSuccess: ({ accessToken }) => {
      setAccessToken(accessToken);
      clearSignupSession();
      queryClient.removeQueries({ queryKey: queryKeys.me });
      // 가입 직후 개체 등록으로 (A04 A안)
      router.replace("/pets/new?onboarding=1");
    },
    onError: (error) => {
      if (error instanceof SignupExpired || getApiError(error)?.code === "INVALID_TOKEN") {
        clearSignupSession();
        toast("가입 시간이 지났어요. 다시 로그인해 주세요.");
        router.replace("/welcome");
        return;
      }
      toast(getErrorMessage(error));
    },
  });

  return (
    <Screen>
      {/* 저장 중에는 입력을 흐리게 잠근다 (C2-2) */}
      <ScreenBody
        className={cn("px-4 pt-6 *:shrink-0", agree.isPending && "pointer-events-none opacity-50")}
        gap={12}
      >
        <h1 className="text-title-xs whitespace-pre-line text-foreground">
          파봄을 쓰려면
          <br />
          동의가 필요해요
        </h1>
        <div className="overflow-hidden rounded-2xl bg-card py-1">
          <AgreementRow
            label="전체 동의"
            checked={allChecked}
            onToggle={(on) => setChecked(on ? new Set(AGREEMENTS.map((a) => a.type)) : new Set())}
            divider
          />
          {AGREEMENTS.map((agreement, i) => (
            <AgreementRow
              key={agreement.type}
              label={`[${agreement.required ? "필수" : "선택"}] ${agreement.label}`}
              checked={checked.has(agreement.type)}
              onToggle={(on) => toggle(agreement.type, on)}
              divider={i < AGREEMENTS.length - 1}
              href={agreement.href ?? undefined}
            />
          ))}
        </div>
      </ScreenBody>
      <ScreenFooter className="pb-[max(26px,env(safe-area-inset-bottom))]">
        <Button
          size="xl"
          disabled={!requiredDone}
          loading={agree.isPending}
          onClick={() => agree.mutate()}
        >
          시작하기
        </Button>
        {/* 필수 항목을 모두 체크하기 전에는 비활성 (Figma A03 · C2-1) */}
        {!requiredDone ? (
          <p className="text-center text-body-md text-subtle-foreground">
            필수 항목에 모두 동의하면 시작할 수 있어요
          </p>
        ) : null}
      </ScreenFooter>
    </Screen>
  );
}

/** 동의 목록 한 줄 (Figma 줄: 체크박스 22 · 글 · 보기 ›, 구분선은 글 아래부터) */
function AgreementRow({
  label,
  checked,
  onToggle,
  href,
  divider = false,
}: {
  label: string;
  checked: boolean;
  onToggle: (on: boolean) => void;
  href?: string;
  divider?: boolean;
}) {
  const id = useId();
  return (
    <div className="relative flex min-h-12.5 items-center gap-3 px-4 py-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(on) => onToggle(on === true)} />
      <label
        htmlFor={id}
        className="min-w-0 flex-1 cursor-pointer truncate text-body-lg text-foreground"
      >
        {label}
      </label>
      {href ? (
        <Link
          href={href}
          aria-label={`${label} 보기`}
          className="-m-2 flex items-center gap-0.5 p-2 text-body-lg text-muted-foreground"
        >
          보기
          <ChevronRightIcon className="size-5 text-subtle-foreground" />
        </Link>
      ) : null}
      {divider ? (
        <span aria-hidden className="absolute right-0 bottom-0 left-12.5 h-px bg-border" />
      ) : null}
    </div>
  );
}
