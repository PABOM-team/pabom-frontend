import { router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { Pressable, type ScrollViewInstance, StyleSheet, View } from "react-native";
import { LEGAL_DOCS, type LegalBlock, type LegalDocType } from "@pabom/core/domain/legal";
import { Segmented } from "@/shared/ui/display";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Text } from "@/shared/ui/text";
import { radius, semantic } from "@/shared/ui/theme";
import { TopBar } from "@/shared/ui/top-bar";

const TAB_LABEL: Record<LegalDocType, string> = {
  terms: "이용약관",
  privacy: "개인정보 처리방침",
};

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "text":
      return <Text style={styles.body}>{block.text}</Text>;
    case "subtitle":
      return (
        <Text weight="bold" style={[styles.body, { paddingTop: 4 }]}>
          {block.text}
        </Text>
      );
    case "list":
      return (
        <View style={{ gap: 4 }}>
          {block.items.map((item) => (
            <View key={item} style={styles.listItem}>
              <Text color={semantic.mutedForeground} style={styles.body}>
                •
              </Text>
              <Text style={[styles.body, { flex: 1 }]}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case "fields":
      return (
        <View style={{ gap: 6 }}>
          {block.items.map(({ label, value }) => (
            <Text key={label} style={styles.body}>
              <Text weight="bold">
                {label}
                {block.colon ? ":" : ""}
              </Text>{" "}
              {value}
            </Text>
          ))}
        </View>
      );
    case "table":
      return (
        <View style={styles.table}>
          <View style={[styles.tableRow, { backgroundColor: semantic.muted }]}>
            {block.head.map((h) => (
              <Text
                key={h}
                variant="body-md"
                weight="medium"
                color={semantic.mutedForeground}
                style={styles.cell}
              >
                {h}
              </Text>
            ))}
          </View>
          {block.rows.map((row) => (
            <View key={row.join("|")} style={[styles.tableRow, styles.tableRowBorder]}>
              {row.map((cell, j) => (
                <Text key={j} variant="body-md" style={styles.cell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    case "note":
      return (
        <View style={styles.note}>
          <Text color={semantic.secondaryText} style={styles.body}>
            {block.text}
          </Text>
        </View>
      );
  }
}

function Blocks({ blocks }: { blocks: readonly LegalBlock[] }) {
  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </View>
  );
}

/** SCR-S03 이용약관·개인정보 처리방침 */
export default function TermsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: LegalDocType = params.tab === "privacy" ? "privacy" : "terms";
  const doc = LEGAL_DOCS[tab];
  const scrollRef = useRef<ScrollViewInstance>(null);
  // 목차를 누르면 그 조로 스크롤하려고 각 조의 세로 위치를 모아 둔다
  const offsets = useRef<Readonly<Record<number, number>>>({});

  return (
    // 목차 상자·표가 회색이라 흰 화면에 그린다
    <Screen tone="white">
      <TopBar title={TAB_LABEL[tab]} fallbackHref="/settings" />
      <ScreenBody scrollRef={scrollRef}>
        <Segmented
          label="문서"
          options={[
            { value: "terms", label: TAB_LABEL.terms },
            { value: "privacy", label: TAB_LABEL.privacy },
          ]}
          value={tab}
          onChange={(next) => {
            scrollRef.current?.scrollTo({ y: 0, animated: false });
            router.setParams({ tab: next === "privacy" ? "privacy" : undefined });
          }}
        />
        <Text variant="title-xs" style={{ marginTop: 20 }}>
          {doc.title}
        </Text>
        <Text variant="body-md" color={semantic.mutedForeground} style={{ marginTop: 6 }}>
          {doc.meta}
        </Text>
        <View style={{ marginTop: 16 }}>
          <Blocks blocks={doc.intro} />
        </View>
        <View style={styles.toc}>
          <Text weight="bold" style={{ marginBottom: 4 }}>
            목차
          </Text>
          {doc.sections.map((s, i) => (
            <Pressable
              key={s.title}
              accessibilityRole="link"
              onPress={() =>
                scrollRef.current?.scrollTo({ y: (offsets.current[i] ?? 0) - 12, animated: true })
              }
            >
              <Text color={semantic.primary} style={{ paddingVertical: 2 }}>
                {s.title}
              </Text>
            </Pressable>
          ))}
        </View>
        {doc.sections.map((s, i) => (
          <View
            key={`${tab}-${s.title}`}
            style={{ marginTop: 24 }}
            onLayout={(e) => {
              offsets.current = { ...offsets.current, [i]: e.nativeEvent.layout.y };
            }}
          >
            <Text variant="body-xl" weight="bold" style={{ marginBottom: 10 }}>
              {s.title}
            </Text>
            <Blocks blocks={s.blocks} />
          </View>
        ))}
        <View style={styles.outro}>
          <Blocks blocks={doc.outro} />
        </View>
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { lineHeight: 22 },
  listItem: { flexDirection: "row", gap: 8, paddingLeft: 4 },
  table: {
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  tableRow: { flexDirection: "row" },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: semantic.border },
  cell: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  note: { borderLeftWidth: 3, borderLeftColor: semantic.border, paddingLeft: 12 },
  toc: { marginTop: 16, borderRadius: radius.md, backgroundColor: semantic.muted, padding: 12 },
  outro: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
});
