import {
  createContext,
  Fragment,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";

type PortalApi = {
  set: (key: string, node: ReactNode) => void;
  remove: (key: string) => void;
};

const PortalContext = createContext<PortalApi | null>(null);

type Entry = { key: string; node: ReactNode };

/**
 * 시트·창을 그리는 앱 맨 위 층. 앱 뿌리(_layout)에서 화면 스택을 감싼다.
 * 네이티브 Modal 은 누를 때마다 iOS 가 새 창(UIViewController)을 띄워 첫 프레임이 늦고,
 * 닫힌 뒤에도 창이 다 내려갈 때까지 다른 창(사진 선택기 등)을 못 띄운다. 같은 화면 위 층에 그리면 둘 다 없다
 */
export function PortalHost({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const api = useMemo<PortalApi>(
    () => ({
      set: (key, node) =>
        setEntries((prev) =>
          prev.some((entry) => entry.key === key)
            ? prev.map((entry) => (entry.key === key ? { key, node } : entry))
            : [...prev, { key, node }],
        ),
      remove: (key) => setEntries((prev) => prev.filter((entry) => entry.key !== key)),
    }),
    [],
  );

  return (
    <PortalContext value={api}>
      {children}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {entries.map((entry) => (
          <Fragment key={entry.key}>{entry.node}</Fragment>
        ))}
      </View>
    </PortalContext>
  );
}

/** 자식을 PortalHost 층에 그린다. 앱 뿌리의 컨텍스트(쿼리·안전 영역)만 이어진다 */
export function Portal({ children }: { children: ReactNode }) {
  const api = useContext(PortalContext);
  const key = useId();
  if (!api) throw new Error("Portal 은 PortalHost 안에서만 쓸 수 있어요");
  // 같은 커밋 안에 층에 반영해 내용이 한 프레임 늦게 그려지지 않게 한다
  useLayoutEffect(() => {
    api.set(key, children);
  }, [api, key, children]);
  useLayoutEffect(() => () => api.remove(key), [api, key]);
  return null;
}
