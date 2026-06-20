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
  },
  {
    key: "/browser-resource",
    label: "监控资源加载（browser-resource)",
    element: lazy(() => import("./pages/browser-resource"))
  },
  {
    key: "/browser-page",
    label: "页面停留时间（browser-page）",
    element: lazy(() => import("./pages/browser-page"))
  },
  {
    key: "/browser-scroll",
    label: "滚动停留时间（browser-scroll）",
    element: lazy(() => import("./pages/browser-scroll"))
  },
  {
    key: "/browser-http-axios",
    label: "Axios 监控（browser-http-axios）",
    element: lazy(() => import("./pages/browser-http-axios"))
  },
  {
    key: "/browser-error",
    label: "错误监控（browser-error）",
    element: lazy(() => import("./pages/browser-error"))
  },
  {
    key: "/browser-performance",
    label: "性能指标（browser-performance）",
    element: lazy(() => import("./pages/browser-performance"))
  },
  {
    key: "/browser-expose",
    label: "元素曝光率（browser-expose）",
    element: lazy(() => import("./pages/browser-expose"))
  }
];
