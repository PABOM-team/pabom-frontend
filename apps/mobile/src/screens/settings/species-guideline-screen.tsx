import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { petQueries } from "@/entities/pet";
import { CareItemIcon } from "@/entities/record";
import { speciesQueries } from "@/entities/species";
import { CARE_DISCLAIMER, formatInterval } from "@pabom/core/domain/care";
import { speciesIdSchema, type CareStandard, type EvidenceLevel } from "@pabom/core/domain/species";
import { Badge, LoadError, Skeleton, StateMessage, type BadgeTone } from "@/shared/ui/display";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenCenter } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";
import { Group, GroupRow, PAGE_PADDING, RowText, SectionLabel } from "./settings-ui";
import { ZoomLink } from "@/shared/ui/zoom-link";

/** 근거 배지 (Figma: 파봄 기준 회색 · 수의 자료 파랑) */
const EVIDENCE_BADGE: Record<EvidenceLevel, { label: string; tone: BadgeTone }> = {
  TEAM_JUDGMENT: { label: "파봄 기준", tone: "hint" },
  VET_SOURCE: { label: "수의 자료", tone: "info" },
  TEXTBOOK: { label: "교재 자료", tone: "info" },
};

/** 받침이 있으면 '은', 없으면 '는' (콩이는 · 달은) */
const topicParticle = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? "은" : "는";
};

const intervalLine = (row: CareStandard) =>
  row.minDays !== row.maxDays
    ? `${formatInterval(row.intervalDays)} · ${row.minDays}~${row.maxDays}일`
    : formatInterval(row.intervalDays);

const hostOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

/**
 * SCR-S04 2·3 종 가이드라인. 생애 단계 탭 · 이렇게 돌봐 주세요 · 필요하면 추가해요 · 참고한 자료(시트 5).
 * 내 개체에서 들어오면(petId) 그 개체의 단계로 열고 개체 이름으로 안내한다
 */
export function SpeciesGuidelineScreen() {
  const params = useLocalSearchParams<{ speciesId: string; petId?: string }>();
  const parsed = speciesIdSchema.safeParse(params.speciesId);
  const speciesList = useQuery(speciesQueries.list());
  const table = useQuery({
    ...speciesQueries.careStandards(parsed.success ? parsed.data : "crested_gecko"),
    enabled: parsed.success,
  });
  const pet = useQuery({
    ...petQueries.detail(params.petId ?? ""),
    enabled: Boolean(params.petId),
  });
  const species = speciesList.data?.find((s) => s.id === params.speciesId);
  const [pickedStage, setPickedStage] = useState<string | null>(null);
  const [refsOpen, setRefsOpen] = useState(false);

  if (!parsed.success) {
    return (
      <Screen style={{ backgroundColor: semantic.screen }}>
        <TopBar
          title="가이드라인"
          fallbackHref="/settings/guidelines"
          style={{ backgroundColor: semantic.screen }}
        />
        <ScreenCenter>
          <StateMessage title="지원하지 않는 종이에요" />
        </ScreenCenter>
      </Screen>
    );
  }

  const stages = species?.lifeStages ?? [];
  const petStage = stages.find((s) => s.code === pet.data?.pet.lifeStageCode)?.code;
  const stage = pickedStage ?? petStage ?? stages[0]?.code;
  const rows = (table.data?.standards ?? []).filter((s) => s.lifeStageCode === stage);
  const basic = rows.filter((r) => r.defaultEnabled);
  const optional = rows.filter((r) => !r.defaultEnabled);
  const petName = pet.data?.pet.name;
  const stageLabel = stages.find((s) => s.code === petStage)?.name;

  const careRow = (row: CareStandard, index: number, action: "badge" | "add") => {
    const badge = row.evidenceLevel ? EVIDENCE_BADGE[row.evidenceLevel] : null;
    return (
      <GroupRow key={row.careItem} divider={index > 0} dividerInset={64}>
        <CareItemIcon code={row.careItem} />
        <RowText title={row.careItemName} description={intervalLine(row)} />
        {action === "add" ? (
          params.petId ? (
            <ZoomLink
              href={{ pathname: "/pets/[petId]/routines", params: { petId: params.petId } }}
            >
              <Pressable accessibilityRole="link" hitSlop={8}>
                <Text variant="body-xl" weight="semibold" color={semantic.primary}>
                  추가
                </Text>
              </Pressable>
            </ZoomLink>
          ) : null
        ) : badge ? (
          <Badge tone={badge.tone} size="md" shape="square">
            {badge.label}
          </Badge>
        ) : null}
      </GroupRow>
    );
  };

  return (
    <Screen style={{ backgroundColor: semantic.screen }}>
      <TopBar
        title={species?.commonName ?? "가이드라인"}
        fallbackHref="/settings/guidelines"
        style={{ backgroundColor: semantic.screen }}
      />
      <ScreenBody flush contentStyle={styles.content} gap={12}>
        {table.isPending || !species ? (
          <Skeleton height={320} style={{ borderRadius: radius["2xl"] }} />
        ) : table.isError ? (
          <LoadError onRetry={() => void table.refetch()} />
        ) : (
          <>
            <View accessibilityRole="tablist" style={styles.tabs}>
              {stages.map((s) => {
                const selected = s.code === stage;
                return (
                  <Pressable
                    key={s.code}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setPickedStage(s.code)}
                    style={[styles.tab, selected && styles.tabSelected]}
                  >
                    <Text
                      variant="body-xl"
                      weight="semibold"
                      color={selected ? semantic.foreground : semantic.mutedForeground}
                    >
                      {s.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="body-md" color={semantic.mutedForeground}>
              {petName && stageLabel
                ? `${petName}${topicParticle(petName)} ${stageLabel}예요 · `
                : ""}
              체중이 {species.adultWeightG} g을 넘으면 성체로 봐요
            </Text>

            {basic.length > 0 ? (
              <>
                <SectionLabel inGap>이렇게 돌봐 주세요</SectionLabel>
                <Group>{basic.map((row, i) => careRow(row, i, "badge"))}</Group>
              </>
            ) : null}

            {optional.length > 0 ? (
              <>
                <SectionLabel inGap>필요하면 추가해요</SectionLabel>
                <Group>{optional.map((row, i) => careRow(row, i, "add"))}</Group>
              </>
            ) : null}

            {table.data.references.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setRefsOpen(true)}
                style={({ pressed }) => [styles.refs, pressed && { opacity: 0.7 }]}
              >
                <Text
                  variant="body-xl"
                  weight="semibold"
                  color={semantic.secondaryText}
                  style={styles.grow}
                >
                  참고한 자료 {table.data.references.length}개
                </Text>
                <ChevronRightIcon size={20} color={semantic.foreground} />
              </Pressable>
            ) : null}

            <Text variant="body-md" color={semantic.mutedForeground} style={styles.relaxed}>
              {CARE_DISCLAIMER}
            </Text>
            <Text variant="body-md" color={semantic.subtleForeground}>
              관리 가이드라인 v{table.data.version}
              {table.data.effectiveFrom ? ` · ${table.data.effectiveFrom} 적용` : ""}
              {table.data.isDraft ? " (예시)" : ""}
            </Text>
          </>
        )}
      </ScreenBody>

      <Sheet
        open={refsOpen}
        onOpenChange={setRefsOpen}
        title="참고한 자료"
        description={table.data?.reviewNote ?? "이 가이드라인을 만들 때 본 자료예요."}
      >
        {(table.data?.references ?? []).map((ref) => {
          const host = hostOf(ref.url);
          const body = (
            <>
              <View style={styles.grow}>
                <Text variant="body-xl" weight="semibold">
                  {ref.title}
                </Text>
                {host ? (
                  <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 2 }}>
                    {host}
                  </Text>
                ) : null}
              </View>
              {ref.url ? <ChevronRightIcon size={20} color={semantic.subtleForeground} /> : null}
            </>
          );
          return ref.url ? (
            <Pressable
              key={ref.title}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(ref.url ?? "")}
              style={styles.refRow}
            >
              {body}
            </Pressable>
          ) : (
            <View key={ref.title} style={styles.refRow}>
              {body}
            </View>
          );
        })}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: PAGE_PADDING, paddingTop: 10, paddingBottom: 40 },
  grow: { flex: 1, minWidth: 0 },
  relaxed: { lineHeight: 18 },
  tabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.lg,
    backgroundColor: semantic.border,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.md },
  tabSelected: { backgroundColor: semantic.card },
  refs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.xl,
    backgroundColor: semantic.card,
  },
  refRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
});
