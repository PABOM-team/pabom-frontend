import { useQuery } from "@tanstack/react-query";
import { EndedPetCard, petQueries } from "@/entities/pet";
import { LoadError, Skeleton, StateMessage } from "@/shared/ui/display";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-P08 함께했던 개체 목록. 탭바 없음 [제안] */
export function ArchivedPetsScreen() {
  const { data, isPending, isError, refetch } = useQuery(petQueries.list("ended"));

  return (
    <Screen>
      <TopBar title="함께했던 개체" fallbackHref="/pets" />
      <ScreenBody gap={12} contentStyle={{ flexGrow: 1 }}>
        <Text variant="body-lg" color={semantic.mutedForeground}>
          함께했던 개체는 기록만 볼 수 있어요. 오늘 할 일에는 뜨지 않아요.
        </Text>
        {isPending ? (
          <Skeleton height={94} />
        ) : isError ? (
          <LoadError onRetry={() => refetch()} />
        ) : !data.length ? (
          <StateMessage
            style={{ flex: 1, justifyContent: "center" }}
            title="함께했던 개체가 없어요"
          />
        ) : (
          data.map((pet) => (
            <EndedPetCard
              key={pet.id}
              pet={pet}
              href={{ pathname: "/pets/[petId]", params: { petId: pet.id } }}
            />
          ))
        )}
      </ScreenBody>
    </Screen>
  );
}
