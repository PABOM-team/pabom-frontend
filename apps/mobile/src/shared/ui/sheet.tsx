import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XIcon } from "./icons";
import { Text } from "./text";
import { radius, semantic, shadows, spacing, toNativeShadow } from "./theme";
import { IconButton } from "./top-bar";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const DURATION = 200;

/**
 * 열림·닫힘 애니메이션을 가진 모달 바탕. 닫을 때는 애니메이션이 끝난 뒤 Modal 을 내린다
 * children 은 진행도(0 닫힘 → 1 열림)를 받아 자기 모양대로 움직인다
 */
export function AnimatedModal({
  open,
  onRequestClose,
  children,
  dismissOnOverlay = true,
}: {
  open: boolean;
  onRequestClose: () => void;
  children: (progress: Animated.Value) => ReactNode;
  dismissOnOverlay?: boolean;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const [mounted, setMounted] = useState(open);
  // 열릴 때는 바로 그리고(렌더 중 갱신), 닫힐 때는 애니메이션이 끝난 뒤 내린다
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      Animated.timing(progress, { toValue: 1, duration: DURATION, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: DURATION, useNativeDriver: true }).start(
      ({ finished }) => finished && setMounted(false),
    );
  }, [open, progress]);

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <Animated.View style={[styles.overlay, { opacity: progress }]}>
        <Pressable
          accessibilityLabel="닫기"
          style={StyleSheet.absoluteFill}
          onPress={dismissOnOverlay ? onRequestClose : undefined}
        />
      </Animated.View>
      {children(progress)}
    </Modal>
  );
}

/** 아래에서 올라오는 시트 (Figma 시트: 손잡이 · 제목 · × · 내용 · 하단 버튼) */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  style,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const close = () => onOpenChange(false);

  return (
    <AnimatedModal open={open} onRequestClose={close}>
      {(progress) => (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
          style={styles.sheetHost}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [
                  {
                    translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }),
                  },
                ],
              },
              style,
            ]}
          >
            <View style={styles.handle} accessibilityElementsHidden />
            <View style={styles.header}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="title-xs" accessibilityRole="header">
                  {title}
                </Text>
                {description ? (
                  <Text
                    variant="body-lg"
                    color={semantic.mutedForeground}
                    style={styles.description}
                  >
                    {description}
                  </Text>
                ) : null}
              </View>
              <IconButton accessibilityLabel="닫기" size={40} onPress={close} style={styles.close}>
                <XIcon />
              </IconButton>
            </View>
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            {footer ? (
              <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom) }]}>
                {footer}
              </View>
            ) : (
              <View style={{ height: Math.max(16, insets.bottom) }} />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </AnimatedModal>
  );
}

/** 시트 안 칸 제목 (예: 얼마나 먹었나요?) */
export function SheetLabel({ children, first = false }: { children: string; first?: boolean }) {
  return (
    <Text
      variant="body-xl"
      weight="medium"
      color={semantic.secondaryText}
      style={{ marginTop: first ? 4 : 12, marginBottom: 8 }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: semantic.overlay },
  sheetHost: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    backgroundColor: semantic.background,
    ...toNativeShadow(shadows.lg),
  },
  handle: {
    alignSelf: "center",
    marginTop: 8,
    height: 4,
    width: 36,
    borderRadius: radius.full,
    backgroundColor: semantic.input,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
    paddingBottom: 8,
  },
  description: { marginTop: 6, lineHeight: 20 },
  close: { marginTop: -4, marginRight: -8 },
  content: { paddingHorizontal: spacing.gutter, paddingBottom: 8 },
  footer: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.gutter, paddingTop: 12 },
});
