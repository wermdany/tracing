# @tracing/browser-page

页面访问追踪插件，用于 `@tracing/core`。采集用户进入页面的来源路径、停留时长以及离开时的目标路径和触发元素，同时支持 SPA 和 MPA 场景。

## 安装

```bash
pnpm add @tracing/core @tracing/browser-page
```

## 快速开始

```ts
import { TracingCore } from "@tracing/core";
import { BrowserPagePlugin } from "@tracing/browser-page";

const tracing = new TracingCore({
  plugins: [BrowserPagePlugin()]
});

tracing.init();
```

## 配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `document` | `HTMLElement \| Document` | `document` | 事件监听挂载元素 |
| `watchElement` | `Array<keyof HTMLElementTagNameMap>` | `["a", "button"]` | 哪些元素上的点击触发退出元素记录 |
| `watchAttrs` | `string[]` | `["auto-watch-browser-page"]` | 元素携带这些属性时也会记作退出元素 |
| `watchLevel` | `number` | `1` | 向上查找 parentElement 的层级 |
| `sendUrl` | `string` | `""` | `beforeunload` 时通过 `navigator.sendBeacon` 上报的地址；为空时不发起 Beacon 请求 |
| `genPageEnterRecord` | `(data: PageEnterData) => Record<string, any>` | `defaultGenPageEnterRecord` | 自定义 page-enter 事件的数据格式 |
| `genPageExitRecord` | `(data: PageExitData) => Record<string, any>` | `defaultGenPageExitRecord` | 自定义 page-exit 事件的数据格式 |

### 默认 page-enter 数据

```ts
{
  path: "/home",
  referrer: "https://example.com",
  title: "首页",
  url: "https://example.com/home",
  timestamp: 1700000000000
}
```

### 默认 page-exit 数据

```ts
{
  path: "/home",
  title: "首页",
  dwellTime: 32000,         // 停留时长 (ms)，基于 performance.now()
  exitPath: "/about",
  exitElement: {             // 触发离开的元素，无点击时为 null
    tagName: "A",
    className: "nav-link",
    selector: "body > nav > a.nav-link",
    innerText: "关于我们",
    href: "/about"
  },
  timestamp: 1700000032000
}
```

## 事件名称

| 事件 | 说明 |
|------|------|
| `"page-enter"` | 进入页面时上报 |
| `"page-exit"` | 离开页面时上报 |

## 工作原理

1. 监听全局 `click` 事件（capture 阶段），记录点击元素作为退出元素
2. Monkey-patch `history.pushState` / `history.replaceState`，监听 `popstate` 事件，检测 SPA 页面跳转
3. 页面离开时上报 `page-exit`（含停留时长和退出元素信息）
4. 进入新页面时上报 `page-enter`
5. 传统页面跳转（关闭/刷新）通过 `beforeunload` + `sendBeacon` 上报

## 插件生命周期

| 钩子 | 行为 |
|------|------|
| `start` | 注册 click 监听、重写 history 方法、监听 popstate 和 beforeunload；初始化时立即上报 page-enter |
| `destroy` | 补报未处理的 page-exit，移除所有事件监听，恢复原始 history 方法 |
