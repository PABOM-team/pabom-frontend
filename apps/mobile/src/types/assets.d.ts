/** Metro 가 자산 파일을 모듈 번호로 바꿔 준다 (expo-font 의 source 로 그대로 넘긴다) */
declare module "*.otf" {
  const source: number;
  export default source;
}
declare module "*.png" {
  const source: number;
  export default source;
}
