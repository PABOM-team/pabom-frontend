import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { petQueries } from "@/entities/pet";
import { speciesQueries, stageName, useSpeciesMap } from "@/entities/species";
import { CARE_DISCLAIMER, formatInterval } from "@pabom/core/domain/care";
import { EVIDENCE_LEVEL_LABEL } from "@pabom/core/domain/species";
import type { Task } from "@pabom/core/domain/today";
import { InfoBox } from "@/shared/ui/display";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from "@/shared/ui/icons";
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
  // 목업·백엔드가 description에 적용 조건만 넣으면 같은 글을 두 번 보이지 않는다 [백엔드 확인 필요]
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

  return (
    <Sheet open={Boolean(task)} onOpenChange={onOpenChange} title="왜 이 할 일이 있나요?">
      <View>
        <View style={styles.row}>
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
        <Text variant="body-lg" color={semantic.secondaryText} style={[styles.mt3, styles.relaxed]}>
          {description}
        </Text>
      ) : null}

      <View
        style={[styles.expander, { borderColor: expanded ? semantic.primary : semantic.input }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((v) => !v)}
          style={styles.expanderButton}
        >
          <Text variant="body-lg">자세히 보기</Text>
          {expanded ? (
            <ChevronUpIcon size={16} color={semantic.primary} />
          ) : (
            <ChevronDownIcon size={16} color={semantic.mutedForeground} />
          )}
        </Pressable>
        {/* 펼치면 근거 수준·출처(있을 때)와 종 가이드라인(S04-3) 링크 (Figma H04 펼침, v1.2 5-1) */}
        {expanded ? (
          <View style={styles.expanderBody}>
            {/* 근거 수준(교재 근거·수의 기관 자료·팀 판단)과 출처는 종 가이드라인 항목에서 가져온다 (v1.2 5-1) */}
            {standard?.evidenceLevel ? (
              <Text variant="body-lg" color={semantic.secondaryText}>
                근거 수준 · {EVIDENCE_LEVEL_LABEL[standard.evidenceLevel]}
              </Text>
            ) : null}
            {standard?.sourceRefs ? (
              <Text variant="body-lg" color={semantic.secondaryText}>
                출처 · {standard.sourceRefs}
              </Text>
            ) : routine?.basis.sourceText ? (
              <Text variant="body-lg" color={semantic.secondaryText}>
                {routine.basis.sourceText}
              </Text>
            ) : null}
            {detail ? (
              <Pressable accessibilityRole="link" onPress={openGuideline} style={styles.link}>
                <Text variant="body-lg" weight="medium" color={semantic.primary}>
                  이러한 기준을 기반으로 제안을 드렸어요
                </Text>
                <ChevronRightIcon size={14} color={semantic.primary} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <InfoBox style={styles.mt3}>{CARE_DISCLAIMER}</InfoBox>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  term: { width: 104, flexShrink: 0 },
  detail: { flex: 1, minWidth: 0 },
  relaxed: { lineHeight: 24 },
  mt3: { marginTop: 12 },
  expander: { marginTop: 12, borderRadius: radius.lg, borderWidth: 1 },
  expanderButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  expanderBody: { gap: 6, paddingHorizontal: 14, paddingBottom: 14 },
  link: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
  },
});
