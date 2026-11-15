# @pabom/core

웹(`apps/web`, Next.js)과 앱(`apps/mobile`, Expo)이 함께 쓰는 코드. **React DOM·Next·React Native를 import하지 않는다.**
소스(`src/*.ts`)를 그대로 내보내고 각 앱의 번들러가 컴파일한다 (빌드 단계 없음).

```
src/
  domain/     zod 스키마 + 순수 업무 규칙 (종·개체·루틴·기록·오늘 할 일·체중 단계)
  api/        ky 클라이언트(토큰 재발급), 엔드포인트, 백엔드→화면 모델 어댑터, 쿼리 키, QueryClient
  entities/   TanStack Query queryOptions + 표시용 순수 함수 (UI 컴포넌트는 각 앱에)
  config/     환경 변수 (NEXT_PUBLIC_* 또는 EXPO_PUBLIC_*)
  lib/        날짜 표시, 조사(을/를)
  design/     디자인 토큰 (팔레트·타이포·반경·그림자). 웹 Tailwind 테마와 앱 StyleSheet가 같은 값을 쓴다
```

레이어: `entities → api → domain · config · lib · design`. 아래가 위를 import하지 않는다.

- 가져오기: `@pabom/core/domain/pet`, `@pabom/core/api/endpoints`, `@pabom/core/entities/species` 처럼 파일 경로로.
- 브라우저 전용 API(`sessionStorage`, `navigator.onLine`)는 있을 때만 쓰고 없으면 조용히 건너뛴다.
  앱은 `configureSessionStorage`(`api/session.ts`)로 저장소를 끼운다.
- 환경 변수는 `process.env.NEXT_PUBLIC_X ?? process.env.EXPO_PUBLIC_X` 처럼 **글자 그대로** 적는다.
  두 번들러 모두 글자 그대로 적힌 곳만 빌드 때 값으로 바꾼다.
- 디자인 토큰을 바꾸면 `pnpm --filter web tokens:build`로 웹 `tokens.css`를 다시 만든다.
