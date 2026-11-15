import { useLocalSearchParams } from "expo-router";
import { AcceptHandoverScreen } from "@/screens/handover/accept-handover-screen";

export default function AcceptHandoverRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <AcceptHandoverScreen code={token} />;
}
