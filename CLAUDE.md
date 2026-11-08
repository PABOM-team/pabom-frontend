@AGENTS.md

# 프로젝트 규칙

- 패키지 매니저는 pnpm 워크스페이스. `apps/web`(Next.js), `apps/mobile`(Expo), `packages/core`(`@pabom/core`, 공통). 스크립트와 구조는 README.md 참고.
- 레이어: 웹은 `app → features → entities → shared`, core는 `entities → api → domain · config · lib · design`. 아래 레이어에서 위 레이어를 import하지 않는다.
- `packages/core`에는 React DOM, `next/*`, `react-native`를 import하지 않는다. 웹·앱이 함께 쓴다. 화면 로직이 아닌 것(스키마·API·쿼리·표시 문자열)은 core에 둔다.
- 웹에서 공통 코드는 `@pabom/core/<폴더>/<파일>`로 가져온다. `@/shared/*`는 웹 전용(ui·lib)만.
- 데이터는 백엔드 REST API(`packages/core/src/api/client.ts`)로만 주고받는다. Server Actions를 비즈니스 API로 쓰지 않는다.
- API 응답은 zod 스키마(`packages/core/src/domain`)로 검증한다. orval 생성물(`packages/core/src/api/generated`)은 직접 고치지 않는다.
- 환경 변수는 `process.env.NEXT_PUBLIC_X ?? process.env.EXPO_PUBLIC_X`처럼 글자 그대로 적는다 (`packages/core/src/config/env.ts`).
- UI는 플랫폼별로 그린다. 색·글자 크기·반경·그림자 값은 `packages/core/src/design/tokens.ts`에서만. 바꾸면 `pnpm tokens:build`로 `apps/web/src/app/tokens.css`를 다시 만들어 함께 커밋한다. `tokens.css`는 직접 고치지 않는다.
- shadcn 컴포넌트는 `apps/web/src/shared/ui`에 추가된다 (`apps/web/components.json`).
- 앱 의존성은 `pnpm --filter mobile exec expo install <패키지>`로 추가한다. `react`·`@tanstack/react-query` 버전은 웹·앱이 같아야 한다 (hoisted node_modules).
- MVP 지원 종은 크레스티드 게코, 레오파드 게코 두 가지다. 볼파이톤은 제외.
- 커밋 전에 루트에서 `pnpm typecheck && pnpm lint && pnpm test:run`을 통과시킨다.
