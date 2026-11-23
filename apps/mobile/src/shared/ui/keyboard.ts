import { useEffect, useRef, type ComponentRef } from "react";
import {
  Keyboard,
  TextInput,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";
import { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";

/** 입력칸 위로 남기는 여백 */
const FOCUS_MARGIN = 16;
/** 입력칸 아래로 남기는 여백. 글자 수(0 / 200자) 줄까지 보이게 넉넉히 */
const FOCUS_MARGIN_BOTTOM = 36;

/**
 * 키보드 높이만큼 아래 여백을 주는 스타일. 키보드가 올라오는 애니메이션과 같은 프레임으로 움직인다
 * (KeyboardAvoidingView 는 키보드가 다 올라온 값으로 한 번에 뛰어 화면이 끊겨 보인다).
 * overlap 은 이미 아래 안전 영역 등으로 띄워 둔 높이 — 그만큼 덜 올린다
 */
export const useKeyboardPadding = (overlap = 0) => {
  const keyboard = useAnimatedKeyboard();
  return useAnimatedStyle(() => ({
    paddingBottom: Math.max(keyboard.height.value - overlap, 0),
  }));
};

/**
 * 키보드가 뜨면 지금 입력 중인 칸이 스크롤 영역 안에 보이도록 스크롤한다.
 * 돌려준 ref·onScroll·onLayout 을 ScrollView 에 그대로 붙인다
 */
export const useScrollToFocusedInput = () => {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const viewport = useRef(0);

  useEffect(() => {
    const reveal = () => {
      const scroll = ref.current;
      const input = TextInput.State.currentlyFocusedInput();
      const content = scroll?.getInnerViewRef();
      if (!scroll || !input || !content) return;
      input.measureLayout(
        content,
        (_x, y, _width, height) => {
          const top = y - FOCUS_MARGIN;
          const bottom = y + height + FOCUS_MARGIN_BOTTOM;
          const target =
            top < offset.current
              ? top
              : bottom > offset.current + viewport.current
                ? bottom - viewport.current
                : null;
          if (target !== null) scroll.scrollTo({ y: Math.max(target, 0), animated: true });
        },
        () => {},
      );
    };
    const subscription = Keyboard.addListener("keyboardDidShow", reveal);
    return () => subscription.remove();
  }, []);

  return {
    ref,
    scrollEventThrottle: 16,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset.y;
    },
    onLayout: (event: LayoutChangeEvent) => {
      viewport.current = event.nativeEvent.layout.height;
    },
  };
};
