import type { AuthProvider, OAuthLoginResult } from "../domain/user";

/**
 * access 토큰은 메모리에만 둔다 (refresh 토큰은 서버가 httpOnly 쿠키로 관리).
 * 새로고침하면 사라지므로 앱 시작 때·401 때 /auth/refresh로 다시 받는다.
 */
let accessToken: string | null = null;
/** 한 번이라도 로그인했던 세션인지. 처음 온 사람에게 '로그인이 만료됐어요'를 띄우지 않으려고 쓴다 */
let hadSession = false;
/** 이 기기에서 로그아웃·탈퇴한 직후인지. 이때 로그인 화면으로 보낼 때는 보던 화면(next)을 기억하지 않는다 */
let signedOut = false;

type Listener = () => void;
const expiredListeners = new Set<Listener>();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    hadSession = true;
    signedOut = false;
  }
}

/** 로그아웃·탈퇴. access 토큰·가입 토큰·로그인 회원 정보를 모두 지운다 */
export function clearSession() {
  accessToken = null;
  hadSession = false;
  signedOut = true;
  clearSignupSession();
  writeStored(ACCOUNT_KEY, null);
}

/** 로그아웃·탈퇴 직후라 다시 로그인해도 보던 화면으로 돌아가면 안 되는지 */
export function isSignedOut() {
  return signedOut;
}

/**
 * 로그인(콜백·SDK) 결과를 세션에 반영하고 어디로 갈지 알려 준다.
 * 가입 토큰이 왔거나 회원이 약관 동의 전(PENDING_TERMS)이면 그 토큰을 가입 토큰으로 두고 'agreements'.
 * 탈퇴 뒤 같은 소셜 계정으로 다시 가입하는 경우에도 이전 세션 값이 남지 않게 먼저 비운다
 */
export function applyLoginResult(
  login: OAuthLoginResult,
  provider: AuthProvider,
): "agreements" | "home" {
  accessToken = null;
  clearSignupSession();
  setStoredAccount({ id: login.user.id, nickname: login.user.nickname, provider });
  const pendingTerms = "signupToken" in login || login.user.status === "PENDING_TERMS";
  if (pendingTerms) {
    signedOut = false;
    setSignupSession(
      "signupToken" in login ? login.signupToken : login.accessToken,
      login.expiresIn,
    );
    return "agreements";
  }
  setAccessToken(login.accessToken);
  return "home";
}

export function onSessionExpired(listener: Listener) {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

export function notifySessionExpired() {
  if (!hadSession) return;
  hadSession = false;
  accessToken = null;
  expiredListeners.forEach((listener) => listener());
}

// ── 탭을 닫으면 사라지는 값 ─────────────────────────────────
// 웹은 sessionStorage, 앱은 configureSessionStorage로 끼운 저장소(expo-secure-store 등)를 쓴다.
// 둘 다 없는 곳(서버 렌더)에서는 아무것도 하지 않는다

/** 문자열 키-값 저장소. sessionStorage와 같은 모양이면 무엇이든 끼울 수 있다 */
export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

let customStorage: KeyValueStorage | undefined;

/** 앱(React Native)에서 세션 값을 둘 저장소를 끼운다. 웹은 부르지 않아도 sessionStorage를 쓴다 */
export function configureSessionStorage(storage: KeyValueStorage | undefined) {
  customStorage = storage;
}

const storage = (): KeyValueStorage | undefined => customStorage ?? globalThis.sessionStorage;

function readStored<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    if (value === null) storage()?.removeItem(key);
    else storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // 저장소를 못 쓰면(사생활 보호 모드 등) 메모리 값만으로 이어 간다
  }
}

/** 약관 동의 전 새 회원의 가입 토큰. 약관 화면에서 새로고침해도 이어 가도록 저장해 둔다 */
export type SignupSession = { token: string; expiresAt: number };
const SIGNUP_KEY = "pabom-signup";

export function setSignupSession(token: string, expiresInSeconds: number) {
  writeStored(SIGNUP_KEY, { token, expiresAt: Date.now() + expiresInSeconds * 1000 });
}

export function getSignupSession(): SignupSession | null {
  const session = readStored<SignupSession>(SIGNUP_KEY);
  return session && session.expiresAt > Date.now() ? session : null;
}

export function clearSignupSession() {
  writeStored(SIGNUP_KEY, null);
}

/**
 * 로그인할 때 받은 회원 정보. 내 정보(GET /users/me)에 없는 소셜 종류를 설정 화면에 보여 줄 때 쓴다.
 */
export type StoredAccount = { id: number; nickname?: string; provider: AuthProvider };
const ACCOUNT_KEY = "pabom-account";

export function setStoredAccount(account: StoredAccount) {
  writeStored(ACCOUNT_KEY, account);
}

export function getStoredAccount() {
  return readStored<StoredAccount>(ACCOUNT_KEY);
}
