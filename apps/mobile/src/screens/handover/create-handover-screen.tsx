import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { petQueries } from "@/entities/pet";
import { FullScreenLoading } from "@/features/auth";
import { CreateHandoverFlow } from "@/features/handover";
import { getHttpStatus } from "@pabom/core/api/errors";
import { LoadError, StateMessage } from "@/shared/ui/display";
import { Screen, ScreenCenter } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

export function CreateHandoverScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { data, isPending, isError, error, refetch } = useQuery(petQueries.detail(petId));

  if (isPending) return <FullScreenLoading />;
  // 없는 개체는 E01, 그 밖의 실패는 C1-2
  if (isError && getHttpStatus(error) === 404) {
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
  if (isError) {
    return (
      <Screen>
        <TopBar title="인계 카드 만들기" fallbackHref="/pets" />
        <LoadError style={{ flex: 1, justifyContent: "center" }} onRetry={() => refetch()} />
      </Screen>
    );
  }
  return <CreateHandoverFlow detail={data} />;
}
