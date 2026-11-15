import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { handoverQueries } from "@/entities/handover";
import { saveQr, type QrHandle } from "@/features/handover";
import { handoverApi } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { queryKeys } from "@pabom/core/api/query-keys";
import { HANDOVER_STATUS_LABEL, type HandoverCard } from "@pabom/core/domain/handover";
import { formatMonthDay, ymdOf } from "@pabom/core/lib/date";
import { copyText } from "@/shared/lib/share";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Avatar, Badge, LoadError, Skeleton, StateMessage } from "@/shared/ui/display";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { colors, radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";

function scopeLine(card: HandoverCard) {
  return [
    "기본 정보",
    "분양일",
    card.scope.routines ? "체크 리스트" : null,
    card.scope.recordWeeks ? `최근 ${card.scope.recordWeeks}주 기록` : null,
    card.scope.photos ? "사진" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** SCR-T04 보낸 인계 카드 관리 (2차). 링크 복사·QR·취소는 사용 전 카드만 */
export function HandoverCardsScreen() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery(handoverQueries.list());
  const [qrCard, setQrCard] = useState<HandoverCard | null>(null);
  const [canceling, setCanceling] = useState<HandoverCard | null>(null);
  const qrRef = useRef<QrHandle | null>(null);

  const cancel = useMutation({
    mutationFn: (card: HandoverCard) => handoverApi.cancel(card.code),
    onSuccess: () => {
      setCanceling(null);
      toast("인계 카드를 취소했어요");
    },
    onError: (error) => toast(getErrorMessage(error, "취소하지 못했어요.")),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.handoverCards }),
  });

  return (
    <Screen>
      <TopBar title="보낸 인계 카드" fallbackHref="/settings" />
      <ScreenBody
        gap={12}
        contentStyle={!isPending && !isError && !data.length ? styles.fill : undefined}
      >
        {isPending ? (
          <Skeleton height={128} />
        ) : isError ? (
          <LoadError onRetry={() => refetch()} />
        ) : !data.length ? (
          <StateMessage
            style={styles.fill}
            title="보낸 인계 카드가 없어요"
            description="개체 상세의 '인계 카드 만들기'로 만든 카드가 여기에 모여요."
          />
        ) : (
          data.map((card) => (
            <View key={card.code} style={styles.card}>
              <View style={styles.head}>
                <Avatar size={28} />
                <Text variant="body-xl" weight="bold">
                  {card.petName}
                </Text>
                <Badge tone={card.status === "unused" ? "primary" : "hint"}>
                  {HANDOVER_STATUS_LABEL[card.status]}
                </Badge>
              </View>
              <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 6 }}>
                만든 날 {formatMonthDay(ymdOf(card.createdAt))} ·{" "}
                {formatMonthDay(ymdOf(card.expiresAt))}까지
              </Text>
              <Text variant="body-md" color={semantic.mutedForeground}>
                {scopeLine(card)}
              </Text>
              {card.status === "unused" ? (
                <View style={styles.actions}>
                  <Button
                    variant="outline"
                    size="md"
                    style={styles.grow}
                    onPress={() => copyText(card.url, "링크를 복사했어요")}
                  >
                    링크 복사
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    style={styles.grow}
                    onPress={() => setQrCard(card)}
                  >
                    QR
                  </Button>
                  {/* 카드 취소 → 위험 확인 창(C4) → 배지가 '취소함'으로 */}
                  <Button
                    variant="outline"
                    size="md"
                    style={styles.grow}
                    onPress={() => setCanceling(card)}
                  >
                    카드 취소
                  </Button>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScreenBody>
      <ConfirmDialog
        open={Boolean(canceling)}
        onOpenChange={(open) => !open && setCanceling(null)}
        title={canceling ? `${canceling.petName} 인계 카드를 취소할까요?` : ""}
        description="받는 분이 이 링크로 더는 등록할 수 없어요. 되돌릴 수 없어요."
        confirmLabel="카드 취소"
        tone="danger"
        pending={cancel.isPending}
        onConfirm={() => canceling && cancel.mutate(canceling)}
      />
      <Sheet
        open={Boolean(qrCard)}
        onOpenChange={(o) => !o && setQrCard(null)}
        title={qrCard ? `${qrCard.petName} 인계 카드 QR` : "QR"}
        footer={
          <Button
            size="xl"
            style={styles.grow}
            onPress={() => qrCard && saveQr(qrRef, `pabom-${qrCard.code}.png`)}
          >
            QR 저장
          </Button>
        }
      >
        <View style={styles.qrBox}>
          {qrCard ? (
            <QRCode
              value={qrCard.url}
              size={180}
              getRef={(c: QrHandle | null) => (qrRef.current = c)}
            />
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "center" },
  card: { padding: 14, borderWidth: 1.3, borderColor: semantic.input, borderRadius: radius.xl },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  grow: { flex: 1 },
  qrBox: {
    alignSelf: "center",
    marginVertical: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: semantic.input,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
});
