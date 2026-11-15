"use client";

import { ExclamationIcon } from "@/shared/ui/icons";
import { StateMessage } from "@/shared/ui/display";
import { Screen } from "@/shared/ui/screen";

/**
 * 서비스 워커가 네트워크 없이 처음 여는 페이지를 못 받았을 때 (C5-1 변형).
 * 평소 오프라인은 위쪽 배너만 붙고 화면은 그대로다
 */
export function OfflineScreen() {
  return (
    <Screen className="justify-center">
      <StateMessage
        icon={<ExclamationIcon className="size-5" />}
        title="인터넷 연결이 끊겼어요"
        description="연결되면 다시 불러와요."
        action={{ label: "새로고침", onClick: () => window.location.reload() }}
      />
    </Screen>
  );
}
