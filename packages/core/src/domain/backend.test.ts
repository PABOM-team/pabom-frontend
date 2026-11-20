import { describe, expect, it } from "vitest";
import { toRoutineState } from "../api/adapters";
import { backendRoutinePostponeSchema } from "./backend";
import { successEnvelope } from "./envelope";

describe("backendRoutinePostponeSchema", () => {
  it("dev 서버의 실제 미루기 응답(lastDoneOn 없음)을 받는다", () => {
    // 2026-11-20 dev.api.pabom.app POST /routines/{id}/postpone 응답 그대로
    const body = {
      resultType: "SUCCESS",
      success: {
        data: {
          routine: {
            id: 85,
            nextDueOn: "2026-11-22",
            baseDueOn: "2026-11-20",
            postponedTo: "2026-11-22",
            postponedAt: "2026-11-20T17:46:25.857215536+09:00",
          },
        },
      },
      error: null,
      meta: { timestamp: "2026-11-20T08:46:25.871319035", path: "/api/v1/routines/85/postpone" },
    };
    const { routine } = successEnvelope(backendRoutinePostponeSchema).parse(body);
    expect(toRoutineState(routine)).toEqual({
      id: "85",
      lastDoneOn: null,
      nextDueOn: "2026-11-22",
    });
  });
});
