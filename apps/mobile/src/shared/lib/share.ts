import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";
import { toast } from "@/shared/ui/toast";

export async function copyText(text: string, message = "복사했어요") {
  try {
    await Clipboard.setStringAsync(text);
    toast(message);
  } catch {
    toast("복사하지 못했어요.");
  }
}

/** 기기 공유 창. 취소하면 아무것도 하지 않는다 */
export async function shareLink(url: string) {
  try {
    await Share.share({ title: "파봄 인계 카드", message: url, url });
  } catch {
    await copyText(url, "링크를 복사했어요");
  }
}
