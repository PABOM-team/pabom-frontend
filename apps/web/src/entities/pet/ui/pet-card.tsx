import { ChevronRightIcon, PlusIcon } from "@/shared/ui/icons";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { SPECIES_LABEL, type Pet } from "@pabom/core/domain/pet";
import { Avatar } from "@/shared/ui/display";

export function petSpeciesLine(pet: Pick<Pet, "speciesId" | "morph">) {
  return [SPECIES_LABEL[pet.speciesId], pet.morph].filter(Boolean).join(" · ");
}

/** 내 개체 목록 카드 (SCR-P01) */
export function PetCard({ pet, stageName, href }: { pet: Pet; stageName: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-xl border-[1.3px] border-input bg-background py-3.5 pr-3 pl-3.5 transition-colors hover:bg-muted"
    >
      <Avatar src={pet.photoUrl} size={56} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-title-xs font-bold">{pet.name}</h3>
        <p className="truncate text-body-lg text-muted-foreground">{petSpeciesLine(pet)}</p>
        <p className="truncate text-body-lg text-muted-foreground">
          {stageName} · 오늘 할 일 {pet.todayRemaining}
        </p>
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
    </Link>
  );
}

export function AddPetCard({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3.5 rounded-xl border-[1.3px] border-dashed border-input bg-background px-3.5 py-4 hover:bg-muted",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full border-[1.5px] border-dashed border-input text-muted-foreground">
        <PlusIcon className="size-5" />
      </span>
      <span className="text-body-xl font-bold">개체 추가</span>
    </Link>
  );
}
