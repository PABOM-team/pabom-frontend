import { Animated, StyleSheet, View } from "react-native";
import { Button } from "./button";
import { AnimatedModal } from "./sheet";
import { Text } from "./text";
import { radius, semantic, shadows, toNativeShadow } from "./theme";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  /** null 이면 버튼 1개짜리 안내 창 (C4-4) */
  cancelLabel?: string | null;
  /** default: 파란 그라데이션 · danger(삭제)·inverse(나가기): 검정 (Figma 확인 창) */
  tone?: "default" | "danger" | "inverse";
  pending?: boolean;
  onConfirm: () => void;
  /** 닫힘 애니메이션이 끝나 Modal 이 내려간 뒤 불린다. 화면 이동은 여기서 해야 iOS 에서 창이 남지 않는다 */
  onClosed?: () => void;
};

/**
 * 가운데 뜨는 확인 창 (Figma 확인 창, C4). 모서리 20 · 제목 body-xl semibold · 설명 body-lg gray-500.
 * 버튼은 50px: 닫기는 회색 보조, 확인은 파랑(일반·안내) 또는 검정(삭제·나가기)
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "닫기",
  tone = "default",
  pending,
  onConfirm,
  onClosed,
}: ConfirmDialogProps) {
  return (
    <AnimatedModal
      open={open}
      onRequestClose={() => onOpenChange(false)}
      onClosed={onClosed}
      dismissOnOverlay={false}
    >
      {(progress) => (
        <View style={styles.host} pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.dialog,
              {
                opacity: progress,
                transform: [
                  { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                ],
              },
            ]}
          >
            <Text variant="body-xl" weight="semibold" accessibilityRole="header">
              {title}
            </Text>
            {description ? (
              <Text variant="body-lg" color={semantic.mutedForeground}>
                {description}
              </Text>
            ) : null}
            <View style={styles.actions}>
              {cancelLabel ? (
                <Button
                  variant="secondary"
                  size="xl"
                  style={styles.action}
                  onPress={() => onOpenChange(false)}
                >
                  {cancelLabel}
                </Button>
              ) : null}
              <Button
                variant={tone === "danger" ? "danger" : tone === "inverse" ? "inverse" : "default"}
                size="xl"
                style={styles.action}
                loading={pending}
                onPress={onConfirm}
              >
                {confirmLabel}
              </Button>
            </View>
          </Animated.View>
        </View>
      )}
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  dialog: {
    width: "100%",
    maxWidth: 334,
    gap: 10,
    borderRadius: radius["2xl"],
    backgroundColor: semantic.background,
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 16,
    ...toNativeShadow(shadows.lg),
  },
  actions: { flexDirection: "row", gap: 8, paddingTop: 6 },
  action: { flex: 1, height: 50 },
});
