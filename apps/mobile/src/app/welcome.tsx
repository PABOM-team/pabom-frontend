import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { meQueries } from "@pabom/core/entities/session";
import { LoginButtons, safeNext } from "@/features/auth";
import { PabomAppIcon, PabomLogo } from "@/shared/ui/pabom-logo";
import { Screen, ScreenFooter } from "@/shared/ui/screen";
import { shadows, toNativeShadow } from "@/shared/ui/theme";

/** SCR-A01 첫 화면. Figma 그대로: 로고와 카카오·구글 버튼만 */
export default function WelcomeScreen() {
  const { next: rawNext } = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(rawNext);
  const { data: me } = useQuery({ ...meQueries.detail(), retry: false });

  if (me) {
    return (
      <Redirect
        href={me.status === "PENDING_TERMS" ? "/agreements" : ((next ?? "/home") as "/home")}
      />
    );
  }

  return (
    <Screen>
      <View style={styles.center}>
        <PabomAppIcon size={72} style={[styles.icon, toNativeShadow(shadows.md)]} />
        <PabomLogo size="lg" />
      </View>
      <ScreenFooter minBottom={26}>
        <LoginButtons next={next} />
      </ScreenFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  icon: { marginBottom: 20 },
});
