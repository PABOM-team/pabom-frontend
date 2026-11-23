import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { filesApi } from "@pabom/core/api/endpoints";
import type { Photo } from "@pabom/core/domain/record";
import { resizeImage, toUploadFile } from "@/shared/lib/image";
import { ExclamationCircleIcon, PlusIcon } from "./icons";
import { Menu } from "./menu";
import { Spinner } from "./spinner";
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

/**
 * 카메라로 한 장 찍는다 (T08-04). 취소하면 빈 목록.
 * 권한을 거부했으면 설정으로 가는 안내를 띄운다. 카메라가 없는 기기(시뮬레이터)도 안내로 끝낸다
 */
export async function takePhoto(): Promise<Picked[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("카메라 권한이 필요해요", "설정에서 파봄의 카메라 접근을 허용해 주세요.", [
      { text: "닫기", style: "cancel" },
      { text: "설정으로 가기", onPress: () => void Linking.openSettings() },
    ]);
    return [];
  }
  try {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled) return [];
    return result.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
  } catch {
    Alert.alert("카메라를 열 수 없어요", "앨범에서 사진을 골라 주세요.");
    return [];
  }
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

  const pick = async (source: "library" | "camera") => {
    const room = max - value.length - pending.length;
    if (room <= 0) return;
    const picked = source === "camera" ? await takePhoto() : await pickImages(room);
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
          style={[styles.box, styles.photo]}
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
          style={[styles.box, styles.dashed, item.status === "failed" && styles.failed]}
        >
          {item.status === "uploading" ? (
            <>
              <Spinner label="사진 올리는 중" />
              <Text variant="body-md" weight="medium" color={semantic.subtleForeground}>
                올리는 중
              </Text>
            </>
          ) : (
            <>
              <ExclamationCircleIcon size={24} color={semantic.destructive} />
              <Text variant="body-md" weight="medium" color={semantic.destructive}>
                다시 시도
              </Text>
            </>
          )}
        </Pressable>
      ))}
      {value.length + pending.length < max ? (
        // + 를 누르면 앨범·카메라 중 고른다 (T08-04)
        <View style={[styles.box, styles.dashed]}>
          <Menu
            label="사진 추가"
            triggerSize={64}
            trigger={<PlusIcon size={20} color={semantic.mutedForeground} />}
            items={[
              { label: "앨범에서 고르기", onSelect: () => void pick("library") },
              { label: "카메라로 찍기", onSelect: () => void pick("camera") },
            ]}
          />
        </View>
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
    borderRadius: radius.lg,
    gap: 2,
  },
  /** Figma 사진 칸: gray-100 바탕 · gray-300 점선 1.5 · 모서리 12 */
  dashed: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: semantic.input,
    backgroundColor: semantic.secondary,
  },
  failed: { borderColor: semantic.destructive, backgroundColor: semantic.card },
  photo: { backgroundColor: semantic.secondary },
  fill: { width: "100%", height: "100%" },
});
