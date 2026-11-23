import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { meQueries } from "@pabom/core/entities/session";
import { FootprintWalk, LoginButtons, LoginLoading, safeNext, WelcomeHero } from "@/features/auth";
import { PabomLogo } from "@/shared/ui/pabom-logo";
import { Text } from "@/shared/ui/text";
import { semantic, spacing } from "@/shared/ui/theme";

/** 키가 작은 화면에서는 로고 위 여백을 줄여 히어로와 버튼이 겹치지 않게 한다 */
const COMPACT_HEIGHT = 760;

/**
 * SCR-A01 첫 화면. 파란 그라데이션 위 흰 로고 · 소개 문구 · 히어로(3D 게코) · 발자국 걷기,
 * 아래에 카카오·구글 버튼과 약관 안내. 로그인 중에는 A02(로그인하고 있어요)가 덮는다
 */
export default function WelcomeScreen() {
  const { next: rawNext } = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(rawNext);
  const { data: me } = useQuery({ ...meQueries.detail(), retry: false });
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const top = height < COMPACT_HEIGHT ? 40 : 96;

  if (me) {
    return (
      <Redirect
        href={me.status === "PENDING_TERMS" ? "/agreements" : ((next ?? "/home") as "/home")}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style={busy ? "dark" : "light"} />
      <LinearGradient
        colors={[semantic.brandFrom, semantic.brand]}
        // 히어로 아래 흐림 막(brand 로 끝남)과 이어지도록 그 위에서 brand 에 닿는다
        locations={[0, 0.6]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.body, { paddingTop: insets.top + top }]}>
        <PabomLogo size="lg" color={semantic.primaryForeground} />
        <Text
          variant="body-xl"
          weight="medium"
          color={semantic.primaryForeground}
          align="center"
          style={styles.intro}
        >
          파충류 키우기의 모든 순간!{"\n"}올인원 파충류 케어
        </Text>
        <View>
          <WelcomeHero />
          {/* 발자국은 히어로 위쪽을 가로지른다 (Figma 프레임 x54 · 히어로 위 33px) */}
          <FootprintWalk style={styles.walk} />
        </View>
      </View>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 26) + 8 }]}>
        <LoginButtons next={next} onBusyChange={setBusy} />
        <Text variant="body-md" weight="medium" color={semantic.primaryForeground} align="center">
          계속 진행하면 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </Text>
      </View>
      {busy ? <LoginOverlay /> : null}
    </View>
  );
}

/** A02 로그인 처리 중. 버튼을 누르면 0.2s 로 스며든다 (DISSOLVE) */
function LoginOverlay() {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
      <LoginLoading />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: semantic.brand },
  body: {
    flex: 1,
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: spacing.gutter,
  },
  intro: { marginTop: 20, marginBottom: 48, lineHeight: 21 },
  walk: { position: "absolute", left: 24, top: -33 },
  footer: { gap: 12, paddingHorizontal: 16, paddingTop: 10 },
});
