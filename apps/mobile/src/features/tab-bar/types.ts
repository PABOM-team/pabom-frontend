export type TabBarRoute = { key: string; name: string };

export type TabBarViewProps = {
  routes: readonly TabBarRoute[];
  activeIndex: number;
  /** 탭을 눌렀다. 이미 고른 탭이면 active=true */
  onSelect: (routeKey: string, active: boolean) => void;
};
