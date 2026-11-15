import { useState, type ReactNode } from "react";
import { Image, Modal, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XIcon } from "./icons";
import { Text } from "./text";
import { semantic } from "./theme";
import { IconButton } from "./top-bar";

/** 사진 크게 보기 (U9). 검은 바탕, 옆으로 밀면 다음 사진, × 또는 뒤로 가기로 닫힘 */
export function PhotoViewer({
  open,
  onOpenChange,
  photos,
  initialIndex = 0,
  caption,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: { id: string; url: string }[];
  initialIndex?: number;
  caption?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setIndex(initialIndex);
  }

  return (
    <Modal
      visible={open}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <IconButton accessibilityLabel="닫기" size={40} onPress={() => onOpenChange(false)}>
            <XIcon color="#ffffff" />
          </IconButton>
          <Text variant="body-xl" color="#ffffff" style={{ paddingRight: 12 }}>
            {index + 1} / {photos.length}
          </Text>
        </View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * width, y: 0 }}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ flex: 1 }}
        >
          {photos.map((photo) => (
            <View key={photo.id} style={[styles.page, { width }]}>
              <Image source={{ uri: photo.url }} alt="" style={styles.image} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(24, insets.bottom) }]}>
          {photos.length > 1 ? (
            <View style={styles.dots} accessibilityElementsHidden>
              {photos.map((photo, i) => (
                <View
                  key={photo.id}
                  style={[
                    styles.dot,
                    { backgroundColor: i === index ? "#ffffff" : "rgba(255,255,255,0.4)" },
                  ]}
                />
              ))}
            </View>
          ) : null}
          {caption ? <View style={{ gap: 2 }}>{caption}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.inverse },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  page: { alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  footer: { paddingHorizontal: 18, paddingTop: 12 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
