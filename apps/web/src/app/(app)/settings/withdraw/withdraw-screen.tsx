"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { meQueries } from "@/entities/session";
import { useResetSession } from "@/features/auth";
import { meApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { getStoredAccount } from "@pabom/core/api/session";
import { AUTH_PROVIDER_LABEL } from "@pabom/core/domain/user";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { CheckboxRow } from "@/shared/ui/form";
import { Group } from "@/shared/ui/group";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";

/** 개체 이름은 두 마리까지 보이고 나머지는 수로 (콩이 · 달이 2마리) */
const petSummary = (names: readonly string[]) =>
  names.length === 0
    ? "없음"
    : `${names.slice(0, 2).join(" · ")}${names.length > 2 ? " 외" : ""} ${names.length}마리`;

/**
 * SCR-S02 회원 탈퇴 (앱 withdraw-screen.tsx 와 같은 모양). 사라지는 것 · 확인 체크.
 * 확인 체크 전에는 버튼이 꺼져 있고, 누르면 최종 위험 확인 창(C4) → 첫 화면 + 토스트.
 * 앱의 '탈퇴 대신 알림만 끄기'는 웹에 알림 설정이 없어 뺀다
 */
export function WithdrawScreen() {
  const resetSession = useResetSession();
  const { data: me } = useQuery(meQueries.detail());
  const { data: pets } = useQuery(petQueries.list());
  const [checked, setChecked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 로그인할 때 저장해 둔 값이라 내 정보가 온 뒤에만 읽는다 (SSR과 어긋나지 않게)
  const provider = me ? getStoredAccount()?.provider : undefined;

  const withdraw = useMutation({
    mutationFn: meApi.withdraw,
    onSuccess: () => {
      // 탈퇴한 계정의 토큰·회원 정보·돌아갈 곳을 모두 지워, 같은 계정으로 다시 가입하면 약관 동의부터
      resetSession();
      toast("탈퇴했어요. 그동안 고마웠어요.");
    },
    onError: (error) => toast(getErrorMessage(error, "탈퇴하지 못했어요.")),
  });

  // 사진 수·보낸 인계 카드는 받을 데이터가 없어 줄을 뺀다
  const lost: readonly { label: string; value: string }[] = [
    { label: "개체", value: petSummary((pets ?? []).map((p) => p.name)) },
    { label: "기록", value: `${(pets ?? []).reduce((sum, p) => sum + p.recordCount, 0)}개` },
    ...(provider ? [{ label: "로그인 연결", value: AUTH_PROVIDER_LABEL[provider] }] : []),
  ];

  return (
    <Screen>
      <TopBar title="회원 탈퇴" fallbackHref="/settings" />
      <ScreenBody flush className="px-4 pt-3 *:shrink-0" gap={12}>
        <h2 className="text-title-sm leading-[34px] whitespace-pre-line text-foreground">
          {me?.nickname ? `${me.nickname}님, 탈퇴하면\n` : "탈퇴하면\n"}이 정보가 모두 사라져요
        </h2>
        <p className="text-body-xl text-muted-foreground">사라진 정보는 되돌릴 수 없어요</p>

        <dl className="mt-1 rounded-xl bg-card px-4 py-2">
          {lost.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-2.5">
              <dt className="text-body-xl text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 flex-1 text-right text-body-xl font-semibold text-foreground">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <Group className="mt-1">
          <CheckboxRow
            checked={checked}
            onChange={setChecked}
            className="min-h-12.5 gap-3 px-4 py-3"
            textClassName="text-foreground"
          >
            위 내용을 확인했어요
          </CheckboxRow>
        </Group>
      </ScreenBody>
      <ScreenFooter className="px-4">
        <Button
          variant="inverse"
          size="xl"
          disabled={!checked || withdraw.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          탈퇴하기
        </Button>
      </ScreenFooter>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="정말 탈퇴할까요?"
        description="개체·기록·사진이 모두 삭제되고 되돌릴 수 없어요."
        confirmLabel="탈퇴하기"
        tone="danger"
        pending={withdraw.isPending}
        onConfirm={() => withdraw.mutate()}
      />
    </Screen>
  );
}
