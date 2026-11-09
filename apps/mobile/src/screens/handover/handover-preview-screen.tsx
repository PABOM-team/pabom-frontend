import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FullScreenLoading, LoginButtons } from "@/features/auth";
import { UnavailableCard } from "@/features/handover";
import { handoverQueries } from "@/entities/handover";
import { meQueries } from "@/entities/session";
import { feedResultSetOf, speciesQueries, stageName, useSpeciesMap } from "@/entities/species";
import { formatInterval, intakeLabelFor } from "@pabom/core/domain/care";
import { SPECIES_LABEL } from "@pabom/core/domain/pet";
import { formatMonthDay, ymdOf } from "@pabom/core/lib/date";
import { Button } from "@/shared/ui/button";
import { Avatar, PhotoBox } from "@/shared/ui/display";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { PabomLogo } from "@/shared/ui/pabom-logo";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";

/** 미리보기에서 먼저 보여 줄 최근 기록 줄 수 (U7) */
const PREVIEW_RECORDS = 3;

export function HandoverPreviewScreen({ code }: { code: string }) {
  const [showAll, setShowAll] = useState(false);
  const preview = useQuery(handoverQueries.preview(code));
  const { data: me } = useQuery({ ...meQueries.detail(), retry: false });
  const species = useSpeciesMap();
  const previewSpeciesId = preview.data?.pet?.speciesId;
  // 급여 기록의 먹은 정도 이름을 종의 먹이 묶음에 맞춘다 (기록의 careItem은 항목 이름이라 이름으로 찾는다)
  const { data: careStandards } = useQuery({
    ...speciesQueries.careStandards(previewSpeciesId ?? "crested_gecko"),
    enabled: previewSpeciesId !== undefined,
  });
  const registerPath = `/share/${code}/register`;

  if (preview.isPending) return <FullScreenLoading />;

  const pet = preview.data?.pet;
  if (preview.isError || !pet || preview.data.status !== "unused") {
    return <UnavailableCard loggedIn={Boolean(me)} />;
  }
  const data = preview.data;
  const spec = species.get(pet.speciesId);

  return (
    <Screen>
      <ScreenBody contentStyle={{ paddingTop: 16 }}>
        <View style={{ alignSelf: "flex-start" }}>
          <PabomLogo size="sm" />
        </View>
        <Text variant="title-xs" style={{ marginTop: 12 }}>
          {data.senderNickname ? `${data.senderNickname}님이 보낸 인계 카드` : "인계 카드"}
        </Text>
        <View style={styles.petCard}>
          <Avatar size={52} />
          <View style={styles.grow}>
            <Text variant="title-xs">{pet.name}</Text>
            <Text variant="body-md" color={semantic.mutedForeground}>
              {[SPECIES_LABEL[pet.speciesId], pet.morph].filter(Boolean).join(" · ")}
            </Text>
            <Text variant="body-md" color={semantic.mutedForeground}>
              {stageName(spec, pet.lifeStageCode)} · 분양일 {formatMonthDay(pet.handedOverOn)}
            </Text>
          </View>
        </View>

        {data.routines.length ? (
          <>
            <Text variant="body-lg" weight="medium" style={styles.sectionTitle}>
              체크 리스트
            </Text>
            <View>
              {data.routines.map((r) => (
                <View key={r.careItem} style={[styles.line, { justifyContent: "space-between" }]}>
                  <Text variant="body-lg">{r.careItemName}</Text>
                  <Text variant="body-lg" color={semantic.mutedForeground}>
                    {formatInterval(r.intervalDays)}
                  </Text>
                </View>
              ))}
            </View>
            <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 8 }}>
              보낸 분이 쓰던 체크 리스트예요. 등록한 뒤 내 환경에 맞게 바꿀 수 있어요.
            </Text>
          </>
        ) : null}

        <Text variant="body-lg" weight="medium" style={styles.sectionTitle}>
          최근 기록
          {data.records ? (
            <Text variant="body-lg" weight="medium" color={semantic.mutedForeground}>
              {" "}
              · 최근 {data.recordWeeks}주 · {data.records.length}개
            </Text>
          ) : null}
        </Text>
        {data.records ? (
          <View>
            {(showAll ? data.records : data.records.slice(0, PREVIEW_RECORDS)).map((r) => (
              <View key={r.occurredAt} style={[styles.line, { gap: 12 }]}>
                {/* 사진이 붙은 기록은 왼쪽에 사진 자리 (U7) */}
                {r.photoCount ? <PhotoBox /> : null}
                <View style={styles.grow}>
                  {/* 인계 API는 스웨거에 없어 목업이 항목 이름으로 준다 [백엔드 확인 필요] */}
                  <Text variant="body-lg">
                    {formatMonthDay(ymdOf(r.occurredAt))} {r.careItem}
                    {r.intake
                      ? ` · ${intakeLabelFor(feedResultSetOf(careStandards, r.careItem), r.intake)}`
                      : ""}
                    {r.weightG ? ` · ${r.weightG.toFixed(1)} g` : ""}
                  </Text>
                  {r.memo ? (
                    <Text variant="body-md" color={semantic.mutedForeground}>
                      {r.memo}
                    </Text>
                  ) : null}
                </View>
                {r.method === "routine" ? (
                  <Text
                    variant="body-md"
                    color={semantic.mutedForeground}
                    style={{ flexShrink: 0 }}
                  >
                    할 일 체크
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 8 }}>
            보낸 분이 고른 경우에만 보여요
          </Text>
        )}
        {data.records && data.records.length > PREVIEW_RECORDS && !showAll ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowAll(true)}
            style={styles.more}
          >
            <Text variant="body-lg" weight="medium" color={semantic.primary}>
              기록 {data.records.length}개 모두 보기
            </Text>
            <ChevronRightIcon size={14} color={semantic.primary} />
          </Pressable>
        ) : null}
      </ScreenBody>
      <ScreenFooter>
        {me ? (
          <Button
            size="xl"
            onPress={() =>
              router.push({ pathname: "/share/[token]/register", params: { token: code } })
            }
          >
            내 개체로 등록하기
          </Button>
        ) : (
          <LoginButtons
            next={registerPath}
            labels={{ kakao: "카카오로 시작하고 등록하기", google: "Google로 시작하고 등록하기" }}
          />
        )}
      </ScreenFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  petCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 12,
    padding: 14,
    borderWidth: 1.3,
    borderColor: semantic.input,
    borderRadius: radius.xl,
  },
  grow: { flex: 1, minWidth: 0 },
  sectionTitle: { marginTop: 20 },
  line: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  more: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
    marginTop: 4,
  },
});
