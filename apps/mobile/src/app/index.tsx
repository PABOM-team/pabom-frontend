import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { meQueries } from "@pabom/core/entities/session";
import { semantic } from "@/shared/ui/theme";

/**
 * 첫 진입. 로그인 상태를 안 뒤 홈·약관 동의·첫 화면 중 하나로 바꿔 간다.
 * 그동안은 _layout 의 로고 화면(SplashGate)이 덮고 있어 빈 화면만 둔다
 */
export default function IndexScreen() {
  const { data: me, isPending } = useQuery({ ...meQueries.detail(), retry: false });

  if (isPending) return <View style={{ flex: 1, backgroundColor: semantic.background }} />;
  if (!me) return <Redirect href="/welcome" />;
  if (me.status === "PENDING_TERMS") return <Redirect href="/agreements" />;
  return <Redirect href="/home" />;
}
