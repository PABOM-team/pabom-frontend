"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PetCard, petQueries } from "@/entities/pet";
import { stageName, useSpeciesMap } from "@/entities/species";
import { SPECIES_LABEL, type Pet, type SpeciesId } from "@pabom/core/domain/pet";
import { cn } from "@/shared/lib/utils";
import { buttonVariants } from "@/shared/ui/button";
import { LoadError, Skeleton } from "@/shared/ui/display";
import { SearchIcon, XIcon } from "@/shared/ui/icons";
import { Screen } from "@/shared/ui/screen";
import { IconButton } from "@/shared/ui/top-bar";

/** 7마리 이상 + 종 2개 이상이면 종 칩으로 좁혀 본다 (Figma 메모) */
const CHIP_MIN_PETS = 7;

/** '크레스티드 게코' → '크레스티드' (칩은 짧게) */
const shortSpecies = (id: SpeciesId) => SPECIES_LABEL[id].replace(/\s*게코$/, "");

const matches = (pet: Pet, query: string) => {
  const q = query.trim().toLowerCase();
  return (
    !q ||
    pet.name.toLowerCase().includes(q) ||
    [SPECIES_LABEL[pet.speciesId], pet.morph ?? ""].some((s) => s.toLowerCase().includes(q))
  );
};

/** SCR-P01 내 개체 목록. 2열 사진 · 등록순 · 돋보기로 이름·종 찾기 · 많으면 종 칩 */
export function PetsScreen() {
  const species = useSpeciesMap();
  const { data, isPending, isError, refetch } = useQuery(petQueries.list());
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesId | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  const pets = data ?? [];
  const speciesIds = [...new Set(pets.map((p) => p.speciesId))];
  const showChips = !searching && pets.length >= CHIP_MIN_PETS && speciesIds.length >= 2;
  const visible = searching
    ? pets.filter((p) => matches(p, query))
    : pets.filter((p) => !showChips || !speciesFilter || p.speciesId === speciesFilter);
  const empty = !isPending && !isError && pets.length === 0;

  const closeSearch = () => {
    setSearching(false);
    setQuery("");
  };

  const grid = (list: Pet[]) => (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5">
      {list.map((pet) => (
        <PetCard
          key={pet.id}
          pet={pet}
          href={`/pets/${pet.id}`}
          stageName={stageName(species.get(pet.speciesId), pet.lifeStageCode)}
        />
      ))}
    </div>
  );

  const header = searching ? (
    <div className="flex min-h-13 animate-in items-center gap-1.5 pb-2 duration-250 ease-out fade-in-0 slide-in-from-top-1.5">
      <label className="flex h-11 flex-1 items-center gap-2 rounded-lg bg-card px-3">
        <SearchIcon className="size-5 shrink-0 text-subtle-foreground" />
        <input
          // 돋보기를 눌러 연 칸이라 바로 쓸 수 있게 한다
          autoFocus
          type="search"
          enterKeyHint="search"
          aria-label="이름이나 종으로 찾기"
          placeholder="이름이나 종으로 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && closeSearch()}
          className="min-w-0 flex-1 bg-transparent text-body-lg text-foreground outline-none placeholder:text-subtle-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            aria-label="지우기"
            onClick={() => setQuery("")}
            className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-subtle-foreground text-card"
          >
            <XIcon className="size-3" strokeWidth={3} />
          </button>
        ) : null}
      </label>
      <button
        type="button"
        onClick={closeSearch}
        className="shrink-0 py-2.5 pl-2 text-body-lg font-medium text-secondary-text"
      >
        취소
      </button>
    </div>
  ) : (
    <div className="flex min-h-13 items-center gap-1.5 pb-2">
      <h1 className="flex-1 text-title-md text-foreground">
        내 개체
        {pets.length && !showChips ? (
          <span className="text-subtle-foreground">{` ${pets.length}`}</span>
        ) : null}
      </h1>
      {pets.length ? (
        <>
          <IconButton aria-label="개체 찾기" onClick={() => setSearching(true)}>
            <SearchIcon className="text-muted-foreground" />
          </IconButton>
          <Link
            href="/pets/new"
            aria-label="개체 추가"
            className="py-2.5 pl-2.5 text-body-xl font-semibold text-primary hover:opacity-80"
          >
            추가
          </Link>
        </>
      ) : null}
    </div>
  );

  const body = () => {
    if (isPending) {
      return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="aspect-[1/1.35] h-auto w-full" />
          ))}
        </div>
      );
    }
    if (isError) return <LoadError onRetry={() => refetch()} className="pt-32" />;
    if (pets.length === 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-15 text-center">
          {/* 장식 그림이라 next/image 최적화 없이 그린다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/pets-empty-figure.png"
            alt=""
            width={150}
            height={150}
            className="size-[150px] object-contain"
          />
          <h2 className="text-title-xs text-foreground">첫 개체를 등록해 주세요</h2>
          <p className="text-body-xl text-muted-foreground">
            종을 고르면 그 아이에게 맞는
            <br />할 일을 바로 만들어 드려요
          </p>
          <Link href="/pets/new" className={cn(buttonVariants({ size: "xl" }), "mt-2 w-[220px]")}>
            개체 등록하기
          </Link>
        </div>
      );
    }
    if (searching) {
      const q = query.trim();
      if (q && visible.length === 0) {
        return (
          <div className="flex flex-col items-center gap-1.5 pt-30 text-center">
            <p className="text-title-xs font-bold text-foreground">{`'${q}'와 맞는 개체가 없어요`}</p>
            <p className="text-body-xl text-muted-foreground">이름이나 종 이름을 다시 확인해 주세요</p>
          </div>
        );
      }
      return (
        <>
          <p className="text-body-lg font-semibold text-muted-foreground">
            {q ? `지금 함께하는 개체 ${visible.length}` : `전체 ${pets.length}마리`}
          </p>
          {grid(visible)}
        </>
      );
    }
    return (
      <>
        {showChips ? (
          <div className="scrollbar-none -mr-4 flex gap-2 overflow-x-auto pr-4">
            {[null, ...speciesIds].map((id) => {
              const selected = id === speciesFilter;
              const count = id ? pets.filter((p) => p.speciesId === id).length : pets.length;
              return (
                <button
                  key={id ?? "all"}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSpeciesFilter(id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-3 py-[7px] text-body-lg font-semibold",
                    selected
                      ? "bg-inverse text-inverse-foreground"
                      : "bg-card text-secondary-text hover:bg-gray-200",
                  )}
                >
                  {id ? shortSpecies(id) : "전체"}
                  <span className={selected ? "text-inverse-foreground" : "text-subtle-foreground"}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
        {grid(visible)}
      </>
    );
  };

  return (
    <Screen>
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain *:shrink-0 px-4 pt-[calc(4px+env(safe-area-inset-top))] pb-6",
        )}
      >
        {header}
        <div className={cn("flex flex-col gap-3", empty && "flex-1")}>{body()}</div>
      </main>
    </Screen>
  );
}
