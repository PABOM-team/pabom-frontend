import { router } from "expo-router";
import { getStoredAccount } from "@pabom/core/api/session";
import { StateMessage } from "@/shared/ui/display";
import { Screen, ScreenCenter } from "@/shared/ui/screen";

/**
 * SCR-E01 없는 페이지. 남의 개체·기록도 같은 화면으로 보여 존재 여부를 숨긴다. 앱바·탭바 없음.
 * 로그인하지 않은 사람은 버튼이 '처음으로'
 */
export default function NotFoundScreen() {
  const loggedIn = Boolean(getStoredAccount());
  return (
    <Screen>
      <ScreenCenter>
        <StateMessage
          icon={null}
          title="페이지를 찾을 수 없어요"
          description="주소가 바뀌었거나 삭제된 정보예요."
          action={
            loggedIn
              ? { label: "홈 화면으로 가기 (오늘)", onPress: () => router.replace("/home") }
              : { label: "처음으로", onPress: () => router.replace("/welcome") }
          }
        />
      </ScreenCenter>
    </Screen>
  );
}
