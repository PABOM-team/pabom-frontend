import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Button } from "./button";
import { ExclamationCircleIcon } from "./icons";
import { Text, type TextVariant } from "./text";
import { alpha, colors, radius, semantic } from "./theme";

/** 동그란 사진. 사진이 없으면 회색 자리 */
export function Avatar({
  src,
  size = 52,
  style,
  children,
  /** 고른 상태의 파란 테두리 */
  ring = false,
}: {
  src?: string | null;
  size?: 28 | 38 | 52 | 56 | 64 | 72;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  ring?: boolean;
}) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        ring && styles.ring,
        style,
      ]}
    >
      {src ? (
        <Image source={{ uri: src }} alt="" style={styles.fill} resizeMode="cover" />
      ) : (
        children
      )}
    </View>
  );
}

/** 네모난 사진 자리 (Figma 이미지 자리: 점선 + '사진') */
export function PhotoBox({
  src,
  label = "사진",
  size = 48,
  style,
}: {
  src?: string | null;
  label?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.photoBox,
        { width: size, height: size },
        src && { borderStyle: "solid" },
        style,
      ]}
    >
      {src ? (
        <Image source={{ uri: src }} alt="" style={styles.fill} resizeMode="cover" />
      ) : (
        <Text variant="body-md" color={semantic.subtleForeground}>
          {label}
        </Text>
      )}
    </View>
  );
}

export type BadgeTone = "primary" | "info" | "success" | "warning" | "danger" | "contrast" | "hint";
export type BadgeSize = "sm" | "md" | "lg";
export type BadgeShape = "pill" | "square";

/** Figma Badge: 색 16% 바탕(hint 는 8%) + 같은 색 글자 */
const BADGE_TONE: Record<BadgeTone, { background: string; text: string }> = {
  primary: { background: alpha(semantic.primary, 0.16), text: semantic.primary },
  info: { background: alpha(semantic.info, 0.16), text: semantic.info },
  success: { background: alpha(semantic.success, 0.16), text: semantic.success },
  warning: { background: alpha(semantic.warning, 0.16), text: semantic.warning },
  danger: { background: alpha(semantic.destructive, 0.16), text: semantic.destructive },
  contrast: { background: alpha(colors.gray[800], 0.16), text: colors.gray[800] },
  hint: { background: alpha(colors.gray[500], 0.08), text: colors.gray[500] },
};

/** sm 20px/10 · md 24px/12 · lg 32px/14 */
const BADGE_SIZE: Record<
  BadgeSize,
  { height: number; paddingHorizontal: number; text: TextVariant }
> = {
  sm: { height: 20, paddingHorizontal: 6, text: "body-sm" },
  md: { height: 24, paddingHorizontal: 8, text: "body-md" },
  lg: { height: 32, paddingHorizontal: 12, text: "body-lg" },
};

/** 작은 배지 (Figma Badge) */
export function Badge({
  tone = "hint",
  size = "sm",
  shape = "pill",
  children,
  style,
  faded = false,
}: {
  tone?: BadgeTone;
  size?: BadgeSize;
  shape?: BadgeShape;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 완료한 할 일의 개체 배지처럼 흐리게 */
  faded?: boolean;
}) {
  const look = BADGE_TONE[tone];
  const dims = BADGE_SIZE[size];
  return (
    <View
      style={[
        styles.badge,
        {
          height: dims.height,
          paddingHorizontal: dims.paddingHorizontal,
          borderRadius: shape === "pill" ? radius.full : radius.md,
          backgroundColor: look.background,
        },
        faded && { opacity: 0.6 },
        style,
      ]}
    >
      <Text variant={dims.text} weight="medium" color={look.text} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export function Spinner({
  style,
  label = "불러오는 중",
  size = "small",
}: {
  style?: StyleProp<ViewStyle>;
  label?: string;
  size?: "small" | "large";
}) {
  return (
    <ActivityIndicator
      accessibilityLabel={label}
      color={semantic.primary}
      size={size}
      style={style}
    />
  );
}

/** 회색 자리 (불러오는 동안). 숨 쉬듯 깜빡인다 */
export function Skeleton({
  height,
  width,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
}) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        styles.skeleton,
        { opacity },
        height !== undefined && { height },
        width !== undefined && { width },
        style,
      ]}
    />
  );
}

/** 회색 안내 상자 (기록 방식 안내, 면책 문구 등) */
export function InfoBox({
  children,
  tone = "gray",
  style,
  textVariant = "body-md",
}: {
  children: ReactNode;
  tone?: "gray" | "primary";
  style?: StyleProp<ViewStyle>;
  textVariant?: TextVariant;
}) {
  return (
    <View
      style={[
        styles.infoBox,
        { backgroundColor: tone === "gray" ? semantic.muted : semantic.primarySoft },
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text variant={textVariant} color={semantic.secondaryText} style={styles.relaxed}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

type StateAction = { label: string; onPress: () => void; variant?: "primary" | "outline" };

/**
 * 화면·영역 오류와 빈 상태 (C1).
 * compact면 Figma C1처럼 작은 버튼 하나(빈 화면은 파랑, 오류는 테두리)
 */
export function StateMessage({
  title,
  description,
  icon,
  action,
  secondaryAction,
  compact = false,
  style,
}: {
  title: string;
  description?: string;
  /** null 이면 아이콘 자리를 없앤다 */
  icon?: ReactNode | null;
  action?: StateAction;
  secondaryAction?: StateAction;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const renderAction = (a: StateAction, fallback: "primary" | "outline", first: boolean) => (
    <Button
      variant={(a.variant ?? fallback) === "primary" ? "default" : "outline"}
      size={compact ? "md" : "lg"}
      style={
        compact
          ? { marginTop: 16, paddingHorizontal: 16 }
          : { width: 216, marginTop: first ? 20 : 8 }
      }
      onPress={a.onPress}
    >
      {a.label}
    </Button>
  );

  return (
    <View style={[styles.state, style]}>
      {icon !== null ? (
        <View style={styles.stateIcon}>
          {icon ?? <ExclamationCircleIcon size={20} color={semantic.mutedForeground} />}
        </View>
      ) : null}
      <Text variant="body-xl" weight="semibold" align="center">
        {title}
      </Text>
      {description ? (
        <Text
          variant="body-lg"
          color={semantic.mutedForeground}
          align="center"
          style={[styles.relaxed, { marginTop: 6 }]}
        >
          {description}
        </Text>
      ) : null}
      {action ? renderAction(action, "primary", true) : null}
      {secondaryAction ? renderAction(secondaryAction, "outline", false) : null}
    </View>
  );
}

/** 가로 정보 줄 (생애 단계 · 어린 개체) */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="body-lg" color={semantic.mutedForeground} style={styles.infoRowLabel}>
        {label}
      </Text>
      <View style={styles.infoRowValue}>
        {typeof children === "string" ? <Text variant="body-lg">{children}</Text> : children}
      </View>
    </View>
  );
}

/** 단계 표시 (1/4 · 분류 + 막대) */
export function StepProgress({
  step,
  total,
  label,
}: {
  step: number;
  total: number;
  label: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="body-lg" weight="semibold" color={semantic.primary}>
        {step}/{total} · {label}
      </Text>
      <View style={styles.progress} accessibilityElementsHidden>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.progressBar,
              { backgroundColor: i < step ? semantic.primary : colors.gray[200] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/** 칸 나눔 탭 (이용약관 / 개인정보 처리방침, 8월 / 9월 / 10월) */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  minItemWidth,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** 달 탭처럼 칸이 많을 때 최소 너비 */
  minItemWidth?: number;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.segmented}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              index > 0 && styles.segmentDivider,
              selected && { backgroundColor: semantic.primarySoft },
              minItemWidth !== undefined && { minWidth: minItemWidth },
            ]}
          >
            <Text
              variant="body-lg"
              weight={selected ? "semibold" : "regular"}
              color={selected ? semantic.primary : semantic.foreground}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 불러오기 실패 (C1-2). Figma에 따로 화면이 없는 목록·상세의 실패도 이 모양으로 */
export function LoadError({
  onRetry,
  style,
}: {
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <StateMessage
      compact
      icon={
        <Text variant="body-xl" weight="bold" color={semantic.mutedForeground}>
          !
        </Text>
      }
      title="불러오지 못했어요"
      description="인터넷 연결을 확인하고 다시 시도해 주세요."
      action={{ label: "다시 불러오기", onPress: onRetry, variant: "outline" }}
      style={style}
    />
  );
}

/** 테두리 둥근 카드 (할 일·개체 카드 바탕) */
export function Card({
  children,
  style,
  dashed = false,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  dashed?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (!onPress) {
    return <View style={[styles.card, dashed && styles.dashed, style]}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        dashed && styles.dashed,
        pressed && { backgroundColor: semantic.muted },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** 목록 구분선 */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%" },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: semantic.input,
    backgroundColor: semantic.placeholder,
    flexShrink: 0,
  },
  ring: { borderWidth: 2.5, borderColor: semantic.primary },
  photoBox: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: semantic.input,
    backgroundColor: semantic.placeholder,
    flexShrink: 0,
  },
  badge: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  skeleton: { borderRadius: radius.lg, backgroundColor: semantic.muted, height: 20 },
  infoBox: { borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  relaxed: { lineHeight: 20 },
  state: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 40 },
  stateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.muted,
    marginBottom: 12,
  },
  infoRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  infoRowLabel: { width: 104, flexShrink: 0 },
  infoRowValue: { flex: 1, minWidth: 0 },
  progress: { flexDirection: "row", gap: 4 },
  progressBar: { height: 3, flex: 1, borderRadius: radius.full },
  segmented: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: semantic.input,
  },
  segment: {
    height: 36,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.background,
  },
  segmentDivider: { borderLeftWidth: 1, borderLeftColor: semantic.input },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1.3,
    borderColor: semantic.input,
    backgroundColor: semantic.background,
  },
  dashed: { borderStyle: "dashed" },
  divider: { height: 1, backgroundColor: semantic.border },
});
