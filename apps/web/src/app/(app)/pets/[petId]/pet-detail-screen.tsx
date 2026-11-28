"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PetName, PetPhoto, petQueries, petSpeciesLine } from "@/entities/pet";
import { CareItemIcon, RecordGroup, RecordRow } from "@/entities/record";
import { routinesShortLine } from "@/entities/routine";
import {
  feedResultSetOf,
  speciesQueries,
  stageName,
  useDefaultFoodNameResolver,
  useSpeciesMap,
} from "@/entities/species";
import { taskSubline, taskTitle, todayQueries } from "@/entities/task";
import { ActionSheet, DeletePetDialog, type ActionSheetItem } from "@/features/pet-lifecycle";
import { EditRecordSheet } from "@/features/record-editor";
import { useTaskActions } from "@/features/task-actions";
import { petsApi } from "@pabom/core/api/endpoints";
import { getErrorMessage, getHttpStatus } from "@pabom/core/api/errors";
import { invalidateCareData } from "@pabom/core/api/query-keys";
import { isWeightItem } from "@pabom/core/domain/care";
import { lifeStageIdOf, SPECIES_LABEL } from "@pabom/core/domain/pet";
import { isKnownStage, lifeStageFromWeight } from "@pabom/core/domain/species";
import type { Task } from "@pabom/core/domain/today";
import { differenceInCalendarDays, todayYmd } from "@pabom/core/lib/date";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { InfoBox, LoadError, Skeleton, StateMessage } from "@/shared/ui/display";
import { CheckIcon, ChevronRightIcon, DotsHorizontalIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { toast } from "@/shared/ui/toast";
import { IconButton, TopBar } from "@/shared/ui/top-bar";

/** SCR-P04 개체 상세: 큰 사진 · 요약 · 오늘 할 일 · 체크 리스트 · 가이드라인 · 최근 기록 */
export function PetDetailScreen() {
  const { petId } = useParams<{ petId: string }>();
  const router = useRouter();
  const species = useSpeciesMap();
  const { data, isPending, isError, error, refetch } = useQuery(petQueries.detail(petId));
  const { data: careStandards } = useQuery({
    ...speciesQueries.careStandards(data?.pet.speciesId ?? "crested_gecko"),
    enabled: Boolean(data),
  });
  const [today] = useState(() => todayYmd());
  const [now] = useState(() => new Date());
  const todayList = useQuery({ ...todayQueries.byDate(today, petId), enabled: Boolean(data) });
  const resolveFoodName = useDefaultFoodNameResolver();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const actions = useTaskActions({
    onEditRecord: setEditRecordId,
    onEditRoutine: (task) => router.push(`/pets/${task.petId}/routines?edit=${task.routineId}`),
  });
  // 단계를 모르는 개체는 최근 체중 기록으로 단계를 제안하고, 버튼 한 번으로 정한다 (Figma 댓글: 체중으로 단계 제안)
  const confirmStage = useMutation({
    mutationFn: (code: string) =>
      petsApi.update(petId, { lifeStageId: lifeStageIdOf(code), stageCertainty: "CONFIRMED" }),
    onSuccess: () => toast("생애 단계를 정했어요"),
    onError: (error) => toast(getErrorMessage(error, "단계를 정하지 못했어요.")),
    onSettled: () => invalidateCareData(queryClient),
  });

  if (isPending) {
    return (
      <Screen>
        <TopBar fallbackHref="/pets" />
        <ScreenBody gap={12} className="px-4 pb-10 *:shrink-0">
          <Skeleton className="h-[220px]" />
          <Skeleton className="h-[77px]" />
          <Skeleton className="h-[134px]" />
        </ScreenBody>
      </Screen>
    );
  }

  // 없는 개체(남의 개체 포함)는 E01, 그 밖의 실패는 C1-2
  if (isError && getHttpStatus(error) === 404) notFound();
  if (isError) {
    return (
      <Screen>
        <TopBar fallbackHref="/pets" />
        <LoadError className="flex-1 justify-center" onRetry={() => refetch()} />
      </Screen>
    );
  }

  const { pet, routines, recentRecords } = data;
  const spec = species.get(pet.speciesId);
  const stageUnknown = !isKnownStage(pet.lifeStageCode);
  const stage = stageName(spec, pet.lifeStageCode);
  const lastWeight = recentRecords?.find((r) => isWeightItem(r.careItem) && r.weightG)?.weightG;
  const suggested = stageUnknown && spec ? lifeStageFromWeight(spec, lastWeight) : null;
  const since = pet.acquiredOn ?? pet.createdAt.slice(0, 10);
  const togetherDays = differenceInCalendarDays(now, parseISO(since)) + 1;
  const todos = (todayList.data?.items ?? []).filter(
    (t) => t.petId === pet.id && t.state === "todo",
  );

  const menuItems: ActionSheetItem[] = [
    {
      label: "정보 수정",
      description: "이름 · 성별 · 부화일 · 사진",
      onSelect: () => router.push(`/pets/${pet.id}/edit`),
    },
    {
      label: "개체 삭제",
      description: "모든 기록이 사라지고 되돌릴 수 없어요",
      tone: "danger",
      onSelect: () => setDeleteOpen(true),
    },
  ];

  return (
    <Screen>
      <TopBar
        title={pet.name}
        fallbackHref="/pets"
        trailing={
          <IconButton
            aria-label={`${pet.name} 메뉴`}
            aria-haspopup="dialog"
            onClick={() => setMenuOpen(true)}
          >
            <DotsHorizontalIcon />
          </IconButton>
        }
      />
      <ScreenBody gap={12} className="px-4 pb-10 *:shrink-0">
        <div className="flex flex-col gap-1">
          <PetPhoto src={pet.photoUrl} className="h-[220px] w-full" />
          <div className="h-2" />
          <PetName pet={pet} variant="title-md" as="h2" />
          <p className="text-body-lg text-muted-foreground">
            {[petSpeciesLine(pet), `함께한 지 ${togetherDays}일`].join(" · ")}
          </p>
        </div>

        <div className="flex rounded-xl bg-card py-4">
          <SummaryCell
            label="생애 단계"
            value={stageUnknown ? "확인 전" : stage}
            muted={stageUnknown}
          />
          <SummaryCell
            label="부화일"
            value={pet.hatchedOn ? format(parseISO(pet.hatchedOn), "M월 d일") : "모름"}
            muted={!pet.hatchedOn}
          />
          <SummaryCell
            label="체중"
            value={lastWeight ? `${lastWeight.toFixed(1)} g` : "아직 없음"}
            muted={!lastWeight}
          />
        </div>
        {stageUnknown && !suggested ? (
          <p className="text-body-md text-muted-foreground">
            체중을 처음 기록하면 생애 단계를 제안해 드려요
          </p>
        ) : null}
        {suggested ? (
          <InfoBox tone="primary" className="flex items-center justify-between gap-3">
            <span className="flex-1 text-secondary-text">
              체중 {lastWeight}g으로 보면 <strong className="font-bold">{suggested.name}</strong>
              예요.
            </span>
            <Button
              size="sm"
              className="shrink-0"
              disabled={confirmStage.isPending}
              onClick={() => confirmStage.mutate(suggested.code)}
            >
              {suggested.name}로 정하기
            </Button>
          </InfoBox>
        ) : null}

        {todos.length ? (
          <>
            <SectionTitle>{`오늘 할 일 ${todos.length}`}</SectionTitle>
            <RecordGroup>
              {todos.map((task, index) => (
                <TaskRow
                  key={task.routineId}
                  task={task}
                  first={index === 0}
                  title={taskTitle(task, resolveFoodName(pet.speciesId, task.careItem))}
                  subline={taskSubline(task, feedResultSetOf(careStandards, task.careItem))}
                  checking={actions.checkingId === task.routineId}
                  onCheck={() => actions.check(task)}
                  onOpen={() => actions.openBasis(task)}
                />
              ))}
            </RecordGroup>
          </>
        ) : null}

        <RecordGroup>
          <LinkRow
            title="체크 리스트"
            subline={routinesShortLine(routines) || "아직 없어요"}
            href={`/pets/${pet.id}/routines`}
          />
          <LinkRow
            first={false}
            title={`${SPECIES_LABEL[pet.speciesId]} 가이드라인`}
            subline={`${stageUnknown ? "어린 개체" : stage} 기준 · 주기와 근거`}
            href={`/settings/guidelines/${pet.speciesId}?petId=${pet.id}`}
          />
        </RecordGroup>

        <SectionTitle>최근 기록</SectionTitle>
        {recentRecords === null ? (
          <RecordGroup className="py-4">
            <StateMessage
              compact
              title="최근 기록을 불러오지 못했어요"
              action={{ label: "다시 시도", onClick: () => refetch(), variant: "outline" }}
            />
          </RecordGroup>
        ) : recentRecords.length === 0 ? (
          <RecordGroup className="py-6">
            <p className="text-center text-body-lg text-muted-foreground">아직 기록이 없어요</p>
          </RecordGroup>
        ) : (
          <RecordGroup>
            {recentRecords.map((record, index) => (
              <RecordRow
                key={record.id}
                record={record}
                variant="list"
                first={index === 0}
                date={format(parseISO(record.occurredAt), "M월 d일")}
                feedResultSet={feedResultSetOf(careStandards, record.careItem)}
                onClick={() => setEditRecordId(record.id)}
              />
            ))}
          </RecordGroup>
        )}
        {recentRecords?.length ? (
          <Link
            href={`/pets/${pet.id}/records`}
            className="self-center py-1 text-body-lg font-medium text-primary hover:opacity-80"
          >
            전체 기록 보기 ›
          </Link>
        ) : null}
      </ScreenBody>

      {actions.sheets}
      <ActionSheet
        label={`${pet.name} 메뉴`}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        items={menuItems}
      />
      <DeletePetDialog pet={pet} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <EditRecordSheet
        recordId={editRecordId}
        speciesId={pet.speciesId}
        onOpenChange={(open) => !open && setEditRecordId(null)}
      />
    </Screen>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="mt-1 text-body-xl font-semibold text-secondary-text">{children}</h3>;
}

/** 요약 칸 (생애 단계 · 부화일 · 체중). 모르는 값은 회색 */
function SummaryCell({ label, value, muted }: { label: string; value: string; muted: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-center">
      <span
        className={cn(
          "max-w-full truncate text-body-xl font-bold",
          muted ? "text-subtle-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-body-md font-medium text-subtle-foreground">{label}</span>
    </div>
  );
}

/** 흰 묶음 안 이동 줄 (체크 리스트 · 가이드라인) */
function LinkRow({
  title,
  subline,
  href,
  first = true,
}: {
  title: string;
  subline: string;
  href: string;
  first?: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative flex min-h-13.5 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted active:bg-muted"
    >
      {first ? null : <span aria-hidden className="absolute top-0 right-0 left-4 h-px bg-border" />}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body-lg text-foreground">{title}</span>
        <span className="truncate text-body-md font-medium text-muted-foreground">{subline}</span>
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-subtle-foreground" />
    </Link>
  );
}

/** 오늘 할 일 줄 (Figma 할 일 카드): 항목 아이콘 · 제목 + 배지 · 주기 · 오른쪽 체크 */
function TaskRow({
  task,
  title,
  subline,
  first,
  checking,
  onCheck,
  onOpen,
}: {
  task: Task;
  title: string;
  subline: string;
  first: boolean;
  checking: boolean;
  onCheck: () => void;
  onOpen: () => void;
}) {
  const badge = task.overdueDays > 0 ? `${task.overdueDays}일 지남` : "오늘";
  return (
    <div className="relative flex items-center gap-3 px-4 py-3.5">
      {first ? null : <span aria-hidden className="absolute top-0 right-4 left-16 h-px bg-border" />}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <CareItemIcon code={task.careItem} recordKind={task.recordKind} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span className="min-w-0 shrink truncate text-body-xl font-semibold text-foreground">
              {title}
            </span>
            <Pill danger={task.overdueDays > 0}>{badge}</Pill>
          </span>
          {subline ? (
            <span className="truncate text-body-md font-medium text-muted-foreground">
              {subline}
            </span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        aria-label={`${title} 완료 체크`}
        disabled={checking}
        onClick={onCheck}
        // 26 동그라미 바깥으로 44 터치 칸을 넓힌다
        className="group -m-2.5 flex size-11 shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            "flex size-6.5 items-center justify-center rounded-full text-card transition-colors group-active:bg-primary",
            checking ? "bg-primary" : "bg-input",
          )}
        >
          <CheckIcon className="size-4" strokeWidth={3} />
        </span>
      </button>
    </div>
  );
}

function Pill({ children, danger }: { children: ReactNode; danger: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 shrink-0 items-center rounded-full bg-muted px-1.5 text-body-md font-medium",
        danger ? "text-destructive" : "text-secondary-text",
      )}
    >
      {children}
    </span>
  );
}
