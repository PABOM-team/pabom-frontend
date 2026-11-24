import { NativeTabs } from "expo-router/native-tabs";
import { semantic } from "@/shared/ui/theme";

/**
 * iOS 하단 탭은 시스템 탭 바(UITabBar)를 그대로 쓴다. iOS 26+ 에서는 애플 홈 앱 하단과 같은 리퀴드 글래스 캡슐 하나에
 * 아이콘 + 라벨이 놓이고, 고른 탭 뒤에 유리 렌즈가 생겨 탭 사이를 미끄러진다. 누름 반응·탭 다시 누르면 맨 위로 등도 시스템이 한다.
 * 고른 탭 색은 브랜드 파랑. Android 는 _layout.tsx (Material 3 Navigation bar)
 *
 * iOS 25 이하의 막대형 탭 바는 Android 와 같게 흰 바탕 + 위 구분선으로 본문과 나눈다.
 * (기본값은 본문이 끝까지 내려가면 바가 투명해져 회색 바탕과 섞인다.) iOS 26+ 글래스에는 이 값들이 쓰이지 않는다
 */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={semantic.brand}
      labelStyle={{ fontFamily: "Pretendard-Medium" }}
      backgroundColor={semantic.card}
      blurEffect="none"
      shadowColor={semantic.input}
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="home" contentStyle={{ backgroundColor: semantic.screen }}>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
        <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pets" contentStyle={{ backgroundColor: semantic.screen }}>
        <NativeTabs.Trigger.Icon sf={{ default: "pawprint", selected: "pawprint.fill" }} />
        <NativeTabs.Trigger.Label>개체</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" contentStyle={{ backgroundColor: semantic.screen }}>
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <NativeTabs.Trigger.Label>설정</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
