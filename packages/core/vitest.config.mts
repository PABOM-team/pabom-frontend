import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // 노드 테스트의 fetch는 절대 주소가 필요하다
    env: { NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000" },
  },
});
