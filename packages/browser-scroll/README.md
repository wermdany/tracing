# @tracing/browser-scroll

提供页面滚动事件监听，支持 document 及嵌套可滚动元素的分别追踪

## 使用

```sh
pnpm install @tracing/core @tracing/browser-scroll
```

```ts
import { TracingCore } from "@tracing/core";
import { BrowserScrollPlugin } from "@tracing/browser-scroll";

const collect = new TracingCore({
  plugins: [BrowserScrollPlugin()]
});

collect.init();
```

## 配置项

```ts
interface BrowserScrollPluginConfig {
  document: HTMLElement | Document;
  debounceMs: number;
  trackScrollDepth: boolean;
  genRecord: (data: ScrollData) => Record<string, any>;
}
```

### document

- Type: `HTMLElement | Document` 选填
- Default: `document`

监听作用域。可以指定为一个容器元素，仅追踪该容器内的滚动事件；默认监听整个 document。

### debounceMs

- Type: `number` 选填
- Default: `300`

滚动结束防抖时间（毫秒）。滚动停止指定时长后触发一次上报，避免高频滚动时频繁上报。

### trackScrollDepth

- Type: `boolean` 选填
- Default: `true`

是否追踪滚动深度。开启后会记录每次滚动段的最大滚动距离及百分比；关闭后仅记录停留时长和滚动段数。

### genRecord

- Type: `(data: ScrollData) => Record<string, any>` 选填
- Default: `ReturnType<defaultGenRecord>`

自定义上报数据生成函数，接收 `ScrollData` 参数，返回自定义的数据结构。

## 数据字段

```ts
interface ScrollData {
  totalDwellTime: number;        // 滚动总停留时长(ms)
  scrollSegments: number;        // 滚动段数
  maxScrollDepth: number;        // 最大滚动深度(px)
  maxScrollDepthPercent: number; // 最大滚动深度百分比
  pageHeight: number;            // 页面总高度
  viewportHeight: number;        // 视口高度
  elements: ScrollElementInfo[]; // 被滚动元素信息
}

interface ScrollElementInfo {
  elementTagName: string;       // 元素标签名
  elementClassName: string;     // 元素类名
  elementSelector: string;      // 元素选择器
  elementPath: string;          // 元素路径
  maxScrollDepth: number;       // 该元素最大滚动深度
  maxScrollDepthPercent: number;// 该元素最大滚动深度百分比
  scrollHeight: number;         // 该元素滚动高度
  clientHeight: number;         // 该元素可视高度
}
```

## 嵌套滚动监听

当页面上存在多个可滚动区域时，插件会分别追踪每个元素的滚动深度和百分比，并在上报时以 `elements` 数组返回：

```ts
import { TracingCore } from "@tracing/core";
import { BrowserScrollPlugin } from "@tracing/browser-scroll";

const container = document.getElementById("scroll-container");

const collect = new TracingCore({
  plugins: [
    BrowserScrollPlugin({
      document: container, // 仅追踪容器内的滚动
      debounceMs: 300
    })
  ]
});

collect.init();
```

上报数据中 `elements` 会包含每个被滚动元素各自的：
- `elementTagName`、`elementSelector`、`elementPath` 用于定位元素
- `maxScrollDepth`、`maxScrollDepthPercent` 基于该元素自身高度计算
- `scrollHeight`、`clientHeight` 反映元素实际尺寸

## 手动上报

```ts
import { TracingCore } from "@tracing/core";
import { BrowserScrollPlugin, BrowserScrollEvent, defaultGenRecord } from "@tracing/browser-scroll";

const collect = new TracingCore({
  plugins: [BrowserScrollPlugin()]
});

collect.init();

const data = {
  totalDwellTime: 1234,
  scrollSegments: 2,
  maxScrollDepth: 800,
  maxScrollDepthPercent: 60,
  pageHeight: 2000,
  viewportHeight: 768,
  elements: []
};

const record = defaultGenRecord(data);

collect.report(BrowserScrollEvent, record);
```
