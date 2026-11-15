import { router, type Href } from "expo-router";

/**
 * 뒤로 가기. 이전 화면이 없을 때(딥링크로 바로 들어온 경우)는 fallback 으로 바꿔 간다.
 * 웹 TopBar 의 history.length 검사와 같은 역할
 */
export function goBack(fallback: Href = "/home") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
