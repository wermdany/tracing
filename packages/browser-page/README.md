# @tracing/browser-page

提供页面停留时间监听，记载进入页面的路径、停留时长、以及通过哪个按钮或链接离开了页面。

## 使用

```sh
pnpm install @tracing/core @tracing/browser-page
```

```ts
import { TracingCore } from "@tracing/core";
import { BrowserPagePlugin } from "@tracing/browser-page";

const collect = new TracingCore({
  plugins: [BrowserPagePlugin()]
});

collect.init();
```

## 事件

| 事件名 | 说明 |
|--------|------|
| `page_enter` | 进入页面时上报 |
| `page_exit` | 离开页面时上报 |

### page_enter 数据

```ts
{
  path: string;       // 当前页面路径
  referrer: string;   // 来源页
  title: string;      // 页面标题
  url: string;        // 完整 URL
  timestamp: number;  // 进入时间戳，用于按天聚合
}
```

### page_exit 数据

```ts
{
  path: string;           // 离开页面路径
  title: string;          // 页面标题
  dwellTime: number;      // 停留时长 (ms)，基于 performance.now()，不受系统时间影响
  exitPath: string;       // 离开后目标路径
  exitElement: {          // 触发离开的元素信息，无点击时为 null
    tagName: string;
    className: string;
    selector: string;
    innerText: string;
    href?: string;        // 仅 a 标签
  } | null;
  timestamp: number;      // 离开时间戳
}
```

## 工作原理

1. 监听全局 click 事件（capture），当用户点击链接、按钮等元素时记录退出元素信息
2. Monkey-patch `history.pushState` / `history.replaceState`，监听 `popstate` 事件，检测 SPA 页面跳转
3. 检测到页面离开时上报 `page_exit` 事件（包含停留时长和退出元素信息）
4. 进入新页面时上报 `page_enter` 事件
5. 对于传统页面跳转（关闭/刷新），通过 `beforeunload` + `sendBeacon` 上报

## 配置项

```ts
interface BrowserPageConfig {
  document: HTMLElement | Document;
  watchElement: Array<keyof HTMLElementTagNameMap>;
  watchAttrs: string[];
  watchLevel: number;
  sendUrl: string;
  genPageEnterRecord: (data: PageEnterData) => Record<string, any>;
  genPageExitRecord: (data: PageExitData) => Record<string, any>;
}
```

### document

- Type: `HTMLElement | Document` 选填
- Default: `document`

监听事件挂载元素，默认为整个 document。

### watchElement

- Type: `Array<keyof HTMLElementTagNameMap>` 选填
- Default: `["a", "button"]`

需要监听哪些元素的点击作为退出元素。

### watchAttrs

- Type: `string[]` 选填
- Default: `["auto-watch-browser-page"]`

当元素上有这些属性时也会记录退出元素。

### watchLevel

- Type: `number` 选填
- Default: `1`

向上查找父元素的层级。当点击触发元素不是直接匹配 watchElement 时，允许向上查找 parentElement。

### sendUrl

- Type: `string` 选填
- Default: `""`

`beforeunload` 时通过 `navigator.sendBeacon` 上报的地址。不配置时不会在页面关闭时通过 Beacon 发送。

### genPageEnterRecord

- Type: `(data: PageEnterData) => Record<string, any>` 选填
- Default: `defaultGenPageEnterRecord`

自定义 page_enter 事件的上报数据格式。

### genPageExitRecord

- Type: `(data: PageExitData) => Record<string, any>` 选填
- Default: `defaultGenPageExitRecord`

自定义 page_exit 事件的上报数据格式。
