import { useLocalSearchParams } from "expo-router";
import { HandoverPreviewScreen } from "@/screens/handover/handover-preview-screen";

/** 공개 화면: 로그인 없이 열린다 ((app) 묶음 밖) */
export default function HandoverPreviewRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <HandoverPreviewScreen code={token} />;
}
