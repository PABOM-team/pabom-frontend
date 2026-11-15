import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { filesApi } from "@pabom/core/api/endpoints";
import type { Photo } from "@pabom/core/domain/record";
import { resizeImage, toUploadFile } from "@/shared/lib/image";
import { Spinner } from "./display";
import { PlusIcon } from "./icons";
import { Text } from "./text";
import { radius, semantic } from "./theme";

type Picked = { uri: string; width: number; height: number };
type Pending = { key: string; asset: Picked; status: "uploading" | "failed" };

/** 기기 사진 선택기. 취소하면 빈 목록 */
export async function pickImages(limit: number): Promise<Picked[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}

/** 줄여서 올린다. 사진 한 장 → 서버 파일 */
export async function uploadPicked(asset: Picked, purpose: "record" | "pet") {
  const uri = await resizeImage(asset);
  return filesApi.upload(toUploadFile(uri), purpose);
}

/**
 * 사진 칸 (R03·R02). 고르면 바로 줄여서 올리고, 실패하면 그 칸에서 다시 시도한다 (C2-4).
 * 올린 사진을 누르면 크게 보기. 최대 장수를 넘게 고르면 넘친 사진은 올리지 않는다.
 * 백엔드 기록은 사진을 한 장(photoFileId)만 받아서 기본 최대 장수는 1
 */
export function PhotoInput({
  value,
  onChange,
  max = 1,
  onView,
  onBusyChange,
}: {
  value: Photo[];
  onChange: (photos: Photo[]) => void;
  max?: number;
  onView?: (index: number) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [pending, setPending] = useState<Pending[]>([]);
  // 여러 장을 동시에 올릴 때 마지막 값에 이어 붙이려고 최신 목록을 들고 있는다
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const busy = pending.some((p) => p.status === "uploading");
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const upload = async (item: Pending) => {
    setPending((list) => list.map((p) => (p.key === item.key ? { ...p, status: "uploading" } : p)));
    try {
      const photo = await uploadPicked(item.asset, "record");
      latest.current = [...latest.current, photo];
      onChange(latest.current);
      setPending((list) => list.filter((p) => p.key !== item.key));
    } catch {
      // 실패는 그 칸에 '다시 시도'로 보여 준다 (C2-4)
      setPending((list) =>
        list.map((p) => (p.key === item.key ? { ...p, status: "failed" as const } : p)),
      );
    }
  };

  const pick = async () => {
    const room = max - value.length - pending.length;
    if (room <= 0) return;
    const picked = await pickImages(room);
    const items = picked.slice(0, room).map((asset) => ({
      key: `${asset.uri}-${Math.random()}`,
      asset,
      status: "uploading" as const,
    }));
    if (!items.length) return;
    setPending((list) => [...list, ...items]);
    items.forEach(upload);
  };

  return (
    <View style={styles.row}>
      {value.map((photo, index) => (
        <Pressable
          key={photo.id}
          accessibilityRole="button"
          accessibilityLabel={`사진 ${index + 1} 크게 보기`}
          onPress={() => onView?.(index)}
          style={[styles.box, { borderWidth: 1, borderColor: semantic.input }]}
        >
          <Image source={{ uri: photo.url }} alt="" style={styles.fill} resizeMode="cover" />
        </Pressable>
      ))}
      {pending.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={item.status === "failed" ? "사진 다시 올리기" : "사진 올리는 중"}
          disabled={item.status === "uploading"}
          onPress={() => upload(item)}
          style={[
            styles.box,
            styles.dashed,
            item.status === "failed"
              ? { borderColor: semantic.destructive }
              : { backgroundColor: semantic.placeholder },
          ]}
        >
          {item.status === "uploading" ? (
            <>
              <Spinner />
              <Text variant="body-sm" color={semantic.mutedForeground}>
                올리는 중
              </Text>
            </>
          ) : (
            <>
              <Text variant="body-xl" weight="bold" color={semantic.destructive}>
                !
              </Text>
              <Text variant="body-sm" color={semantic.destructive}>
                다시 시도
              </Text>
            </>
          )}
        </Pressable>
      ))}
      {value.length + pending.length < max ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="사진 추가"
          onPress={pick}
          style={[styles.box, styles.dashed, { backgroundColor: semantic.placeholder }]}
        >
          <PlusIcon size={20} color={semantic.subtleForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  box: {
    width: 64,
    height: 64,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radius.xl,
    gap: 2,
  },
  dashed: { borderWidth: 1.5, borderStyle: "dashed", borderColor: semantic.input },
  fill: { width: "100%", height: "100%" },
});
