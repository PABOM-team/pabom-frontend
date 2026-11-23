import {
  defineAnimation,
  Easing,
  type AnimationCallback,
  type AnimationObject,
} from "react-native-reanimated";

/**
 * 시트·창 움직임 값.
 *
 * 열림은 손으로 끌어 올리는 동작이 아니라 누르면 아래에서 '들어오는' 움직임이다. 그래서
 * - 멈춘 데서 출발하지 않는다. 이미 움직이던 것이 화면 안으로 들어오듯 첫 프레임부터 빠르게 움직이고
 *   감속만 한다 (Material: 들어오는 요소는 decelerate. 멈춘 데서 출발하는 스프링은 첫 2~3프레임이
 *   거의 안 움직여 '눌렀는데 늦게 뜬다'로 읽힌다)
 * - 꼬리를 짧게 끊는다. iOS 시트 곡선(0.5s)과 출발 속도는 비슷하고, 99% 지점은 0.24s 로 당긴다
 * - 끝나는 시각이 정해진 닫힌 꼴이라 뒤따르는 일(닫힌 뒤 실행)이 늦어지지 않는다
 *
 * 닫힘은 열림보다 짧다. 손으로 끌어 내릴 때만 손 속도를 이어받는다 (WWDC18 Designing Fluid Interfaces)
 */

/** 임계 감쇠 스프링의 강성(rad/s)과 출발 속도(진행도/s). x(t) = 1 − (1 + (ω − v₀)t)·e^(−ωt) */
const OPEN_OMEGA = 26;
const OPEN_VELOCITY = 9;
export const SHEET_OPEN_MS = 300;

const openCurve = (seconds: number) => {
  "worklet";
  return 1 - (1 + (OPEN_OMEGA - OPEN_VELOCITY) * seconds) * Math.exp(-OPEN_OMEGA * seconds);
};
const OPEN_END = openCurve(SHEET_OPEN_MS / 1000);

/** 시간 비율(0~1) → 진행도(0~1). withTiming 의 easing 으로 쓴다 */
export const sheetOpenEasing = (ratio: number) => {
  "worklet";
  return openCurve((ratio * SHEET_OPEN_MS) / 1000) / OPEN_END;
};

export const SHEET_CLOSE_MS = 220;
export const sheetCloseEasing = Easing.out(Easing.cubic);

/** 그려진 한 프레임에 애니메이션 시계가 나아갈 수 있는 최대 시간 (60Hz 한 프레임 16.7ms 보다 조금 길게) */
const MAX_STEP_MS = 20;

/**
 * 프레임이 밀려도 건너뛰지 않는 timing.
 * withTiming 은 벽시계를 따라가서, 시트 내용이 처음 그려지느라 메인 스레드가 0.1~0.3초 멈추면 그 사이를
 * 통째로 건너뛰어 시트가 '탁' 하고 다 올라온 채 나타난다 (처음 여는 시트에서 프레임이 끊겨 보이는 원인).
 * 여기서는 그려진 프레임마다 시계를 최대 20ms 만 돌려, 멈춘 만큼 늦게 끝날 뿐 움직임은 한 칸씩 이어진다
 */
export const withSteadyTiming = (
  toValue: number,
  durationMs: number,
  easing: (ratio: number) => number,
  callback?: AnimationCallback,
): number => {
  "worklet";
  return defineAnimation<AnimationObject<number>>(toValue, () => {
    "worklet";
    return {
      onStart: (animation: AnimationObject<number>, value: number, now: number) => {
        animation.startValue = value;
        animation.elapsed = 0;
        animation.last = now;
        animation.current = value;
      },
      onFrame: (animation: AnimationObject<number>, now: number) => {
        animation.elapsed += Math.min(Math.max(now - animation.last, 0), MAX_STEP_MS);
        animation.last = now;
        if (animation.elapsed >= durationMs) {
          animation.current = toValue;
          return true;
        }
        const from = animation.startValue ?? 0;
        animation.current = from + (toValue - from) * easing(animation.elapsed / durationMs);
        return false;
      },
      current: toValue,
      callback,
      // 동작 줄이기는 시트가 따로 처리한다 (미끄러지는 대신 스며든다)
      reduceMotion: false,
    };
  }) as unknown as number;
};

/** 끌다 놓았는데 닫지 않을 때 제자리로 (손 속도를 이어받는 임계 감쇠 스프링) */
export const SHEET_SETTLE = { mass: 1, stiffness: 26 * 26, damping: 2 * 26 } as const;

/** 가운데 창·떠 있는 메뉴 (RN Animated.spring, 임계 감쇠: damping = 2√stiffness) */
export const POPUP_OPEN = { stiffness: 900, damping: 2 * Math.sqrt(900), mass: 1 } as const;
export const POPUP_CLOSE = { stiffness: 1400, damping: 2 * Math.sqrt(1400), mass: 1 } as const;

/**
 * 손을 뗀 뒤 그 속도로 계속 갔다면 멈췄을 거리 (iOS 기본 감속률 0.998/ms).
 * 시트가 이 투영 위치 기준 절반 넘게 내려가면 닫는다 — 짧게 튕겨도 닫히고 천천히 조금 끌면 돌아온다
 */
export const projectDistance = (velocity: number) => {
  "worklet";
  const rate = 0.998;
  return ((velocity / 1000) * rate) / (1 - rate);
};

/** 끝을 넘겨 끌 때의 고무줄 저항 (iOS 스크롤 끝과 같은 식) */
export const rubberBand = (distance: number, dimension: number) => {
  "worklet";
  const c = 0.55;
  return (1 - 1 / ((distance * c) / dimension + 1)) * dimension;
};
