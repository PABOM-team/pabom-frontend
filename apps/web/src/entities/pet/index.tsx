import Link from "next/link";
import { SEX_SYMBOL, SPECIES_LABEL, type Pet } from "@pabom/core/domain/pet";
import { cn } from "@/shared/lib/utils";
import { PawPrintIcon } from "@/shared/ui/icons";

// 조회 로직은 웹·앱이 함께 쓰는 @pabom/core 에 있다. 여기는 웹 UI만
export { petQueries } from "@pabom/core/entities/pet";

export function petSpeciesLine(pet: Pick<Pet, "speciesId" | "morph">) {
  return [SPECIES_LABEL[pet.speciesId], pet.morph].filter(Boolean).join(" · ");
}

/**
 * 개체 사진 (네모, 둥근 모서리 20). 사진이 없으면 회색 칸 + 발자국 (앱 PetPhoto 와 같다).
 * 크기·모서리는 className 으로 정한다 (예: 'aspect-square w-full', 'size-11 rounded-full')
 */
export function PetPhoto({
  src,
  className,
  iconSize = 32,
}: {
  src: string | null;
  className?: string;
  /** 사진이 없을 때 발자국 크기 */
  iconSize?: number;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-border",
        className,
      )}
    >
      {src ? (
        // 서명 URL이라 next/image 최적화를 쓰지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <PawPrintIcon
          aria-hidden
          className="text-subtle-foreground"
          style={{ width: iconSize, height: iconSize }}
        />
      )}
    </span>
  );
}

/** 이름 + 성별 기호 (콩이 ♂) */
export function PetName({
  pet,
  variant = "body-xl",
  as: Tag = "p",
  className,
}: {
  pet: Pick<Pet, "name" | "sex">;
  variant?: "body-xl" | "title-md";
  as?: "p" | "h2" | "span";
  className?: string;
}) {
  const symbol = SEX_SYMBOL[pet.sex];
  return (
    <Tag
      className={cn(
        "block truncate font-bold text-foreground",
        variant === "title-md" ? "text-title-md" : "text-body-xl",
        className,
      )}
    >
      {pet.name}
      {symbol ? (
        <span
          className={cn(
            "font-medium text-subtle-foreground",
            variant === "title-md" ? "text-title-xs" : "text-body-lg",
          )}
        >
          {` ${symbol}`}
        </span>
      ) : null}
    </Tag>
  );
}

/** 내 개체 목록 칸 (SCR-P01 2열 사진): 사진 · 이름 ♂ · 종 · 생애 단계 */
export function PetCard({ pet, stageName, href }: { pet: Pet; stageName: string; href: string }) {
  return (
    <Link
      href={href}
      aria-label={pet.name}
      className="block min-w-0 transition-opacity hover:opacity-80 active:opacity-70"
    >
      <PetPhoto src={pet.photoUrl} className="aspect-square w-full" />
      <span className="flex flex-col gap-0.5 pt-2.5">
        <PetName pet={pet} as="span" />
        <span className="truncate text-body-md text-muted-foreground">
          {[SPECIES_LABEL[pet.speciesId], stageName].filter(Boolean).join(" · ")}
        </span>
      </span>
    </Link>
  );
}
