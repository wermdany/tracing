import type { MenuProps } from "antd";
import type { LazyExoticComponent, FC } from "react";

import { lazy } from "react";

type RouteItem = Required<MenuProps>["items"][number] & {
  element: LazyExoticComponent<FC>;
  key: string;
  label: string;
};

export const routes: RouteItem[] = [
  {
    key: "/",
    label: "首页",
    element: lazy(() => import("./pages/index"))
  },
  {
    key: "/init",
    label: "初始化",
    element: lazy(() => import("./pages/init"))
  },
  {
    key: "/browser-click",
    label: "点击事件（browser-click）",
    element: lazy(() => import("./pages/browser-click"))
  },
  {
    key: "/browser-sender",
    label: "发送数据（browser-sender）",
    element: lazy(() => import("./pages/browser-sender"))
  }
];
