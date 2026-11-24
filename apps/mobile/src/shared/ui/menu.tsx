import { useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type HostInstance,
} from "react-native";
import { DotsHorizontalIcon } from "./icons";
import { AnimatedModal } from "./sheet";
import { Text } from "./text";
import { radius, semantic, shadows, toNativeShadow } from "./theme";
import { IconButton } from "./top-bar";

export type MenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  hidden?: boolean;
};

const MENU_WIDTH = 160;
const ITEM_HEIGHT = 46;
const EDGE = 12;

/**
 * ⋯ 메뉴 (Figma 할 일 카드·개체 상세의 떠 있는 메뉴).
 * 트리거 위치를 재서 그 아래에 띄운다. 트리거가 오른쪽에 있으면 오른쪽, 왼쪽에 있으면 왼쪽 끝을 맞추고,
 * 화면 밖으로 나가면 안쪽으로 밀어 넣는다
 */
export function Menu({
  items,
  label = "더 보기",
  trigger,
  triggerSize = 44,
}: {
  items: MenuItem[];
  label?: string;
  trigger?: ReactNode;
  triggerSize?: number;
}) {
  const anchor = useRef<HostInstance>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number }>({
    top: 0,
    right: EDGE,
  });
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const visible = items.filter((item) => !item.hidden);

  const show = () => {
    anchor.current?.measureInWindow((x, y, width, height) => {
      const estimated = visible.length * ITEM_HEIGHT + 2;
      const top =
        y + height + 2 + estimated > screenHeight - EDGE ? y - estimated - 2 : y + height + 2;
      // 트리거가 화면 왼쪽 절반이면 왼쪽 끝을 맞춘다. 오른쪽 정렬만 하면 왼쪽 가장자리의 트리거(사진 칸 +)에서
      // 메뉴가 화면 밖으로 밀려 잘린다 (T08-04)
      const horizontal =
        x + width / 2 < screenWidth / 2
          ? { left: Math.max(EDGE, Math.min(x, screenWidth - MENU_WIDTH - EDGE)) }
          : { right: Math.max(EDGE, screenWidth - (x + width)) };
      setPosition({ top, ...horizontal });
      setOpen(true);
    });
  };

  return (
    <>
      <View ref={anchor} collapsable={false}>
        <IconButton accessibilityLabel={label} size={triggerSize} onPress={show}>
          {trigger ?? <DotsHorizontalIcon color={semantic.mutedForeground} />}
        </IconButton>
      </View>
      <AnimatedModal open={open} onRequestClose={() => setOpen(false)}>
        {(progress) => (
          <Animated.View
            style={[
              styles.menu,
              position,
              {
                opacity: progress,
                transform: [
                  { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                ],
              },
            ]}
          >
            <View style={styles.menuClip}>
              {visible.map((item, index) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="menuitem"
                  onPress={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    index > 0 && styles.itemDivider,
                    pressed && { backgroundColor: semantic.muted },
                  ]}
                >
                  <Text
                    variant="body-lg"
                    color={item.tone === "danger" ? semantic.destructive : semantic.foreground}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}
      </AnimatedModal>
    </>
  );
}

const styles = StyleSheet.create({
  /** Figma 팝업 메뉴: 160 · 모서리 12 · gray-300 테두리 · 그림자 */
  menu: {
    position: "absolute",
    minWidth: MENU_WIDTH,
    borderRadius: radius.lg,
    backgroundColor: semantic.background,
    ...toNativeShadow(shadows.md),
  },
  /** 그림자는 바깥에, 모서리 자르기는 안쪽에 (iOS 는 overflow hidden 이 그림자도 자른다) */
  menuClip: {
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: semantic.input,
  },
  item: { height: ITEM_HEIGHT, justifyContent: "center", paddingHorizontal: 16 },
  itemDivider: { borderTopWidth: 1, borderTopColor: semantic.border },
});
