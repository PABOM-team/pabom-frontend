import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Button } from "./button";
import { ChevronDownIcon, ChevronUpIcon, ExclamationCircleIcon } from "./icons";
import { SurfaceProvider, useSurface, type Surface } from "./surface";
import { Text, type TextVariant } from "./text";
import { alpha, colors, radius, semantic } from "./theme";

export { Spinner } from "./spinner";

/** 바탕에 따라 그 위에 올릴 면 색 (회색 화면 → 흰색, 흰 바탕 → gray-100) */
const raised = (surface: Surface) => (surface === "gray" ? semantic.card : semantic.secondary);
/** 그 면을 눌렀을 때 */
const raisedPressed = (surface: Surface) =>
  surface === "gray" ? semantic.secondary : colors.gray[200];

/** 동그란 사진 (Figma 아바타 28·38·52·56·72). 사진이 없으면 primary-100 자리 */
export function Avatar({
  src,
  size = 52,
  style,
  children,
  /** 고른 상태의 파란 테두리 */
  ring = false,
}: {
  src?: string | null;
  size?: 28 | 38 | 40 | 52 | 56 | 64 | 72;
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

/** 네모난 사진 (Figma 이미지 자리, 모서리 12). 사진이 없으면 점선 + '사진' */
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
      style={[styles.photoBox, !src && styles.photoBoxEmpty, { width: size, height: size }, style]}
    >
      {src ? (
        <Image source={{ uri: src }} alt="" style={styles.fill} resizeMode="cover" />
      ) : (
        <Text variant="body-md" weight="medium" color={semantic.subtleForeground}>
          {label}
        </Text>
      )}
    </View>
  );
}

/**
 * hint 회색 · contrast 검정 · primary 파랑 테두리 · outline 회색 테두리 (Figma 배지).
 * pet 은 Figma 개체 태그(primary-50 바탕 + 파란 semibold 글자).
 * info·success·warning·danger 는 색 16% 바탕
 */
export type BadgeTone =
  "pet" | "primary" | "info" | "success" | "warning" | "danger" | "contrast" | "hint" | "outline";
export type BadgeSize = "sm" | "md" | "lg";
export type BadgeShape = "pill" | "square";

const BADGE_TONE: Record<BadgeTone, { background: string; text: string; border?: string }> = {
  hint: { background: semantic.secondary, text: semantic.secondaryText },
  pet: { background: semantic.primarySoft, text: semantic.primary },
  contrast: { background: semantic.inverse, text: semantic.inverseForeground },
  primary: { background: "transparent", text: semantic.primary, border: semantic.primary },
  outline: {
    background: "transparent",
    text: semantic.secondaryText,
    border: semantic.subtleForeground,
  },
  info: { background: alpha(semantic.info, 0.16), text: semantic.info },
  success: { background: alpha(semantic.success, 0.16), text: semantic.success },
  warning: { background: alpha(semantic.warning, 0.16), text: semantic.warning },
  danger: { background: alpha(semantic.destructive, 0.16), text: semantic.destructive },
};

/** sm 20px/12 (Figma 배지) · md 24px/12 · lg 32px/14 */
const BADGE_SIZE: Record<
  BadgeSize,
  { height: number; paddingHorizontal: number; text: TextVariant }
> = {
  sm: { height: 20, paddingHorizontal: 6, text: "body-md" },
  md: { height: 24, paddingHorizontal: 8, text: "body-md" },
  lg: { height: 32, paddingHorizontal: 12, text: "body-lg" },
};

/** 작은 배지 (Figma 배지) */
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
        look.border !== undefined && { borderWidth: 1, borderColor: look.border },
        faded && styles.faded,
        style,
      ]}
    >
      <Text
        variant={dims.text}
        weight={tone === "pet" ? "semibold" : "medium"}
        color={look.text}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

/** 회색 자리 (Figma 데이터 상태 · 스켈레톤). 숨 쉬듯 깜빡인다 */
export function Skeleton({
  height,
  width,
  shape = "block",
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  /** bar: 글 막대(완전 둥글게) · block: 카드·칸 덩어리(모서리 12) · circle: 사진 */
  shape?: "bar" | "block" | "circle";
  style?: StyleProp<ViewStyle>;
}) {
  const surface = useSurface();
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
        { opacity, backgroundColor: raised(surface) },
        shape === "bar" && { borderRadius: radius.full, height: 12 },
        shape === "circle" && { borderRadius: radius.full, width: 40, height: 40 },
        height !== undefined && { height },
        width !== undefined && { width },
        shape === "circle" && height !== undefined && { width: height },
        style,
      ]}
    />
  );
}

/** 자주 쓰는 스켈레톤 묶음 (Figma 스켈레톤: 목록 · 카드 · 폼) */
export function SkeletonGroup({
  kind,
  count,
  style,
}: {
  kind: "list" | "card" | "form";
  count?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const n = count ?? (kind === "list" ? 4 : 3);
  const items = Array.from({ length: n }, (_, i) => i);
  return (
    <View style={[styles.skeletonGroup, style]} accessibilityLabel="불러오는 중">
      {kind === "card" ? <Skeleton shape="bar" width={128} /> : null}
      {items.map((i) =>
        kind === "list" ? (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton shape="circle" height={40} />
            <View style={{ gap: 6 }}>
              <Skeleton shape="bar" width={170} />
              <Skeleton shape="bar" width={110} height={10} />
            </View>
          </View>
        ) : kind === "card" ? (
          <Skeleton key={i} height={54} />
        ) : (
          <View key={i} style={{ gap: 10 }}>
            <Skeleton shape="bar" width={80} />
            <Skeleton height={46} />
          </View>
        ),
      )}
    </View>
  );
}

/**
 * 안내 상자 (Figma 안내 상자: 회색 · 파랑). 모서리 12, 글자 body-md medium.
 * 회색은 회색 화면 위에서 흰색, 흰 바탕 위에서 gray-100
 */
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
  const surface = useSurface();
  return (
    <View
      style={[
        styles.infoBox,
        { backgroundColor: tone === "gray" ? raised(surface) : semantic.primarySoft },
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text
          variant={textVariant}
          weight="medium"
          color={tone === "gray" ? semantic.secondaryText : semantic.foreground}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

type StateAction = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "secondary";
};

/**
 * 화면 오류 · 빈 화면 (Figma 데이터 상태, C1).
 * 회색 동그라미 아이콘 · 제목 body-xl semibold · 설명 body-md · 버튼.
 * 빈 화면은 파란 버튼(primary), 오류는 회색 보조 버튼(outline·secondary)
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
  const surface = useSurface();
  const renderAction = (a: StateAction, fallback: StateAction["variant"], first: boolean) => {
    const kind = a.variant ?? fallback;
    return (
      <Button
        variant={kind === "primary" ? "default" : surface === "gray" ? "white" : "secondary"}
        size={compact ? "md" : "lg"}
        style={compact ? { marginTop: first ? 4 : 0 } : { width: 216, marginTop: first ? 12 : 0 }}
        onPress={a.onPress}
      >
        {a.label}
      </Button>
    );
  };

  return (
    <View style={[styles.state, compact && styles.stateCompact, style]}>
      {icon !== null ? (
        <View style={[styles.stateIcon, { backgroundColor: raised(surface) }]}>
          {icon ?? <ExclamationCircleIcon size={28} color={semantic.foreground} />}
        </View>
      ) : null}
      <Text variant="body-xl" weight="semibold" align="center">
        {title}
      </Text>
      {description ? (
        <Text
          variant="body-md"
          weight="medium"
          color={semantic.mutedForeground}
          align="center"
          style={styles.stateDescription}
        >
          {description}
        </Text>
      ) : null}
      {action ? renderAction(action, "primary", true) : null}
      {secondaryAction ? renderAction(secondaryAction, "outline", !action) : null}
    </View>
  );
}

/** 영역 오류 (Figma 데이터 상태 · 영역 오류). 화면 일부만 못 불러왔을 때 그 자리에 */
export function AreaError({
  message,
  onRetry,
  retryLabel = "다시 시도",
  style,
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const surface = useSurface();
  return (
    <View style={[styles.areaError, { backgroundColor: raised(surface) }, style]}>
      <Text variant="body-md" weight="medium" color={semantic.mutedForeground} align="center">
        {message}
      </Text>
      <Button variant={surface === "gray" ? "secondary" : "white"} size="md" onPress={onRetry}>
        {retryLabel}
      </Button>
    </View>
  );
}

/** 가로 정보 줄 (Figma 정보 줄: 라벨 96 · 값 · 아래 구분선) */
export function InfoRow({
  label,
  children,
  divider = true,
  style,
}: {
  label: string;
  children: ReactNode;
  /** 마지막 줄은 구분선 없이 */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.infoRow, divider && styles.infoRowDivider, style]}>
      <Text variant="body-lg" color={semantic.mutedForeground} style={styles.infoRowLabel}>
        {label}
      </Text>
      <View style={styles.infoRowValue}>
        {typeof children === "string" ? <Text variant="body-lg">{children}</Text> : children}
      </View>
    </View>
  );
}

/** 단계 머리 (Figma: 4px 막대 하나를 단계 수만큼 나눠 지난 칸까지 파랗게) */
export function StepProgress({
  step,
  total,
  label,
  showLabel = false,
  style,
}: {
  step: number;
  total: number;
  label: string;
  /** Figma 단계 머리는 막대만 있다. 글(1/4 · 분류)도 보여야 하면 true */
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[{ gap: 8 }, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${step}/${total} · ${label}`}
      accessibilityValue={{ min: 0, max: total, now: step }}
    >
      {showLabel ? (
        <Text variant="body-lg" weight="semibold" color={semantic.primary}>
          {step}/{total} · {label}
        </Text>
      ) : null}
      <View style={styles.progress}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.progressBar, i < step && { backgroundColor: semantic.primary }]}
          />
        ))}
      </View>
    </View>
  );
}

/** 칸 나눔 탭 (Figma 세그먼트 칸: 38px · 모서리 8 · 고르면 primary-50 + 파란 글자) */
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
  const surface = useSurface();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[styles.segmented, { backgroundColor: raised(surface) }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              pressed && !selected && { backgroundColor: raisedPressed(surface) },
              selected && { backgroundColor: semantic.primarySoft },
              minItemWidth !== undefined && { minWidth: minItemWidth },
            ]}
          >
            <Text
              variant="body-lg"
              weight={selected ? "semibold" : "medium"}
              color={selected ? semantic.primary : colors.gray[600]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 불러오기 실패 (Figma 데이터 상태 · 화면 오류) */
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
      title="불러오지 못했어요"
      description="인터넷 연결을 확인하고 다시 시도해 주세요."
      action={{ label: "다시 불러오기", onPress: onRetry, variant: "secondary" }}
      style={style}
    />
  );
}

/**
 * 둥근 카드 (모서리 20). 회색 화면 위에서는 흰 카드, 흰 바탕(시트) 위에서는 gray-100 카드.
 * 안쪽 부품은 카드 색을 바탕으로 삼는다
 */
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
  const surface = useSurface();
  const inner: Surface = surface === "gray" ? "white" : "gray";
  const base = [styles.card, { backgroundColor: raised(surface) }, dashed && styles.dashed];
  if (!onPress) {
    return (
      <SurfaceProvider value={inner}>
        <View style={[base, style]}>{children}</View>
      </SurfaceProvider>
    );
  }
  return (
    <SurfaceProvider value={inner}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          base,
          pressed && { backgroundColor: raisedPressed(surface) },
          style,
        ]}
      >
        {children}
      </Pressable>
    </SurfaceProvider>
  );
}

/**
 * 접힘 칸 (Figma 접힘 칸). 머리를 누르면 내용이 펼쳐진다.
 * open 을 주면 바깥에서, 안 주면 스스로 상태를 든다
 */
export function Collapsible({
  title,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  style,
}: {
  title: ReactNode;
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const surface = useSurface();
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const isOpen = open ?? innerOpen;
  const toggle = () => {
    setInnerOpen(!isOpen);
    onOpenChange?.(!isOpen);
  };
  const Chevron = isOpen ? ChevronUpIcon : ChevronDownIcon;
  return (
    <View style={[styles.collapsible, { backgroundColor: raised(surface) }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={toggle}
        style={({ pressed }) => [
          styles.collapsibleHead,
          pressed && { backgroundColor: raisedPressed(surface) },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          {typeof title === "string" ? (
            <Text variant="body-lg" weight="medium">
              {title}
            </Text>
          ) : (
            title
          )}
        </View>
        <Chevron size={14} color={semantic.mutedForeground} />
      </Pressable>
      {isOpen && children ? (
        <SurfaceProvider value={surface === "gray" ? "white" : "gray"}>
          <View style={styles.collapsibleBody}>{children}</View>
        </SurfaceProvider>
      ) : null}
    </View>
  );
}

/** 목록 구분선 (gray-200) */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%" },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.primary[100],
    flexShrink: 0,
  },
  ring: { borderWidth: 2.5, borderColor: semantic.primary },
  photoBox: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: colors.primary[100],
    flexShrink: 0,
  },
  photoBoxEmpty: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: semantic.input,
    backgroundColor: semantic.secondary,
  },
  badge: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  faded: { opacity: 0.6 },
  skeleton: { borderRadius: radius.lg, height: 20 },
  skeletonGroup: { gap: 10 },
  skeletonRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  infoBox: { borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  state: { alignItems: "center", gap: 8, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  stateCompact: { paddingTop: 40, paddingBottom: 32 },
  stateDescription: { maxWidth: 320 },
  stateIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  areaError: {
    alignItems: "center",
    gap: 10,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 8 },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: semantic.border },
  infoRowLabel: { width: 96, flexShrink: 0 },
  infoRowValue: { flex: 1, minWidth: 0 },
  progress: {
    height: 4,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: radius.full,
    backgroundColor: semantic.input,
  },
  progressBar: { height: 4, flex: 1 },
  segmented: { flexDirection: "row", gap: 4, borderRadius: radius.lg, padding: 4 },
  segment: {
    height: 38,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  card: { borderRadius: radius["2xl"] },
  dashed: { borderWidth: 1.3, borderStyle: "dashed", borderColor: semantic.input },
  collapsible: { borderRadius: radius["2xl"], overflow: "hidden" },
  collapsibleHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  collapsibleBody: { gap: 8, paddingHorizontal: 14, paddingBottom: 12, marginTop: -2 },
  divider: { height: 1, backgroundColor: semantic.border },
});
