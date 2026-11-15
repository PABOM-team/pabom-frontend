import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { petSpeciesLine } from "@/entities/pet";
import { recordQueries } from "@/entities/record";
import { meQueries } from "@/entities/session";
import { stageName, useSpeciesMap } from "@/entities/species";
import { handoverApi } from "@pabom/core/api/endpoints";
import type { PetDetail } from "@pabom/core/api/endpoints";
import { getErrorMessage } from "@pabom/core/api/errors";
import { queryKeys } from "@pabom/core/api/query-keys";
import { RECORD_WEEKS, type HandoverCard, type HandoverScope } from "@pabom/core/domain/handover";
import { formatMonthDay, subDays, toYmd, todayYmd, ymdOf } from "@pabom/core/lib/date";
import { copyText, shareLink } from "@/shared/lib/share";
import { Button } from "@/shared/ui/button";
import { ChipGroup } from "@/shared/ui/chip";
import { Avatar, Badge, InfoBox, StepProgress } from "@/shared/ui/display";
import { Checkbox } from "@/shared/ui/form";
import { XIcon } from "@/shared/ui/icons";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { colors, radius, semantic } from "@/shared/ui/theme";
import { toast } from "@/shared/ui/toast";
import { IconButton, TopBar } from "@/shared/ui/top-bar";
import { saveQr, type QrHandle } from "./qr";

/**
 * SCR-T01 인계 카드 만들기 (2차). 동의한 범위만 링크·QR로 넘긴다.
 * 받는 사람의 연락처·실명은 어디에도 받지 않는다.
 */
export function CreateHandoverFlow({ detail }: { detail: PetDetail }) {
  const queryClient = useQueryClient();
  const { pet, routines } = detail;
  const species = useSpeciesMap();
  const { data: me } = useQuery(meQueries.detail());
  const [step, setStep] = useState<1 | 2>(1);
  const [scope, setScope] = useState<HandoverScope>({
    routines: true,
    recordWeeks: 0,
    photos: false,
    nickname: false,
  });
  const [agreed, setAgreed] = useState(false);
  const [card, setCard] = useState<HandoverCard | null>(null);

  const since = toYmd(subDays(new Date(), scope.recordWeeks * 7));
  const { data: records } = useQuery({
    ...recordQueries.list({ petId: pet.id, from: since, to: todayYmd(), limit: 200 }),
    enabled: scope.recordWeeks > 0,
  });
  const recordCount = records?.items.length ?? 0;
  const photoCount = records?.items.reduce((n, r) => n + r.photos.length, 0) ?? 0;
  const enabledRoutines = routines.filter((r) => r.enabled).length;
  const stage = stageName(species.get(pet.speciesId), pet.lifeStageCode);
  const close = () => router.replace({ pathname: "/pets/[petId]", params: { petId: pet.id } });

  const create = useMutation({
    mutationFn: () => handoverApi.create(pet.id, scope),
    onSuccess: (created) => {
      setCard(created);
      void queryClient.invalidateQueries({ queryKey: queryKeys.handoverCards });
    },
    onError: (error) => toast(getErrorMessage(error, "카드를 만들지 못했어요.")),
  });

  if (card) return <HandoverResult card={card} onClose={close} />;

  return (
    <Screen>
      <TopBar
        title="인계 카드 만들기"
        onLeading={step === 2 ? () => setStep(1) : undefined}
        fallbackHref={{ pathname: "/pets/[petId]", params: { petId: pet.id } }}
        trailing={
          <IconButton accessibilityLabel="닫기" size={40} onPress={close}>
            <XIcon />
          </IconButton>
        }
      />
      <ScreenBody gap={16}>
        <StepProgress step={step} total={2} label={step === 1 ? "넘길 내용" : "확인·동의"} />
        {step === 1 ? (
          <View>
            <ScopeRow locked title="개체 기본 정보" description="이름·종·모프·생애 단계" />
            <ScopeRow locked title="분양일" />
            <ScopeRow
              title="체크 리스트"
              description="받는 분이 이어서 쓸 수 있어요"
              checked={scope.routines}
              onChange={(routinesOn) => setScope({ ...scope, routines: routinesOn })}
            />
            <View style={styles.row}>
              <Text
                variant="body-lg"
                weight="medium"
                color={semantic.secondaryText}
                style={{ marginBottom: 8 }}
              >
                최근 기록
              </Text>
              <ChipGroup
                label="최근 기록"
                options={RECORD_WEEKS.map((w) => ({
                  value: w,
                  label: w === 0 ? "넘기지 않음" : `최근 ${w}주`,
                }))}
                value={scope.recordWeeks}
                onChange={(w) =>
                  setScope({ ...scope, recordWeeks: w ?? 0, photos: w ? scope.photos : false })
                }
              />
              {scope.recordWeeks > 0 ? (
                <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 8 }}>
                  {scope.photos
                    ? `기록 ${recordCount}개 · 사진 ${photoCount}장이 함께 넘어가요`
                    : `기록 ${recordCount}개가 함께 넘어가요`}
                </Text>
              ) : null}
            </View>
            <ScopeRow
              title="사진"
              description={scope.recordWeeks ? `기록에 붙은 사진 ${photoCount}장` : undefined}
              checked={scope.photos}
              disabled={scope.recordWeeks === 0}
              onChange={(photos) => setScope({ ...scope, photos })}
            />
            <ScopeRow
              title="내 닉네임 보여 주기"
              description={
                scope.nickname && me?.nickname
                  ? `받는 분에게 '${me.nickname}'로 보여요`
                  : "고른 경우에만 보여요"
              }
              checked={scope.nickname}
              onChange={(nickname) => setScope({ ...scope, nickname })}
            />
          </View>
        ) : (
          <>
            <Text variant="title-xs">받는 분에게 이렇게 보여요</Text>
            <View style={styles.previewCard}>
              <Avatar src={pet.photoUrl} size={52} />
              <View style={styles.grow}>
                <Text variant="title-xs">{pet.name}</Text>
                <Text variant="body-md" color={semantic.mutedForeground}>
                  {petSpeciesLine(pet)} · {stage}
                </Text>
                <Text variant="body-md" color={semantic.mutedForeground}>
                  분양일 {formatMonthDay(todayYmd())}
                  {scope.routines ? ` · 체크 리스트 ${enabledRoutines}개` : ""}
                </Text>
              </View>
            </View>
            <InfoBox style={{ gap: 2 }}>
              <Text variant="body-md" color={semantic.secondaryText}>
                최근 기록 ·{" "}
                {scope.recordWeeks ? `최근 ${scope.recordWeeks}주 ${recordCount}개` : "넘기지 않음"}
              </Text>
              <Text variant="body-md" color={semantic.secondaryText}>
                사진 · {scope.photos ? `${photoCount}장` : "넘기지 않음"}
              </Text>
              <Text variant="body-md" color={semantic.secondaryText}>
                내 닉네임 · {scope.nickname ? "보여요" : "보이지 않음"}
              </Text>
            </InfoBox>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              onPress={() => setAgreed(!agreed)}
              style={styles.agree}
            >
              <Checkbox checked={agreed} onChange={setAgreed} />
              <Text variant="body-lg" style={styles.grow}>
                이 범위로 넘기는 데 동의해요
              </Text>
            </Pressable>
          </>
        )}
      </ScreenBody>
      <ScreenFooter>
        {step === 1 ? (
          <Button size="xl" onPress={() => setStep(2)}>
            다음
          </Button>
        ) : (
          <Button size="xl" disabled={!agreed || create.isPending} onPress={() => create.mutate()}>
            {create.isPending ? "만드는 중…" : "카드 만들기"}
          </Button>
        )}
      </ScreenFooter>
    </Screen>
  );
}

function ScopeRow({
  title,
  description,
  locked,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description?: string;
  locked?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (on: boolean) => void;
}) {
  const on = locked ? true : Boolean(checked);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: locked || disabled }}
      disabled={locked || disabled}
      onPress={() => onChange?.(!on)}
      style={[styles.row, styles.scopeRow]}
    >
      <Checkbox checked={on} disabled={locked || disabled} onChange={(next) => onChange?.(next)} />
      <View style={styles.grow}>
        <Text variant="body-xl" weight="bold">
          {title}
        </Text>
        {description ? (
          <Text variant="body-md" color={semantic.mutedForeground}>
            {description}
          </Text>
        ) : null}
      </View>
      {locked ? <Badge>항상 넘겨요</Badge> : null}
    </Pressable>
  );
}

function HandoverResult({ card, onClose }: { card: HandoverCard; onClose: () => void }) {
  const qrRef = useRef<QrHandle | null>(null);
  return (
    <Screen>
      <TopBar
        title="인계 카드 만들기 · 결과"
        trailing={
          <IconButton accessibilityLabel="닫기" size={40} onPress={onClose}>
            <XIcon />
          </IconButton>
        }
      />
      <ScreenBody>
        <View style={styles.resultCard}>
          <Text variant="title-xs">인계 카드를 만들었어요</Text>
          <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 4 }}>
            {formatMonthDay(ymdOf(card.expiresAt))}까지 열 수 있어요
          </Text>
          <View style={styles.qrBox}>
            <QRCode
              value={card.url}
              size={132}
              getRef={(c: QrHandle | null) => (qrRef.current = c)}
            />
          </View>
          <Button size="xl" onPress={() => copyText(card.url, "링크를 복사했어요")}>
            링크 복사
          </Button>
          <View style={styles.actions}>
            <Button
              variant="outline"
              size="lg"
              style={styles.grow}
              onPress={() => shareLink(card.url)}
            >
              공유하기
            </Button>
            <Button
              variant="outline"
              size="lg"
              style={styles.grow}
              onPress={() => saveQr(qrRef, `pabom-${card.code}.png`)}
            >
              QR 저장
            </Button>
          </View>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/settings/handover-cards")}
            style={styles.link}
          >
            <Text variant="body-lg" weight="medium" color={semantic.primary} align="center">
              보낸 카드 보기
            </Text>
          </Pressable>
        </View>
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: semantic.border },
  scopeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderWidth: 1.3,
    borderColor: semantic.input,
    borderRadius: radius.xl,
  },
  agree: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultCard: {
    padding: 16,
    borderWidth: 1.3,
    borderColor: semantic.input,
    borderRadius: radius.xl,
  },
  qrBox: {
    alignSelf: "center",
    marginVertical: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: semantic.input,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  link: { marginTop: 12, minHeight: 44, justifyContent: "center" },
});
