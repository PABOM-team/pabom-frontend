import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import { toast } from "@/shared/ui/toast";

/** react-native-qrcode-svg 의 getRef 로 받는 객체. toDataURL 로 PNG(base64)를 뽑는다 */
export type QrHandle = { toDataURL: (callback: (base64: string) => void) => void };

const toBytes = (base64: string) => Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));

const dataUrlOf = (qr: QrHandle) => new Promise<string>((resolve) => qr.toDataURL(resolve));

/**
 * QR을 PNG 파일로 저장(공유 창으로 넘긴다). 웹의 downloadQr(SVG 다운로드) 자리.
 * 앱에는 다운로드가 없어 캐시에 PNG 로 써 두고 기기 공유 창을 띄운다 (사진 저장·메신저 전송은 거기서)
 */
export async function saveQr(qrRef: RefObject<QrHandle | null>, filename: string) {
  const qr = qrRef.current;
  if (!qr) return;
  try {
    const base64 = await dataUrlOf(qr);
    const file = new File(Paths.cache, filename);
    file.write(toBytes(base64));
    if (!(await Sharing.isAvailableAsync())) {
      toast("이 기기에서는 QR을 저장할 수 없어요.");
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: "image/png",
      UTI: "public.png",
      dialogTitle: "파봄 인계 카드 QR",
    });
  } catch {
    toast("QR을 저장하지 못했어요.");
  }
}
