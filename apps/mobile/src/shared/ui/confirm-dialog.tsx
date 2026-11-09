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
  /** danger: 빨강(삭제), inverse: 검정(나가기) */
  tone?: "default" | "danger" | "inverse";
  pending?: boolean;
  onConfirm: () => void;
};

/** 가운데 뜨는 확인 창 (C4). 위험한 행동은 빨간 버튼 */
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
}: ConfirmDialogProps) {
  return (
    <AnimatedModal open={open} onRequestClose={() => onOpenChange(false)} dismissOnOverlay={false}>
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
            <Text variant="title-xs" accessibilityRole="header">
              {title}
            </Text>
            {description ? (
              <Text variant="body-lg" color={semantic.secondaryText} style={styles.description}>
                {description}
              </Text>
            ) : null}
            <View style={styles.actions}>
              {cancelLabel ? (
                <Button
                  variant="outline"
                  size="lg"
                  style={{ flex: 1 }}
                  onPress={() => onOpenChange(false)}
                >
                  {cancelLabel}
                </Button>
              ) : null}
              <Button
                variant={tone === "danger" ? "danger" : tone === "inverse" ? "inverse" : "default"}
                size="lg"
                style={{ flex: 1 }}
                disabled={pending}
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
    maxWidth: 336,
    borderRadius: radius["2xl"],
    backgroundColor: semantic.background,
    padding: 20,
    ...toNativeShadow(shadows.lg),
  },
  description: { marginTop: 8, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 8, marginTop: 20 },
});
