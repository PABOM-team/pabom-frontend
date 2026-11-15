import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { meApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { clearSession } from "@pabom/core/api/session";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { InfoBox } from "@/shared/ui/display";
import { CheckboxRow } from "@/shared/ui/form";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-S02 회원 탈퇴. 확인 체크 전에는 버튼이 꺼져 있고, 누르면 최종 위험 확인 창(C4) → 첫 화면 + 토스트 */
export function WithdrawScreen() {
  const queryClient = useQueryClient();
  const { data: pets } = useQuery(petQueries.list("active"));
  const [checked, setChecked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const withdraw = useMutation({
    mutationFn: meApi.withdraw,
    onSuccess: () => {
      clearSession();
      queryClient.clear();
      router.replace("/welcome");
      toast("탈퇴했어요. 그동안 고마웠어요.");
    },
    onError: (error) => toast(getErrorMessage(error, "탈퇴하지 못했어요.")),
  });

  return (
    <Screen>
      <TopBar title="회원 탈퇴" fallbackHref="/settings" />
      <ScreenBody>
        <Text variant="title-xs">탈퇴하기 전에 확인해 주세요</Text>
        <Text
          variant="body-lg"
          color={semantic.secondaryText}
          style={{ marginTop: 8, lineHeight: 24 }}
        >
          {/* 와이어프레임의 '카카오·구글 계정 연결도 끊어져요'는 MVP 범위 밖이라 뺀다 (b58eed0) */}
          개체·기록·사진이 모두 삭제되고 되돌릴 수 없어요.
        </Text>
        <InfoBox style={{ marginTop: 12, gap: 2 }}>
          <Text variant="body-md" color={semantic.secondaryText}>
            · 개체 {pets?.length ?? 0}마리와 기록
          </Text>
          <Text variant="body-md" color={semantic.secondaryText}>
            · 사진
          </Text>
        </InfoBox>
        <CheckboxRow
          checked={checked}
          onChange={setChecked}
          textColor={semantic.foreground}
          style={{ marginTop: 24 }}
        >
          위 내용을 확인했어요
        </CheckboxRow>
      </ScreenBody>
      <ScreenFooter>
        <Button
          variant="danger"
          size="xl"
          disabled={!checked || withdraw.isPending}
          onPress={() => setConfirmOpen(true)}
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
