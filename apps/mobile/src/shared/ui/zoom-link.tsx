import { Link, type Href } from "expo-router";
import type { ReactElement } from "react";
import { Pressable, type PressableProps } from "react-native";

/**
 * 누른 요소에서 다음 화면이 커져 나오는 링크 (iOS 18+ 줌 전환).
 * 들어간 화면은 화면 어디서든 손가락으로 밀면 카드처럼 작아지며 손가락을 따라오고, 놓으면 누른 요소 자리로 돌아간다.
 * 자식은 onPress 를 받는 누를 수 있는 요소 하나(Button 등). 스타일은 객체만 — 함수 스타일은 ZoomPressable 을 쓴다.
 * Android·iOS 17 이하는 보통 화면 이동(옆으로 밀림)
 */
export function ZoomLink({ href, children }: { href: Href; children: ReactElement }) {
  return (
    <Link href={href} asChild>
      <Link.AppleZoom>{children}</Link.AppleZoom>
    </Link>
  );
}

/**
 * 누르면 줌 전환으로 href 를 여는 Pressable. 눌림 스타일(`({ pressed }) => …`)을 그대로 쓸 수 있다.
 * (Link asChild 는 자식 style 을 객체로 합쳐 함수 스타일을 잃는다. 그래서 style 을 다른 이름으로 넘겨 받는다)
 */
export function ZoomPressable({
  href,
  style,
  sourceInside = false,
  ...props
}: Omit<PressableProps, "onPress" | "style"> & {
  href: Href;
  style?: PressableProps["style"];
  /**
   * true 면 이 누름 칸 전체가 아니라 안쪽의 <ZoomSource> 로 감싼 부분(예: 사진)에서 화면이 커져 나온다.
   * 그 부분의 둥근 모서리를 시스템이 그대로 써서, 밀어서 돌아갈 때 카드 모서리가 어긋나지 않는다
   */
  sourceInside?: boolean;
}) {
  const pressable = <StyledPressable pressStyle={style} {...props} />;
  return (
    <Link href={href} asChild>
      {sourceInside ? pressable : <Link.AppleZoom>{pressable}</Link.AppleZoom>}
    </Link>
  );
}

/** ZoomPressable(sourceInside) 안에서 화면이 커져 나올 부분. 자식 하나 */
export const ZoomSource = Link.AppleZoom;

/** 열린 화면에서 누른 부분과 맞춰질 자리 (예: 상세의 큰 사진). 줌 전환으로 열린 화면에서만 효과가 있다 */
export const ZoomTarget = Link.AppleZoomTarget;

/** Link 가 덮어쓴 style 은 버리고 원래 스타일(pressStyle)을 쓴다 */
function StyledPressable({
  pressStyle,
  style: _slotStyle,
  ...props
}: PressableProps & { pressStyle?: PressableProps["style"] }) {
  return <Pressable style={pressStyle} {...props} />;
}
