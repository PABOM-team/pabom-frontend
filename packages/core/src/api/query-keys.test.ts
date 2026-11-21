import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { invalidateAfterPetDeleted, isPetScopedKey, queryKeys } from "./query-keys";

describe("isPetScopedKey", () => {
  it("지운 개체에 딸린 쿼리만 고른다", () => {
    expect(isPetScopedKey(queryKeys.pet("26"), "26")).toBe(true);
    expect(isPetScopedKey(queryKeys.routines("26"), "26")).toBe(true);
    expect(isPetScopedKey(queryKeys.recordList({ petId: "26", limit: 5 }), "26")).toBe(true);
    expect(isPetScopedKey([...queryKeys.recordList({ petId: "26" }), "infinite"], "26")).toBe(true);
    expect(isPetScopedKey(queryKeys.todayAt("2026-11-21", "26"), "26")).toBe(true);

    expect(isPetScopedKey(queryKeys.pet("27"), "26")).toBe(false);
    expect(isPetScopedKey(queryKeys.petList(), "26")).toBe(false);
    expect(isPetScopedKey(queryKeys.recordList({ limit: 5 }), "26")).toBe(false);
    expect(isPetScopedKey(queryKeys.todayAt("2026-11-21"), "26")).toBe(false);
  });
});

describe("invalidateAfterPetDeleted", () => {
  it("화면에 붙어 있어도 지운 개체 쿼리는 다시 부르지 않고, 나머지는 다시 부른다", async () => {
    const queryClient = new QueryClient();
    const calls: string[] = [];
    const observe = (queryKey: readonly unknown[], name: string) =>
      new QueryObserver(queryClient, {
        queryKey,
        queryFn: async () => {
          calls.push(name);
          return name;
        },
      }).subscribe(() => undefined);
    const unsubscribe = [
      observe(queryKeys.pet("26"), "deleted-detail"),
      observe(queryKeys.routines("26"), "deleted-routines"),
      observe(queryKeys.petList(), "list"),
    ];
    await new Promise((resolve) => setTimeout(resolve, 0));
    calls.length = 0;

    await invalidateAfterPetDeleted(queryClient, "26");
    unsubscribe.forEach((u) => u());

    expect(calls).toEqual(["list"]);
    expect(queryClient.getQueryState(queryKeys.pet("26"))?.isInvalidated).toBe(true);
  });
});
