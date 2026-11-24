import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheet } from "@/shared/ui/bottom-sheet";

/**
 * 제목·× 없이 내용을 마음대로 채우는 바텀 시트 (Figma H02 '바텀 시트'·'기록 시트').
 * 공통 Sheet 는 제목 줄이 정해져 있어 할 일 머리·키패드를 넣을 수 없어 여기서 따로 그린다.
 * onClosed 는 닫힘 애니메이션이 끝나 창이 내려간 뒤 불린다 (다음 시트는 여기서 띄워야 iOS 에서 안 막힌다)
 */
export function SheetFrame({
  open,
  onOpenChange,
  onClosed,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <BottomSheet
      open={open}
      onRequestClose={() => onOpenChange(false)}
      onClosed={onClosed}
      contentStyle={styles.content}
      footer={footer ? <View style={styles.footer}>{footer}</View> : undefined}
    >
      {children}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4 },
  footer: { paddingHorizontal: 20 },
});
