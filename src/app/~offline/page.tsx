import type { Metadata } from "next";
import { OfflineScreen } from "./offline-screen";

export const metadata: Metadata = { title: "오프라인" };

export default function OfflinePage() {
  return <OfflineScreen />;
}
