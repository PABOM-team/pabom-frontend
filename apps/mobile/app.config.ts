import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * app.json(운영 앱 "파봄")을 기본으로 두고, APP_VARIANT=development 이면 개발 서버용 별도 앱 "파봄(dev)"으로 바꾼다.
 * eas.json 의 development·preview 프로필이 APP_VARIANT 를 넣는다.
 * 번들 ID·스킴이 달라 운영 앱과 한 폰에 같이 설치되고, 로그인 콜백(…://auth/callback/{provider})도 섞이지 않는다
 */
const IS_DEV_APP = process.env.APP_VARIANT === "development";

const appConfig = ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (!IS_DEV_APP) return base;

  return {
    ...base,
    name: "파봄(dev)",
    scheme: "pabom-dev",
    ios: {
      ...base.ios,
      bundleIdentifier: "app.pabom.mobile.dev",
      // iOS 로그인 확인 창("…이(가) kakao.com을 사용하여 로그인하려고 합니다")에 나오는 이름
      infoPlist: { ...base.ios?.infoPlist, CFBundleName: "파봄(dev)" },
    },
    android: { ...base.android, package: "app.pabom.mobile.dev" },
  };
};

export default appConfig;
