import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  BackHandler,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { GestureDetector, ScrollView, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import { useScrollToFocusedInput } from "./keyboard";
import {
  SHEET_CLOSE_MS,
  SHEET_OPEN_MS,
  SHEET_SETTLE,
  projectDistance,
  rubberBand,
  sheetCloseEasing,
  sheetOpenEasing,
  withSteadyTiming,
} from "./motion";
import { Portal } from "./portal";
import { SurfaceProvider } from "./surface";
import { radius, semantic, shadows, toNativeShadow } from "./theme";

/** 시트 위로 남기는 최소 여백 */
const TOP_GAP = 12;
/** 위로 끌어 올렸을 때 시트 아래가 비어 보이지 않게 덧대는 흰 판 */
const UNDERLAY = 240;

const linear = (ratio: number) => {
  "worklet";
  return ratio;
};

/** 시트 단계: 높이 재는 중 → 열림 → (눌러 닫는 중 | 끌어 내리는 중 → 끌어 내려 닫힘) */
const WAITING = 0;
const OPEN = 1;
const CLOSING = 2;
const DRAGGING_OUT = 3;
const DRAGGED_OUT = 4;
type Phase =
  typeof WAITING | typeof OPEN | typeof CLOSING | typeof DRAGGING_OUT | typeof DRAGGED_OUT;

export type BottomSheetProps = {
  open: boolean;
  onRequestClose: () => void;
  /** 닫힘 애니메이션이 끝난 뒤. 고른 행동(다음 시트·사진 선택기)은 여기서 실행한다 */
  onClosed?: () => void;
  /** 손잡이 아래 고정 머리 (스크롤되지 않는다) */
  header?: ReactNode;
  children?: ReactNode;
  /** 아래 고정 버튼 영역. 키보드가 뜨면 키보드 바로 위에 붙는다 */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * 아래에서 올라오는 시트의 공통 바탕. 앱 맨 위 층(Portal)에 그린다.
 * - 열림은 첫 프레임부터 빠르게 들어와 감속만 한다 (motion.ts). 닫힘은 더 짧다
 * - 끌다 놓으면 손을 뗀 프레임에 손 속도를 이어받아 닫히거나 제자리로 돌아간다
 * - 손잡이·머리·내용(맨 위일 때) 어디서든 아래로 끌 수 있고, 위로는 고무줄처럼 버틴다
 * - 키보드가 올라오는 프레임에 맞춰 함께 올라가고, 입력 중인 칸이 보이도록 스크롤한다
 */
export function BottomSheet(props: BottomSheetProps) {
  // 닫힘 애니메이션이 끝날 때까지 층에 남겨 둔다
  const [rendered, setRendered] = useState(props.open);
  if (props.open && !rendered) setRendered(true);
  if (!rendered) return null;
  return (
    <Portal>
      <SheetView
        {...props}
        onHidden={() => {
          setRendered(false);
          props.onClosed?.();
        }}
      />
    </Portal>
  );
}

function SheetView({
  open,
  onRequestClose,
  onHidden,
  header,
  children,
  footer,
  style,
  contentStyle,
  accessibilityLabel,
}: BottomSheetProps & { onHidden: () => void }) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const requestCloseRef = useRef(onRequestClose);
  const onHiddenRef = useRef(onHidden);
  useEffect(() => {
    requestCloseRef.current = onRequestClose;
    onHiddenRef.current = onHidden;
  });
  const requestClose = () => requestCloseRef.current();

  /** 0 닫힘 → 1 열림. 1 을 넘으면 위로 끌어 올린 만큼 */
  const progress = useSharedValue(0);
  const sheetHeight = useSharedValue(screenHeight);
  /** UI 스레드에서 보는 시트 단계 */
  const phase = useSharedValue<Phase>(WAITING);
  const scrollTop = useSharedValue(true);
  const dragStart = useSharedValue(0);
  const openRef = useRef(open);
  const hiddenOnce = useRef(false);
  const hidden = () => {
    if (hiddenOnce.current) return;
    hiddenOnce.current = true;
    onHiddenRef.current();
  };
  /** 끌어 내려 닫힌 뒤: 부모가 open 을 내렸으면 바로 치운다 (아직이면 아래 effect 가 치운다) */
  const hiddenIfClosed = () => {
    if (!openRef.current) hidden();
  };

  const startOpen = () => {
    "worklet";
    phase.value = OPEN;
    progress.value = reduceMotion
      ? withSteadyTiming(1, 150, linear)
      : withSteadyTiming(1, SHEET_OPEN_MS, sheetOpenEasing);
  };

  // 시트가 그려져 높이를 안 다음(onLayout) 출발한다. 높이를 모른 채 출발하면 화면 밖을 달리는 동안 멈춘 듯 보이고,
  // 뷰가 붙기 전에 시계를 돌리면 붙는 순간 중간 위치로 건너뛴다
  const onSheetLayout = (event: LayoutChangeEvent) => {
    scheduleOnUI((height: number) => {
      "worklet";
      sheetHeight.value = height;
      if (phase.value === WAITING) startOpen();
    }, event.nativeEvent.layout.height);
  };

  useLayoutEffect(() => {
    openRef.current = open;
    if (open) {
      hiddenOnce.current = false;
      // 닫히는 중에 다시 열렸다. 처음 뜰 때는 onLayout 이 출발시킨다
      scheduleOnUI(() => {
        "worklet";
        if (phase.value !== WAITING && phase.value !== OPEN) startOpen();
      });
      return;
    }
    scheduleOnUI(() => {
      "worklet";
      // 끌어 내려 닫는 중이면 그 움직임을 그대로 둔다
      if (phase.value === DRAGGED_OUT) {
        scheduleOnRN(hidden);
        return;
      }
      if (phase.value === DRAGGING_OUT) return;
      phase.value = CLOSING;
      const done = (finished?: boolean) => {
        "worklet";
        if (finished) scheduleOnRN(hidden);
      };
      progress.value = reduceMotion
        ? withSteadyTiming(0, 120, linear, done)
        : withSteadyTiming(0, SHEET_CLOSE_MS, sheetCloseEasing, done);
    });
    // hidden·startOpen 은 ref·shared value 만 쓰므로 다시 만들어져도 괜찮다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 안드로이드 뒤로 가기는 시트부터 닫는다
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      requestCloseRef.current();
      return true;
    });
    return () => subscription.remove();
  }, [open]);

  const pan = usePanGesture({
    // 아래로만 잡는다. 위로 끌기는 안쪽 스크롤에 맡긴다
    activeOffsetY: [-Number.MAX_SAFE_INTEGER, 6],
    enabled: open,
    onActivate: () => {
      "worklet";
      dragStart.value = (1 - progress.value) * sheetHeight.value;
    },
    onUpdate: (event) => {
      "worklet";
      if (phase.value !== OPEN) return;
      const h = sheetHeight.value;
      // 안쪽 내용이 아직 스크롤돼 있으면 시트는 그대로, 맨 위에 닿은 뒤부터 따라 내려온다
      if (!scrollTop.value && progress.value >= 1) {
        dragStart.value = -event.translationY;
        return;
      }
      const offset = dragStart.value + event.translationY;
      progress.value = offset >= 0 ? 1 - offset / h : 1 + rubberBand(-offset, h) / h;
    },
    onDeactivate: (event) => {
      "worklet";
      if (phase.value !== OPEN) return;
      const h = sheetHeight.value;
      const offset = (1 - progress.value) * h;
      const speed = event.velocityY / h;
      if (offset + projectDistance(event.velocityY) > h / 2 && event.velocityY > -50) {
        // 손을 뗀 프레임에 바로 이어서 내려간다 (JS 를 거치지 않는다). 처음 속도가 손 속도와 같도록 시간을 잡는다:
        // 3차 감속 곡선의 처음 속도는 3·거리/시간
        phase.value = DRAGGING_OUT;
        const remaining = Math.max(progress.value, 0);
        const duration = Math.min(Math.max((3 * remaining) / Math.max(speed, 0.001), 0.12), 0.26);
        progress.value = withSteadyTiming(0, duration * 1000, sheetCloseEasing, (finished) => {
          "worklet";
          if (!finished) return;
          phase.value = DRAGGED_OUT;
          scheduleOnRN(hiddenIfClosed);
        });
        scheduleOnRN(requestClose);
        return;
      }
      progress.value = withSpring(1, { ...SHEET_SETTLE, velocity: -speed });
    },
  });

  const scroll = useScrollToFocusedInput();
  const keyboard = useAnimatedKeyboard();
  const bottomPad = Math.max(16, insets.bottom);

  // 배경은 시트보다 조금 먼저 어두워지고 늦게 밝아진다 (같은 progress)
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6], [0, 1], "clamp"),
  }));
  const hostStyle = useAnimatedStyle(() => ({ paddingBottom: keyboard.height.value }));
  // 높이를 재기 전에는 화면 높이만큼 내려 둬 화면 밖에 있다
  const sheetStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: progress.value }
      : { transform: [{ translateY: (1 - progress.value) * sheetHeight.value }] },
  );
  // 화면 위 여백까지만 커지고 넘치는 내용은 안쪽에서 스크롤된다
  // (GestureDetector 가 감싸는 뷰 때문에 flexShrink 로는 줄지 않아 최대 높이를 직접 준다)
  const limitStyle = useAnimatedStyle(() => ({
    maxHeight: screenHeight - insets.top - TOP_GAP - keyboard.height.value,
  }));
  // 키보드가 뜨면 아래 안전 영역 대신 키보드 위 12 만 띄운다 (올라오는 동안 조금씩)
  const footerPadStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(bottomPad - keyboard.height.value, 12),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? "auto" : "none"}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable
          accessibilityLabel="닫기"
          style={StyleSheet.absoluteFill}
          onPress={requestClose}
        />
      </Animated.View>
      <Animated.View pointerEvents="box-none" style={[styles.host, hostStyle]}>
        <SurfaceProvider value="white">
          <GestureDetector gesture={pan}>
            <Animated.View
              accessibilityViewIsModal
              accessibilityLabel={accessibilityLabel}
              onLayout={onSheetLayout}
              style={[styles.sheet, limitStyle, sheetStyle, style]}
            >
              <View style={styles.underlay} pointerEvents="none" />
              <View style={styles.handleRow} accessibilityElementsHidden>
                <View style={styles.handle} />
              </View>
              {header}
              <ScrollView
                ref={scroll.ref}
                simultaneousWith={pan}
                bounces={false}
                overScrollMode="never"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={scroll.scrollEventThrottle}
                onScroll={(event) => {
                  scroll.onScroll(event);
                  scrollTop.value = event.nativeEvent.contentOffset.y <= 0;
                }}
                onLayout={scroll.onLayout}
                style={styles.scroll}
                contentContainerStyle={contentStyle}
              >
                {children}
              </ScrollView>
              {footer ? (
                <Animated.View style={[styles.footer, footerPadStyle]}>{footer}</Animated.View>
              ) : (
                <Animated.View style={footerPadStyle} />
              )}
            </Animated.View>
          </GestureDetector>
        </SurfaceProvider>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: semantic.overlay },
  host: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: radius["3xl"],
    borderTopRightRadius: radius["3xl"],
    backgroundColor: semantic.card,
    ...toNativeShadow(shadows.lg),
  },
  underlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    height: UNDERLAY,
    backgroundColor: semantic.card,
  },
  /** 손잡이 줄은 손가락으로 잡기 쉽게 넉넉히 (보이는 막대는 36×4) */
  handleRow: { alignItems: "center", paddingTop: 8, paddingBottom: 10 },
  handle: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: semantic.input },
  scroll: { flexGrow: 0, flexShrink: 1 },
  footer: { paddingTop: 12 },
});
