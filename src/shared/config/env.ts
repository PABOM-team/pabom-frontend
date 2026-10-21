/** 쉼표로 적은 목록을 Set으로 */
const list = (value: string | undefined) =>
  new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

/**
 * NEXT_PUBLIC_API_LIVE에 적을 수 있는 묶음. 목업 핸들러 묶음(src/mocks/browser.ts)과 1:1이다.
 * - auth: 로그인·약관 동의 · user: 내 정보·회원 탈퇴 · species: 종·모프·관리 가이드라인
 * - pets: 개체 목록·등록·상세·수정·삭제 · routine: 체크 리스트·완료/건너뛰기/미루기·오늘 할 일
 * - record: 기록 목록·추가·상세·정정·삭제·복구 · file: 사진 업로드·조회 주소
 * 인계 카드·개체 상태 바꾸기는 스웨거에 없어 항상 목업이다
 */
export const API_LIVE_GROUPS = [
  "auth",
  "user",
  "species",
  "pets",
  "routine",
  "record",
  "file",
] as const;
export type ApiLiveGroup = (typeof API_LIVE_GROUPS)[number];

export const env = {
  /**
   * 브라우저가 API를 부르는 백엔드 주소. 배포에서는 반드시 넣는다 (예: https://api.pabom.app).
   * 로컬 개발에서 비워 두면 같은 주소의 /api/v1로 부르고, 개발 전용 프록시(src/app/api/v1)가
   * API_PROXY_TARGET 백엔드로 넘긴다.
   */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  apiMocking: process.env.NEXT_PUBLIC_API_MOCKING === "enabled",
  /** 목업 모드에서도 진짜 백엔드로 보내는 API 묶음 (API_LIVE_GROUPS). 비우면 전부 목업 */
  apiLive: list(process.env.NEXT_PUBLIC_API_LIVE) as Set<string>,
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
} as const;

/** 로그인을 목업으로 하는지 (목업 모드이면서 auth를 진짜로 보내지 않을 때) */
export const isAuthMocked = env.apiMocking && !env.apiLive.has("auth");

const liveMismatch = (a: ApiLiveGroup, b: ApiLiveGroup) =>
  env.apiMocking && env.apiLive.has(a) !== env.apiLive.has(b);

/**
 * 개체(pets)와 사진(file)이 한쪽만 진짜 백엔드면 서로 파일 ID를 몰라서,
 * 개체 등록·수정 화면에서 사진 칸을 숨긴다
 */
export const isPetPhotoDisabled = liveMismatch("pets", "file");

/**
 * 개체(pets)와 일정(routine)이 한쪽만 진짜 백엔드면 일정 쪽이 그 개체를 몰라서,
 * 등록 뒤 체크 리스트 화면 대신 개체 상세로 가고 단계가 바뀌어도 체크 리스트 토스트를 띄우지 않는다
 */
export const isRoutineDetached = liveMismatch("pets", "routine");
