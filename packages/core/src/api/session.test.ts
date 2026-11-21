import { beforeEach, describe, expect, it } from "vitest";
import { oauthLoginSchema } from "../domain/user";
import {
  applyLoginResult,
  clearSession,
  configureSessionStorage,
  getAccessToken,
  getSignupSession,
  getStoredAccount,
  isSignedOut,
  setAccessToken,
  type KeyValueStorage,
} from "./session";

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

const signup = oauthLoginSchema.parse({
  signupToken: "signup-token",
  expiresIn: 600,
  isNewUser: true,
  user: { id: 2, nickname: "파봄 사용자1234", status: "PENDING_TERMS" },
});
const active = oauthLoginSchema.parse({
  accessToken: "access-token",
  expiresIn: 1800,
  isNewUser: false,
  user: { id: 1, nickname: "파봄", status: "ACTIVE" },
});

describe("탈퇴 뒤 같은 계정으로 다시 로그인", () => {
  beforeEach(() => {
    configureSessionStorage(memoryStorage());
    clearSession();
  });

  it("탈퇴(clearSession)하면 토큰·회원 정보를 지우고 로그아웃 직후로 표시한다", () => {
    applyLoginResult(active, "kakao");
    expect(getAccessToken()).toBe("access-token");
    expect(isSignedOut()).toBe(false);

    clearSession();
    expect(getAccessToken()).toBeNull();
    expect(getStoredAccount()).toBeNull();
    expect(getSignupSession()).toBeNull();
    expect(isSignedOut()).toBe(true);
  });

  it("가입 토큰이 오면 이전 access 토큰을 버리고 약관 동의로 보낸다", () => {
    setAccessToken("old-access");
    expect(applyLoginResult(signup, "kakao")).toBe("agreements");
    expect(getAccessToken()).toBeNull();
    expect(getSignupSession()?.token).toBe("signup-token");
    expect(getStoredAccount()).toEqual({ id: 2, nickname: "파봄 사용자1234", provider: "kakao" });
  });

  it("access 토큰이어도 회원이 약관 동의 전이면 약관 동의로 보낸다", () => {
    const pending = oauthLoginSchema.parse({
      accessToken: "pending-token",
      expiresIn: 600,
      isNewUser: true,
      user: { id: 2, status: "PENDING_TERMS" },
    });
    expect(applyLoginResult(pending, "google")).toBe("agreements");
    expect(getAccessToken()).toBeNull();
    expect(getSignupSession()?.token).toBe("pending-token");
  });

  it("기존 회원은 access 토큰을 두고 홈으로, 남은 가입 토큰은 지운다", () => {
    applyLoginResult(signup, "kakao");
    expect(applyLoginResult(active, "kakao")).toBe("home");
    expect(getAccessToken()).toBe("access-token");
    expect(getSignupSession()).toBeNull();
    expect(isSignedOut()).toBe(false);
  });
});
