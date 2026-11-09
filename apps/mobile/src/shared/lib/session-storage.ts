import * as SecureStore from "expo-secure-store";
import type { KeyValueStorage } from "@pabom/core/api/session";

/**
 * @pabom/core 세션 값(가입 토큰·로그인 계정)을 둘 저장소. 웹의 sessionStorage 자리.
 * SecureStore 의 동기 읽기·쓰기를 쓰고, 지우기는 비동기라 메모리에 먼저 반영한다
 */
export function createSessionStorage(): KeyValueStorage {
  const removed = new Set<string>();
  return {
    getItem: (key) => {
      if (removed.has(key)) return null;
      try {
        return SecureStore.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      removed.delete(key);
      SecureStore.setItem(key, value);
    },
    removeItem: (key) => {
      removed.add(key);
      void SecureStore.deleteItemAsync(key).catch(() => undefined);
    },
  };
}
