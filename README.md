# frontend

파봄 프론트엔드. 크레스티드 게코·레오파드 게코 관리 일정과 기록을 다루는 **웹(PWA)과 앱(React Native)** 모노레포다.

```
apps/web/        Next.js 16 웹앱 (PWA). 지금 서비스 중인 것
apps/mobile/     Expo(React Native) 앱. 스모크 화면만 있는 뼈대
packages/core/   @pabom/core — 웹·앱이 함께 쓰는 도메인 스키마·API 클라이언트·쿼리·디자인 토큰
```

**화면(UI)은 플랫폼마다 따로 그리고, 데이터·업무 규칙·디자인 토큰은 `@pabom/core` 한 벌만 쓴다.**
웹은 Tailwind + shadcn, 앱은 React Native StyleSheet로 그리되 색·글자 크기·반경 값은 둘 다
`packages/core/src/design/tokens.ts`에서 가져온다. 자세한 것은 [packages/core/README.md](packages/core/README.md).

## 시작하기

Node 24, pnpm 11 기준. 루트에서 한 번 설치하면 세 패키지가 모두 설치된다.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

앱을 띄우려면 (Expo Go 또는 개발 빌드):

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
pnpm dev:mobile
```

### 웹 환경 변수 (`apps/web/.env.local`)

기본 설정은 **로그인·약관 동의만 개발 서버(`dev.api.pabom.app`)로, 나머지는 MSW 목업**이다.

| 변수                       | 뜻                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_PROXY_TARGET`         | 로컬 개발 전용. 브라우저가 같은 주소의 `/api/v1`을 부르면 Next 프록시가 이 백엔드로 넘긴다 (서버 전용)                                                                                                                                                                                                                  |
| `NEXT_PUBLIC_API_BASE_URL` | 브라우저가 부르는 백엔드 주소. **배포에서는 꼭 넣는다**(예: `https://api.pabom.app`). 로컬에서는 비워서 프록시를 탄다                                                                                                                                                                                                   |
| `NEXT_PUBLIC_API_MOCKING`  | `enabled`면 백엔드에 아직 없는 API를 MSW가 답한다 (`apps/web/src/mocks/handlers.ts`)                                                                                                                                                                                                                                    |
| `NEXT_PUBLIC_API_LIVE`     | 목업 모드에서도 진짜로 보낼 API 묶음. `auth` = 로그인·약관 동의, `user` = 내 정보·회원 탈퇴, `species` = 종·모프·관리 가이드라인, `pets` = 개체 목록·등록·상세·수정·삭제, `routine` = 체크 리스트·완료/건너뛰기/미루기·오늘 할 일, `record` = 기록, `file` = 사진. 비우면 전부 목업 (`packages/core/src/config/env.ts`) |

앱은 같은 변수를 `EXPO_PUBLIC_` 접두사로 받는다 (`apps/mobile/.env.example`). 앱에는 프록시와 MSW가 없어
`EXPO_PUBLIC_API_BASE_URL`을 항상 넣고 목업은 `disabled`로 둔다.

- 목업 로그인(`NEXT_PUBLIC_API_LIVE` 비움): **카카오 = 기록이 쌓인 기존 회원(유나)**, **구글 = 처음 가입하는 회원**(약관 → 개체 등록 흐름)
- 목업 데이터는 브라우저 localStorage(`pabom-mock-db`)에 저장된다. 브라우저 콘솔에서 `pabomMock.reset()`으로 초기화 (화면은 Figma 그대로 두려고 버튼을 두지 않는다)
- 진짜로 로그인한 회원은 목업에서 빈 계정으로 시작한다 (access 토큰의 회원 번호로 목업 계정을 만든다)
- 인계 카드 예시: `/share/DEMO2026`
- 스웨거에 있는 API를 전부 dev 백엔드로 보내려면 `NEXT_PUBLIC_API_LIVE=auth,user,species,pets,routine,record,file`.
  `pets`·`routine`·`record`·`file`은 같이 켠다. 한쪽만 켜면 개체·파일 ID를 서로 몰라서 사진 칸을 숨기고(`isPetPhotoDisabled`)
  등록 뒤 체크 리스트 대신 상세로 간다(`isRoutineDetached`)
- 백엔드 응답은 `packages/core/src/domain/backend.ts`(스웨거 모양 zod 스키마)로 받고 `packages/core/src/api/adapters.ts`가
  화면 모델(문자열 ID·소문자 값)로 바꾼다. 목업도 같은 모양(`apps/web/src/mocks/wire.ts`)으로 답해서 두 모드가 같은 어댑터를 탄다. 백엔드가 아직 주지 않는 값(함께했던 개체 상태,
  오늘 할 일 수, 할 일 카드의 주기·원래 예정일, 먹이 이름)은 임시 값으로 보이고 `[백엔드 요청]`·`[백엔드 확인 필요]` 주석으로 표시했다
- 인계 카드와 개체 상태 바꾸기(함께했던 개체)는 스웨거에 없어 항상 목업이다
- 화면 흐름과 API 연결표: [docs/screen-flow.md](docs/screen-flow.md)

## 배포 환경

같은 코드를 환경 변수만 바꿔 세 곳에 배포한다. `NEXT_PUBLIC_` 값은 빌드할 때 들어가므로 바꾸면 다시 배포한다.
**모노레포라 배포 설정의 Root Directory를 `apps/web`으로 둔다** (Vercel이면 프로젝트 설정 → Root Directory).
설치는 저장소 루트의 `pnpm-lock.yaml`로 한 번에 된다.

| 환경            | 용도                             | `NEXT_PUBLIC_API_BASE_URL`  | `NEXT_PUBLIC_API_MOCKING` | `NEXT_PUBLIC_API_LIVE`                       |
| --------------- | -------------------------------- | --------------------------- | ------------------------- | -------------------------------------------- |
| 데모 서버       | 화면 시연. 백엔드 없이 전부 목업 | (비움)                      | `enabled`                 | (비움)                                       |
| 개발 서버 (dev) | 백엔드 연동. 없는 API만 목업     | `https://dev.api.pabom.app` | `enabled`                 | `auth,user,species,pets,routine,record,file` |
| 운영 서버       | 실서비스                         | `https://api.pabom.app`     | `disabled`                | (비움)                                       |

- 데모 서버는 로그인도 목업이라 카카오·구글 콘솔이나 백엔드 설정이 필요 없다. 데이터는 보는 사람 브라우저에만 저장된다
- 개발 서버는 백엔드 API가 생기는 대로 `NEXT_PUBLIC_API_LIVE`에 묶음을 늘리고, 다 생기면 목업을 끈다

## 로그인 (백엔드 연동)

1. 버튼을 누르면 `GET /auth/{provider}/login-url`로 카카오·구글 주소를 받는다. 이때 state 쿠키가 같이 온다
2. 카카오·구글이 백엔드에 설정된 Redirect URI로 돌려보낸다
3. Redirect URI가 이 웹의 `/api/v1/auth/{provider}/callback`이면 `apps/web/src/app/api/v1/auth/[provider]/callback/route.ts`가
   code·state를 붙여 `/auth/callback/{provider}` 화면으로 보낸다 (백엔드가 Redirect URI 끝을 이 경로로 정해 두어서)
4. 그 화면이 `GET /auth/{provider}/callback`을 부른다. 기존 회원은 access 토큰과 refresh 쿠키를 받아 홈으로,
   새 회원은 가입 토큰으로 약관 동의(`POST /me/agreements`) 뒤 개체 등록으로

**프록시(`apps/web/src/app/api/v1`)는 로컬 개발(`pnpm dev`)에서만 동작한다.** localhost에서 백엔드를 바로 부르면 백엔드 CORS가 배포 웹 주소만
허용해 403이 나고, refresh·state 쿠키가 `SameSite=Lax`라 다른 사이트에서는 저장되지 않기 때문이다. 배포에서는 웹과 백엔드가 같은
사이트라 브라우저가 `NEXT_PUBLIC_API_BASE_URL`로 백엔드를 바로 부르고, 프록시 경로는 404를 준다 (콜백 경로의 화면 이동만 남는다).

**Redirect URI.** dev 백엔드의 Redirect URI는 `https://dev.pabom.app/api/v1/auth/{provider}/callback`이다 (2026-10-18 확인).
그래서 개발 서버(dev.pabom.app) 배포에서는 로그인이 끝까지 된다. 콜백 응답(가입 토큰·access 토큰)은 개발자 도구 Network 탭의
`dev.api.pabom.app/api/v1/auth/{provider}/callback` 요청에서 볼 수 있다. 로컬(`pnpm dev`)에서 끝까지 하려면 dev 서버의
`KAKAO_REDIRECT_URI`·`GOOGLE_REDIRECT_URI`를 `http://localhost:3000/api/v1/auth/{provider}/callback`으로 바꾸고
카카오 디벨로퍼스·Google Cloud 콘솔에 같은 주소를 등록해야 한다 (지금은 로컬에서 로그인해도 dev.pabom.app으로 돌아가고,
state 쿠키는 localhost 쪽에 있어서 맞지 않는다).

## 스크립트

루트에서 실행한다. 패키지 하나만 돌리려면 `pnpm --filter web <명령>` / `--filter mobile` / `--filter @pabom/core`.

| 명령                | 설명                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`          | 웹 개발 서버 (서비스 워커 비활성, MSW 사용 가능)                           |
| `pnpm dev:https`    | 웹 로컬 HTTPS. 웹 푸시 테스트용                                            |
| `pnpm dev:mobile`   | Expo 개발 서버 (`expo start`). QR을 Expo Go로 읽거나 `a`/`i`로 에뮬레이터  |
| `pnpm build`        | 웹: `next build` 후 `serwist build`로 `public/sw.js` 생성                  |
| `pnpm typecheck`    | 세 패키지 모두 `tsc` (웹은 라우트 타입 생성 포함)                          |
| `pnpm lint`         | oxlint, 저장소 전체 (`.oxlintrc.json`)                                     |
| `pnpm format`       | Prettier, 저장소 전체 (Tailwind 클래스 정렬 포함)                          |
| `pnpm test`         | Vitest (watch). CI에서는 `pnpm test:run` (core → web 순서)                 |
| `pnpm test:e2e`     | 웹 Playwright (모바일 Chrome / Safari 뷰포트)                              |
| `pnpm api:generate` | OpenAPI → 타입·TanStack Query 훅 생성 (`OPENAPI_URL=…`), `packages/core`에 |
| `pnpm tokens:build` | 디자인 토큰(`tokens.ts`) → 웹 Tailwind 테마(`apps/web/src/app/tokens.css`) |

## 스택

공통(`@pabom/core`)

- **TypeScript strict**, **Zod** (API 응답·폼 스키마), **ky** (HTTP), **TanStack Query** (서버 상태), **date-fns**
- **orval** (OpenAPI 코드 생성). 생성물은 `packages/core/src/api/generated`

웹(`apps/web`)

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS v4 + shadcn/ui** (Radix). 컴포넌트는 `pnpm dlx shadcn@latest add <name>` → `apps/web/src/shared/ui`
- **React Hook Form** (폼) / **Zustand** (필요할 때만 클라이언트 상태)
- **MSW** (API 목), **Serwist** (서비스 워커, 오프라인, 웹 푸시)
- **Vitest + Testing Library**, **Playwright**
- 폰트: Pretendard Variable (`next/font/local`)

앱(`apps/mobile`)

- **Expo SDK 58 + React Native 0.88**, **Expo Router** (`src/app/` 파일 기반 라우팅)
- UI는 React Native `StyleSheet` + `@pabom/core/design/tokens`. 라이브러리 선택(NativeWind 등)은 아직 열려 있다
- 의존성 추가는 `pnpm --filter mobile exec expo install <패키지>` (SDK에 맞는 버전을 고른다)

## 폴더 구조

FSD(Feature-Sliced Design)를 간소화해서 쓴다. 위 레이어는 아래 레이어만 import할 수 있다.

```
packages/core/src/            @pabom/core — 웹·앱 공통. entities → api → domain · config · lib · design
  domain/     zod 스키마 + 순수 업무 규칙
  api/        ky 클라이언트(토큰 재발급)·endpoints·adapters·query-keys·query-client
  entities/   queryOptions + 표시용 순수 함수 (pet, routine, record, task, species, session, handover)
  config/     env (NEXT_PUBLIC_* ?? EXPO_PUBLIC_*)
  lib/        date, josa
  design/     tokens (팔레트·타이포·반경·그림자)

apps/web/src/                 Next.js. app → features → entities → shared
  app/        라우팅, 레이아웃, 화면 조립  — (public) 로그인 전, (app) 로그인 후, (app)/(tabs) 오늘·개체·설정
  features/   사용자 행동 단위             — auth, pet-form, task-actions, record-editor, routine-editor, pet-lifecycle, handover
  entities/   웹 UI(PetCard·TaskCard·RecordRow) + core 의 쿼리를 다시 내보냄
  shared/     웹 전용 — ui(shadcn), lib(cn·image)
  mocks/      MSW 핸들러 + 목업 DB(db.ts) + 업무 규칙 흉내(logic.ts)

apps/mobile/src/              Expo Router. 같은 레이어 구조로 키운다
  app/        화면 (_layout.tsx 가 QueryClientProvider)
```

웹 코드에서 공통 코드는 `@pabom/core/domain/pet`, `@pabom/core/api/endpoints` 처럼 가져온다.
`@/shared/...`는 웹 전용(ui·lib)만 남아 있다.

## 웹·앱 공통 규칙

1. **데이터는 항상 백엔드 REST API로.** Server Actions와 Route Handler를 비즈니스 API로 쓰지 않는다.
   `apps/web/src/app/api/v1`은 로컬 개발에서만 요청을 백엔드로 그대로 넘기는 프록시일 뿐이다.
2. **`packages/core`는 React DOM·Next·React Native에 의존하지 않는다.** 브라우저 전용 전역(`sessionStorage`·`navigator.onLine`)은
   있을 때만 쓴다. 화면 로직이 아닌 것(스키마·API·쿼리·표시 문자열 만들기)은 core 에 두고 두 앱이 가져다 쓴다.
3. **UI는 플랫폼별로 그린다.** 웹은 Tailwind + shadcn, 앱은 React Native. 다만 색·글자 크기·반경·그림자 **값**은
   `packages/core/src/design/tokens.ts` 한 곳에서 가져온다. 토큰을 바꾸면 `pnpm tokens:build`로 웹 `tokens.css`를 다시 만들어 함께 커밋한다.
4. 주요 화면(홈, 개체)은 클라이언트에서 데이터를 가져온다(TanStack Query). SSR에 의존하는 로직을 늘리지 않는다.
5. **react·@tanstack/react-query 버전은 웹·앱이 같아야 한다.** `pnpm-workspace.yaml`의 `nodeLinker: hoisted`로 루트 node_modules 한 벌을
   쓰므로, 버전이 갈리면 React가 두 벌 번들돼 앱이 죽는다. Expo SDK를 올릴 때 웹 `react`·`react-dom`도 같은 버전으로 맞춘다.

## 앱에서 아직 안 되는 것

- **로그인.** 웹은 카카오·구글이 `/api/v1/auth/{provider}/callback`으로 돌려보내지만, 앱은 `expo-web-browser` + 딥링크(`pabom://`)로
  받아야 한다. 백엔드에 앱용 Redirect URI가 필요하다.
- **세션 저장.** `apps/web`은 `sessionStorage`를 쓰고, 앱은 `configureSessionStorage()`(`@pabom/core/api/session`)에
  `expo-secure-store` 어댑터를 끼워야 한다. 지금은 메모리에만 있다.
- **사진.** 웹의 `resizeImage`(canvas)는 앱에 없다. `expo-image-manipulator`로 같은 규칙(긴 변 1600px·JPEG 0.85)을 구현한다.
- **MSW 목업·웹 푸시**는 웹 전용이다.

## 화면 틀 (웹)

모바일 웹앱이라 화면 틀(`apps/web/src/shared/ui/app-shell.tsx`)이 최대 430px로 고정된다. 768px 이상에서는 가운데 정렬,
1024px 이상에서는 왼쪽에 파봄 소개와 QR을 띄운다. 시트·창·토스트는 화면 틀 안에서만 뜬다(`PortalContainerContext`).
