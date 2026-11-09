import { router } from "expo-router";
import { StateMessage } from "@/shared/ui/display";
import { Screen, ScreenCenter } from "@/shared/ui/screen";

/**
 * 웹의 notFound() 대신 그 자리에서 그리는 E01 (app/+not-found.tsx 와 같은 문구).
 * 없는 개체(남의 개체 포함)는 모두 이 화면으로 보여 존재 여부를 숨긴다
 */
export function PetNotFound() {
  return (
    <Screen>
      <ScreenCenter>
        <StateMessage
          icon={null}
          title="페이지를 찾을 수 없어요"
          description="주소가 바뀌었거나 삭제된 정보예요."
          action={{ label: "홈 화면으로 가기 (오늘)", onPress: () => router.replace("/home") }}
        />
      </ScreenCenter>
    </Screen>
  );
}
