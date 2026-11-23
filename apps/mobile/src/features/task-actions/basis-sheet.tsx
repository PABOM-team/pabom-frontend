import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { petQueries } from "@/entities/pet";
import { speciesQueries, stageName, useSpeciesMap } from "@/entities/species";
import { CARE_DISCLAIMER, formatInterval } from "@pabom/core/domain/care";
import { EVIDENCE_LEVEL_LABEL } from "@pabom/core/domain/species";
import type { Task } from "@pabom/core/domain/today";
import { InfoBox } from "@/shared/ui/display";
import { ChevronDownIcon, ChevronUpIcon } from "@/shared/ui/icons";
import { Sheet } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";

/** 단계를 모르는(잘 모르겠어요) 개체의 적용 조건 표기 (v1.2 H04) */
const STAGE_UNKNOWN_LABEL = "단계 확인 전";

/**
 * 왜 이 할 일이 있나요? (SCR-H04)
 * 할 일 · 적용 조건(종 · 생애 단계) · 항목 설명 1줄, 펼치면 근거·출처와 종 가이드라인 링크
 */
export function BasisSheet({
  task,
  onOpenChange,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [shown, setShown] = useState<Task | null>(null);
  if (task && task.routineId !== shown?.routineId) {
    setShown(task);
    setExpanded(false);
  }
  const current = task ?? shown;
  const { data: detail } = useQuery({
    ...petQueries.detail(current?.petId ?? ""),
    enabled: Boolean(current),
  });
  const speciesMap = useSpeciesMap();
  const species = detail ? speciesMap.get(detail.pet.speciesId) : undefined;
  const { data: standards } = useQuery({
    ...speciesQueries.careStandards(detail?.pet.speciesId ?? "crested_gecko"),
    enabled: Boolean(detail),
  });
  const routine = detail?.routines.find((r) => r.id === current?.routineId);

  // 적용 조건은 개체의 종·단계로 그린다. 단계를 모르면 '단계 확인 전' (v1.2 H04)
  const stage = detail ? stageName(species, detail.pet.lifeStageCode) : "";
  const condition = species
    ? `${species.commonName} · ${stage || STAGE_UNKNOWN_LABEL}`
    : (routine?.basis.condition ?? "…");
  // 항목 설명 1줄은 종 가이드라인(care-standards)의 description (v1.2 개발 명세 5-2)
  const standard = standards?.standards.find(
    (s) =>
      s.careItem === current?.careItem &&
      (s.lifeStageCode === detail?.pet.lifeStageCode || !detail?.pet.lifeStageCode),
  );
  // 백엔드가 description에 적용 조건만 넣으면 같은 글을 두 번 보이지 않는다 [백엔드 확인 필요]
  const description =
    standard?.description && standard.description !== condition ? standard.description : null;

  const openGuideline = () => {
    if (!detail) return;
    onOpenChange(false);
    router.push({
      pathname: "/settings/guidelines/[speciesId]",
      params: { speciesId: detail.pet.speciesId },
    });
  };

  // 펼친 칸의 한 줄: 근거 수준 · 출처 (v1.2 5-1). 누르면 그 개체 종의 가이드라인으로
  const sourceLine = [
    standard?.evidenceLevel ? `근거 수준 · ${EVIDENCE_LEVEL_LABEL[standard.evidenceLevel]}` : null,
    standard?.sourceRefs ? `출처 · ${standard.sourceRefs}` : (routine?.basis.sourceText ?? null),
  ]
    .filter(Boolean)
    .join("  |  ");

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <Sheet open={Boolean(task)} onOpenChange={onOpenChange} title="왜 이 할 일이 있나요?">
      <View>
        <View style={[styles.row, styles.rowDivider]}>
          <Text variant="body-lg" color={semantic.mutedForeground} style={styles.term}>
            할 일
          </Text>
          <Text variant="body-lg" style={styles.detail}>
            {current?.title.split(" · ")[0]}
            {current?.intervalDays != null ? ` · ${formatInterval(current.intervalDays)}` : ""}
          </Text>
        </View>
        <View style={styles.row}>
          <Text variant="body-lg" color={semantic.mutedForeground} style={styles.term}>
            적용 조건
          </Text>
          <Text variant="body-lg" style={styles.detail}>
            {condition}
          </Text>
        </View>
      </View>
      {description ? (
        <Text variant="body-lg" style={styles.mt3}>
          {description}
        </Text>
      ) : null}

      {/* 펼치면 근거 수준·출처(있을 때)와 종 가이드라인(S04-3) 링크 (Figma H04 펼침, v1.2 5-1) */}
      <View style={styles.expander}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={toggle}
          hitSlop={12}
          style={styles.expanderButton}
        >
          <Text variant="body-lg" weight="medium" style={styles.detail}>
            자세히 보기
          </Text>
          {expanded ? (
            <ChevronUpIcon size={14} color={semantic.primary} />
          ) : (
            <ChevronDownIcon size={14} color={semantic.mutedForeground} />
          )}
        </Pressable>
        {expanded && detail ? (
          <Pressable accessibilityRole="link" onPress={openGuideline} style={styles.link}>
            <Text variant="body-lg" weight="medium" color={semantic.primary}>
              {sourceLine || "이러한 기준을 기반으로 제안을 드렸어요"} ›
            </Text>
          </Pressable>
        ) : null}
      </View>

      <InfoBox style={styles.mt3}>{CARE_DISCLAIMER}</InfoBox>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, paddingVertical: 8 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: semantic.border },
  term: { width: 96, flexShrink: 0 },
  detail: { flex: 1, minWidth: 0 },
  mt3: { marginTop: 12 },
  expander: {
    marginTop: 12,
    gap: 10,
    borderRadius: radius["2xl"],
    backgroundColor: semantic.muted,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  expanderButton: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: 8 },
  link: { minHeight: 24 },
});
