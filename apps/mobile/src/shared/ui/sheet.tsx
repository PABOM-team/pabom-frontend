import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { XIcon } from "./icons";
import { SurfaceProvider } from "./surface";
import { Text } from "./text";
import { semantic, spacing } from "./theme";
import { BottomSheet } from "./bottom-sheet";
import { POPUP_CLOSE, POPUP_OPEN } from "./motion";
import { Portal } from "./portal";
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

/**
 * 가운데 창·떠 있는 메뉴처럼 시트가 아닌 겹침 창의 바탕. 앱 맨 위 층(Portal)에 그린다.
 * children 은 진행도(0 닫힘 → 1 열림)를 받아 자기 모양대로 움직인다.
 * 열림·닫힘은 튀지 않는 스프링이고(motion.ts), onClosed 는 닫힘 애니메이션이 끝난 뒤 불린다
 */
export function AnimatedModal({
  open,
  onRequestClose,
  onClosed,
  children,
  dismissOnOverlay = true,
}: {
  open: boolean;
  onRequestClose: () => void;
  onClosed?: () => void;
  children: (progress: Animated.Value) => ReactNode;
  dismissOnOverlay?: boolean;
}) {
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);
  if (!rendered) return null;
  return (
    <Portal>
      <PopupLayer
        open={open}
        onRequestClose={onRequestClose}
        dismissOnOverlay={dismissOnOverlay}
        onHidden={() => {
          setRendered(false);
          onClosed?.();
        }}
      >
        {children}
      </PopupLayer>
    </Portal>
  );
}

function PopupLayer({
  open,
  onRequestClose,
  onHidden,
  children,
  dismissOnOverlay,
}: {
  open: boolean;
  onRequestClose: () => void;
  onHidden: () => void;
  children: (progress: Animated.Value) => ReactNode;
  dismissOnOverlay: boolean;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const onHiddenRef = useRef(onHidden);
  const onRequestCloseRef = useRef(onRequestClose);
  useEffect(() => {
    onHiddenRef.current = onHidden;
    onRequestCloseRef.current = onRequestClose;
  });

  // 커밋 직후 같은 프레임에 출발한다
  useLayoutEffect(() => {
    const animation = Animated.spring(progress, {
      toValue: open ? 1 : 0,
      ...(open ? POPUP_OPEN : POPUP_CLOSE),
      overshootClamping: true,
      restDisplacementThreshold: 0.001,
      restSpeedThreshold: 0.01,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !open) onHiddenRef.current();
    });
    return () => animation.stop();
  }, [open, progress]);

  // 안드로이드 뒤로 가기는 창부터 닫는다
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onRequestCloseRef.current();
      return true;
    });
    return () => subscription.remove();
  }, [open]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? "box-none" : "none"}>
      <Animated.View style={[styles.overlay, { opacity: progress }]}>
        <Pressable
          accessibilityLabel="닫기"
          style={StyleSheet.absoluteFill}
          onPress={dismissOnOverlay ? onRequestClose : undefined}
        />
      </Animated.View>
      {/* 시트·창·메뉴는 흰 바탕이라 안의 칩·안내 상자가 회색 면을 쓴다 */}
      <SurfaceProvider value="white">{children(progress)}</SurfaceProvider>
    </View>
  );
}

/** 아래에서 올라오는 시트 (Figma 시트: 손잡이 · 시트 머리(제목 22 bold · ×) · 내용 · 하단 버튼) */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  style,
}: SheetProps) {
  const close = () => onOpenChange(false);

  return (
    <BottomSheet
      open={open}
      onRequestClose={close}
      style={[{ backgroundColor: semantic.background }, style]}
      contentStyle={styles.content}
      header={
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="title-xs" accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {description ? (
              <Text variant="body-lg" color={semantic.mutedForeground} style={styles.description}>
                {description}
              </Text>
            ) : null}
          </View>
          <IconButton accessibilityLabel="닫기" size={44} onPress={close} style={styles.close}>
            <XIcon color={semantic.mutedForeground} />
          </IconButton>
        </View>
      }
      footer={footer ? <View style={styles.footer}>{footer}</View> : undefined}
    >
      {children}
    </BottomSheet>
  );
}

/** 시트 안 칸 제목 (예: 얼마나 먹었나요?). Figma 라벨: body-lg medium gray-700 */
export function SheetLabel({ children, first = false }: { children: string; first?: boolean }) {
  return (
    <Text
      variant="body-lg"
      weight="medium"
      color={semantic.secondaryText}
      style={{ marginTop: first ? 4 : 12, marginBottom: 6 }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: semantic.overlay },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: spacing.gutter,
    paddingTop: 4,
    paddingBottom: 12,
  },
  /** Figma 시트 머리 제목은 22px bold (타이포 토큰 사이 값) */
  title: { fontSize: 22, lineHeight: 29, letterSpacing: -0.66 },
  description: { marginTop: 6 },
  close: { marginTop: -8, marginRight: -10 },
  content: { paddingHorizontal: spacing.gutter, paddingBottom: 8 },
  footer: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.gutter },
});
