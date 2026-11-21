/**
 * 환경 변수는 웹(Next)은 NEXT_PUBLIC_*, 앱(Expo)은 EXPO_PUBLIC_* 로 받는다.
 * 두 번들러 모두 `process.env.접두사_이름` 을 글자 그대로 적은 곳만 빌드 때 값으로 바꾸므로
 * 변수 이름을 조립하지 말고 아래처럼 하나씩 적는다. 자기 쪽이 아닌 접두사는 undefined 가 된다.
 */
export const env = {
  /**
   * API를 부르는 백엔드 주소. 배포에서는 반드시 넣는다 (예: https://api.pabom.app).
   * 웹 로컬 개발에서 비워 두면 같은 주소의 /api/v1로 부르고, 개발 전용 프록시(apps/web/src/app/api/v1)가
   * API_PROXY_TARGET 백엔드로 넘긴다. 앱은 프록시가 없으니 항상 넣는다.
   */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  /** 웹 푸시용 VAPID 공개키 (웹 전용) */
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
} as const;
