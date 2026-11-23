import type { JSX } from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { CogIcon, HomeIcon, PawPrintIcon, type IconProps } from "@/shared/ui/icons";

/** 고른 탭에만 쓰는 채운 아이콘 (Figma 탭바 · 선택됨) */
const SolidHomeIcon = ({ size = 24, color }: IconProps) => (
  <Svg viewBox="0 0 20 20" width={size} height={size}>
    <Path
      d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7a1 1 0 0 0 1.414 1.414L4 10.414V17a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6.586l.293.293a1 1 0 0 0 1.414-1.414l-7-7Z"
      fill={color}
    />
  </Svg>
);

const SolidPawPrintIcon = ({ size = 24, color }: IconProps) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Circle cx={11} cy={4} r={2.4} fill={color} />
    <Circle cx={18} cy={8} r={2.4} fill={color} />
    <Circle cx={20} cy={16} r={2.4} fill={color} />
    <Path
      d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"
      fill={color}
      stroke={color}
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
  </Svg>
);

const SolidCogIcon = ({ size = 24, color }: IconProps) => (
  <Svg viewBox="0 0 20 20" width={size} height={size}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      fill={color}
    />
  </Svg>
);

export type TabMeta = {
  label: string;
  icon: (props: IconProps) => JSX.Element;
  activeIcon: (props: IconProps) => JSX.Element;
};

/** 하단 탭 3개. 키는 app/(app)/(tabs) 의 라우트 이름 */
export const TABS: Readonly<Record<string, TabMeta>> = {
  home: { label: "홈", icon: HomeIcon, activeIcon: SolidHomeIcon },
  pets: { label: "개체", icon: PawPrintIcon, activeIcon: SolidPawPrintIcon },
  settings: { label: "설정", icon: CogIcon, activeIcon: SolidCogIcon },
};
