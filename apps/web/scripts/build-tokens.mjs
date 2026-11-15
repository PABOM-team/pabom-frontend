// @ts-check
/**
 * @pabom/core 의 디자인 토큰으로 Tailwind v4 @theme 블록(src/app/tokens.css)을 만든다.
 * 실행: pnpm --filter web tokens:build  (Node 24는 .ts를 바로 import한다)
 * 토큰을 바꾸면 다시 실행해서 tokens.css를 함께 커밋한다.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  colors,
  radius,
  shadows,
  spacing,
  toCssShadow,
  typography,
} from "../../../packages/core/src/design/tokens.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../src/app/tokens.css");

/** @type {string[]} */
const lines = [];
const push = (/** @type {string} */ line = "") => lines.push(line);

push(
  "/* 자동 생성 파일. 고치지 말고 packages/core/src/design/tokens.ts 를 바꾼 뒤 `pnpm tokens:build` */",
);
push("@theme {");
push("  /* ---- Color / 팔레트 ---- */");
for (const [name, scale] of Object.entries(colors)) {
  if (typeof scale === "string") continue;
  if ("background" in scale) continue;
  for (const [step, hex] of Object.entries(scale)) push(`  --color-${name}-${step}: ${hex};`);
  push();
}
push(`  --color-kakao-brand: ${colors.kakao.background};`);
push(`  --color-kakao-brand-foreground: ${colors.kakao.foreground};`);
push();

push("  /* ---- Typography: title 은 bold · 행간 120% · 자간 -3%, body 는 굵기를 따로 ---- */");
for (const [group, sizes] of Object.entries(typography)) {
  for (const [size, token] of Object.entries(sizes)) {
    const key = `--text-${group}-${size}`;
    push(`  ${key}: ${token.fontSize}px;`);
    push(`  ${key}--line-height: ${token.lineHeight};`);
    push(`  ${key}--letter-spacing: ${token.letterSpacing}em;`);
    if ("fontWeight" in token) push(`  ${key}--font-weight: ${token.fontWeight};`);
  }
  push();
}

push("  /* ---- Radius ---- */");
for (const [name, px] of Object.entries(radius)) {
  if (name === "full") continue;
  push(`  --radius-${name}: ${px}px;`);
}
// Tailwind 기본 단계(3xl·4xl)는 디자인 시스템 최대 반경(20)으로 묶는다
push(`  --radius-3xl: ${radius["2xl"]}px;`);
push(`  --radius-4xl: ${radius["2xl"]}px;`);
push();

push("  /* ---- Shadow ---- */");
for (const [name, shadow] of Object.entries(shadows))
  push(`  --shadow-${name}: ${toCssShadow(shadow)};`);
push("  --shadow-xl: var(--shadow-lg);");
push("  --shadow-2xl: var(--shadow-lg);");
push();

push("  /* ---- Grid: 모바일 375 기준 좌우 여백 ---- */");
push(`  --spacing-gutter: ${spacing.gutter}px;`);
push("}");
push();

writeFileSync(out, lines.join("\n"), "utf8");
console.log(`tokens.css 생성: ${out}`);
