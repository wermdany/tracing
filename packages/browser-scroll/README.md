# @tracing/browser-scroll

页面滚动行为监控插件，用于 `@tracing/core`。支持 document 及嵌套可滚动元素的分別追踪，采集滚动深度、停留时长和滚动段数。

## 安装

```bash
pnpm add @tracing/core @tracing/browser-scroll
```

## 快速开始

```ts
import { TracingCore } from "@tracing/core";
import { BrowserScrollPlugin } from "@tracing/browser-scroll";

const tracing = new TracingCore({
  plugins: [BrowserScrollPlugin()]
});

tracing.init();
```

## 配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `document` | `HTMLElement \| Document` | `document` | 监听作用域，可指定容器元素仅追踪该容器内滚动 |
| `debounceMs` | `number` | `300` | 滚动结束防抖时间（ms），停止滚动后触发上报 |
| `trackScrollDepth` | `boolean` | `true` | 是否追踪滚动深度，关闭后仅记录停留时长和段数 |
| `genRecord` | `(data: ScrollData) => Record<string, any>` | `defaultGenRecord` | 自定义上报数据格式 |

### 默认上报数据

```ts
{
  event: "browser-scroll",
  totalDwellTime: 1234,         // 滚动总停留时长 (ms)
  scrollSegments: 2,            // 滚动段数
  maxScrollDepth: 800,          // 最大滚动深度 (px)
  maxScrollDepthPercent: 60,    // 最大滚动深度百分比
  pageHeight: 2000,             // 页面总高度
  viewportHeight: 768,          // 视口高度
  elements: [                   // 被滚动元素列表
    {
      elementTagName: "DIV",
      elementClassName: "scroll-container",
      elementSelector: "#content",
      elementPath: "body > div > div",
      maxScrollDepth: 400,
      maxScrollDepthPercent: 50,
      scrollHeight: 1000,
      clientHeight: 400
    }
  ]
}
```

## 嵌套滚动监听

当页面存在多个可滚动区域时，插件会分别追踪每个元素的滚动深度，在 `elements` 数组中返回：

```ts
import { TracingCore } from "@tracing/core";
import { BrowserScrollPlugin } from "@tracing/browser-scroll";

const container = document.getElementById("scroll-container");

const tracing = new TracingCore({
  plugins: [
    BrowserScrollPlugin({
      document: container,
      debounceMs: 300
    })
  ]
});

tracing.init();
```

## 事件名称

`"browser-scroll"`

可在接收端通过 `event === "browser-scroll"` 过滤出滚动监控数据。

## 插件生命周期

| 钩子 | 行为 |
|------|------|
| `prepare` | 在 document 上注册 scroll 事件（capture + passive），防抖处理后上报 |
| `destroy` | 清空防抖定时器，flush 残余数据，移除事件监听，重置状态 |

## 手动上报

```ts
import { TracingCore } from "@tracing/core";
import { BrowserScrollPlugin, BrowserScrollEvent, defaultGenRecord } from "@tracing/browser-scroll";

const tracing = new TracingCore({
  plugins: [BrowserScrollPlugin()]
});

tracing.init();

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
tracing.report(BrowserScrollEvent, record);
```
