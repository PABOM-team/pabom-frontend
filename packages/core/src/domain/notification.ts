import { z } from "zod";

/**
 * 앱 푸시 알림 (백엔드 PABOM-team/backend#60 토큰 등록·해제, #61 알림 설정).
 * 서버는 Expo Push Service로 보내므로 앱은 Expo 푸시 토큰(ExponentPushToken[...])을 등록한다
 */

export const PUSH_PLATFORMS = ["IOS", "ANDROID"] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

/** 운영 앱(app.pabom.mobile)과 개발 앱(app.pabom.mobile.dev)을 서버가 구분할 수 있게 같이 보낸다 */
export const APP_VARIANTS = ["PRODUCTION", "DEVELOPMENT"] as const;
export type AppVariant = (typeof APP_VARIANTS)[number];

/** Expo 푸시 토큰 모양. 예전 형식(ExpoPushToken[...])도 받는다 */
export const expoPushTokenSchema = z.string().regex(/^Expo(nent)?PushToken\[.+\]$/);

export type PushTokenInput = {
  token: string;
  platform: PushPlatform;
  appVariant: AppVariant;
};

/** 케어 알림을 받을 수 있는 시각 간격(분). 서버 스케줄러가 이 간격으로 돈다 */
export const REMINDER_STEP_MINUTES = 30;
export const DEFAULT_REMINDER_TIME = "09:00";

const reminderTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .refine((time) => Number(time.slice(3)) % REMINDER_STEP_MINUTES === 0, {
    message: `${REMINDER_STEP_MINUTES}분 단위로만 고를 수 있어요`,
  });

/** 알림 설정 (#61). 설정이 없는 회원도 서버가 기본값(켜짐·09:00·Asia/Seoul)으로 준다 */
export const notificationSettingsSchema = z.object({
  careReminderEnabled: z.boolean(),
  /** HH:mm, 회원 시간대 기준 */
  careReminderTime: reminderTimeSchema,
  /** IANA 시간대 이름 (Asia/Seoul) */
  timeZone: z.string().min(1),
});
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type NotificationSettingsInput = Partial<NotificationSettings>;

/** 하루를 REMINDER_STEP_MINUTES 간격으로 나눈 시각 목록 (00:00 ~ 23:30) */
export function reminderTimeOptions() {
  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += REMINDER_STEP_MINUTES) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    options.push(`${hh}:${mm}`);
  }
  return options;
}

/** 09:00 → 오전 9시, 21:30 → 오후 9시 30분 */
export function formatReminderTime(time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const period = hours < 12 ? "오전" : "오후";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${hour12}시${minutes ? ` ${minutes}분` : ""}`;
}

/**
 * 알림을 눌렀을 때 열 화면 주소 (서버가 data.url 에 넣는다).
 * 푸시 내용은 밖에서 오는 값이라 앱 안 경로(/로 시작, //·스킴 없음)만 받는다
 */
export function notificationTarget(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const url = (data as { url?: unknown }).url;
  if (typeof url !== "string") return null;
  if (!url.startsWith("/") || url.startsWith("//") || url.includes("://")) return null;
  return url;
}
