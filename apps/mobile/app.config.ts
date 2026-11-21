/// <reference types="node" />
import type { ConfigContext, ExpoConfig } from "expo/config";
import { withDangerousMod, type ConfigPlugin } from "expo/config-plugins";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * app.json(운영 앱 "파봄")을 기본으로 두고, APP_VARIANT=development 이면 개발 서버용 별도 앱 "파봄(dev)"으로 바꾼다.
 * eas.json 의 development·preview 프로필이 APP_VARIANT 를 넣는다.
 * 번들 ID·스킴이 달라 운영 앱과 한 폰에 같이 설치되고, 로그인 콜백(…://auth/callback/{provider})도 섞이지 않는다
 */
const IS_DEV_APP = process.env.APP_VARIANT === "development";

/**
 * 카카오·구글 로그인 SDK 키. eas.json 프로필 env 나 .env.local 에서 읽는다 (모두 앱 안에 들어가는 공개 값).
 * 키가 없으면 그 SDK 플러그인을 빼서 키 없이도 빌드되고, 로그인 버튼은 브라우저 로그인으로 간다
 */
const kakaoAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

type PluginEntry = [string, Record<string, unknown>];

/** 구글 iOS 클라이언트 ID(123-abc.apps.googleusercontent.com)를 뒤집은 URL 스킴 */
const reversedClientId = (clientId: string) => clientId.split(".").toReversed().join(".");

const socialLoginPlugins: PluginEntry[] = [
  ...(kakaoAppKey
    ? [["@react-native-seoul/kakao-login", { kakaoAppKey }] satisfies PluginEntry]
    : []),
  ...(googleIosClientId
    ? [
        [
          "@react-native-google-signin/google-signin",
          { iosUrlScheme: reversedClientId(googleIosClientId) },
        ] satisfies PluginEntry,
      ]
    : []),
  // 카카오 SDK 는 카카오 저장소에서 받는다
  [
    "expo-build-properties",
    { android: { extraMavenRepos: ["https://devrepo.kakao.com/nexus/content/groups/public/"] } },
  ],
];

/**
 * 카카오톡 로그인에서 돌아오는 주소(kakao{앱 키}://oauth)를 카카오 SDK에 넘긴다.
 * Expo 58 템플릿은 주소를 AppDelegate 가 아니라 SceneDelegate 로 받는데, 카카오 플러그인은 AppDelegate 만 고쳐서
 * 그대로 두면 카카오톡에서 동의하고 돌아와도 로그인이 끝나지 않는다
 */
const KAKAO_SCENE_HANDLER = `  // 카카오톡 로그인에서 돌아온 주소는 카카오 SDK가 처리한다 (app.config.ts)
  override func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    if let url = URLContexts.first?.url, AuthApi.isKakaoTalkLoginUrl(url) {
      _ = AuthController.handleOpenUrl(url: url)
      return
    }
    super.scene(scene, openURLContexts: URLContexts)
  }
`;

const withKakaoSceneDelegate: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const root = modConfig.modRequest.platformProjectRoot;
      const file = join(root, modConfig.modRequest.projectName ?? "app", "SceneDelegate.swift");
      const source = readFileSync(file, "utf8");
      if (source.includes("isKakaoTalkLoginUrl")) return modConfig;
      const patched = source
        .replace(
          "internal import Expo\n",
          "internal import Expo\nimport KakaoSDKAuth\nimport UIKit\n",
        )
        .replace(/\n}\s*$/, `\n\n${KAKAO_SCENE_HANDLER}}\n`);
      writeFileSync(file, patched);
      return modConfig;
    },
  ]);

const variantConfig = (base: ExpoConfig): ExpoConfig =>
  IS_DEV_APP
    ? {
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
      }
    : base;

/**
 * 안드로이드 푸시(FCM) 설정 파일. 운영·개발 앱은 패키지명이 달라 Firebase 앱도 따로라서
 * EAS 환경 변수(파일 형식) GOOGLE_SERVICES_JSON 에 프로필별 파일을 넣는다. 로컬은 파일 경로를 적는다.
 * 없으면 빌드는 되지만 안드로이드에서 푸시 토큰을 받지 못한다
 */
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

const appConfig = ({ config }: ConfigContext): ExpoConfig => {
  const base = variantConfig(config as ExpoConfig);
  const withPlugins: ExpoConfig = {
    ...base,
    android: googleServicesFile ? { ...base.android, googleServicesFile } : base.android,
    plugins: [...(base.plugins ?? []), ...socialLoginPlugins],
  };
  return kakaoAppKey ? withKakaoSceneDelegate(withPlugins) : withPlugins;
};

export default appConfig;
