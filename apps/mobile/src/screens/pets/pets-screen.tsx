import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { AddPetCard, PetCard, petQueries } from "@/entities/pet";
import { stageName, useSpeciesMap } from "@/entities/species";
import { todayQueries } from "@/entities/task";
import { isPetStatusChangeSupported } from "@pabom/core/config/env";
import { todayYmd } from "@pabom/core/lib/date";
import { LoadError, Skeleton, StateMessage } from "@/shared/ui/display";
import { PlusIcon } from "@/shared/ui/icons";
import { Menu } from "@/shared/ui/menu";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-P01 내 개체 목록. 지금 키우는 개체만 보여 준다 */
export function PetsScreen() {
  const species = useSpeciesMap();
  const { data, isPending, isError, refetch } = useQuery(petQueries.list("active"));
  // 오늘 할 일 수는 개체 목록 응답에 없어 GET /today 로 센다 [백엔드 요청]
  const [today] = useState(() => todayYmd());
  const todayList = useQuery(todayQueries.byDate(today));
  const remainingOf = (petId: string) =>
    todayList.data?.items.filter((t) => t.petId === petId && t.state === "todo").length ?? 0;

  return (
    <Screen>
      <TopBar
        leading="none"
        title="내 개체"
        // 개체가 있을 때만 ⋯ (C1-2·C1-4에는 없다)
        trailing={
          data?.length && isPetStatusChangeSupported ? (
            <Menu
              label="개체 메뉴"
              items={[
                { label: "함께했던 개체 목록 보기", onSelect: () => router.push("/pets/archived") },
              ]}
            />
          ) : undefined
        }
      />
      <ScreenBody gap={12}>
        {isPending ? (
          <>
            <Skeleton height={94} />
            <Skeleton height={94} />
          </>
        ) : isError ? (
          <LoadError onRetry={() => refetch()} style={{ paddingTop: 128 }} />
        ) : data.length === 0 ? (
          <StateMessage
            compact
            icon={<PlusIcon size={20} />}
            title="아직 등록한 개체가 없어요"
            description="개체를 등록하면 체크 리스트와 오늘 할 일이 생겨요."
            action={{ label: "개체 등록하기", onPress: () => router.push("/pets/new") }}
            style={{ paddingTop: 128 }}
          />
        ) : (
          <>
            {data.map((pet) => (
              <PetCard
                key={pet.id}
                pet={{ ...pet, todayRemaining: remainingOf(pet.id) }}
                href={{ pathname: "/pets/[petId]", params: { petId: pet.id } }}
                stageName={stageName(species.get(pet.speciesId), pet.lifeStageCode)}
              />
            ))}
            <AddPetCard href="/pets/new" />
          </>
        )}
      </ScreenBody>
    </Screen>
  );
}
