import { afterEach, describe, expect, it, vi } from "vitest";
import { newRequestId } from "./adapters";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newRequestId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("crypto 가 있으면 UUID v4 를 만든다", () => {
    expect(newRequestId()).toMatch(UUID_V4);
  });

  it("crypto 가 없어도 겹치지 않는 UUID v4 를 만든다", () => {
    vi.stubGlobal("crypto", undefined);
    const ids = Array.from({ length: 50 }, () => newRequestId());
    expect(ids.every((id) => UUID_V4.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
