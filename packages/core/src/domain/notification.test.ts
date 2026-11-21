import { describe, expect, it } from "vitest";
import {
  expoPushTokenSchema,
  formatReminderTime,
  notificationSettingsSchema,
  notificationTarget,
  reminderTimeOptions,
} from "./notification";

describe("Expo 푸시 토큰", () => {
  it("ExponentPushToken·ExpoPushToken 형식만 받는다", () => {
    expect(expoPushTokenSchema.safeParse("ExponentPushToken[abc123]").success).toBe(true);
    expect(expoPushTokenSchema.safeParse("ExpoPushToken[abc123]").success).toBe(true);
    expect(expoPushTokenSchema.safeParse("fcm-device-token").success).toBe(false);
    expect(expoPushTokenSchema.safeParse("ExponentPushToken[]").success).toBe(false);
  });
});

describe("알림 설정 응답", () => {
  it("백엔드 기본값을 그대로 받는다", () => {
    const body = { careReminderEnabled: true, careReminderTime: "09:00", timeZone: "Asia/Seoul" };
    expect(notificationSettingsSchema.parse(body)).toEqual(body);
  });

  it("30분 단위가 아닌 시각은 어긋난 응답으로 본다", () => {
    const body = { careReminderEnabled: true, careReminderTime: "09:15", timeZone: "Asia/Seoul" };
    expect(notificationSettingsSchema.safeParse(body).success).toBe(false);
  });
});

describe("알림 시각", () => {
  it("하루를 30분 간격 48칸으로 나눈다", () => {
    const options = reminderTimeOptions();
    expect(options).toHaveLength(48);
    expect(options[0]).toBe("00:00");
    expect(options.at(-1)).toBe("23:30");
  });

  it("오전·오후로 읽기 쉽게 보여 준다", () => {
    expect(formatReminderTime("09:00")).toBe("오전 9시");
    expect(formatReminderTime("00:30")).toBe("오전 12시 30분");
    expect(formatReminderTime("12:00")).toBe("오후 12시");
    expect(formatReminderTime("21:30")).toBe("오후 9시 30분");
  });
});

describe("알림을 눌렀을 때 열 화면", () => {
  it("앱 안 경로만 받는다", () => {
    expect(notificationTarget({ url: "/pets/12" })).toBe("/pets/12");
    expect(notificationTarget({ url: "https://evil.example" })).toBeNull();
    expect(notificationTarget({ url: "//evil.example" })).toBeNull();
    expect(notificationTarget({ url: "pabom://home" })).toBeNull();
    expect(notificationTarget({ url: 3 })).toBeNull();
    expect(notificationTarget(undefined)).toBeNull();
  });
});
