# @tracing/browser-resource

基于 [PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) 的页面资源加载性能监控插件，用于 `@tracing/core`。自动采集页面中 script、link、css、img 等资源的加载耗时和水分配信息。

## 安装

```bash
pnpm add @tracing/core @tracing/browser-resource
```

## 快速开始

```ts
import { TracingCore } from "@tracing/core";
import { BrowserResourcePlugin } from "@tracing/browser-resource";

const tracing = new TracingCore({
  plugins: [BrowserResourcePlugin()]
});

tracing.init();
```

## 配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `watchResource` | `(timing: PerformanceResourceTiming) => boolean` | `defineWatchResource` | 过滤函数，返回 `true` 的资源会被采集。默认仅采集 `script`、`link`、`css`、`img`、`other` 类型 |
| `resourceTimingMeasure` | `(timing: PerformanceResourceTiming) => Record<string, any>` | `defineResourceTimingMeasure` | 上报前格式化资源性能数据 |

### 默认采集的资源类型

```
initiatorType 为 "script" | "link" | "css" | "img" | "other" 的资源
```

可通过 `watchResource` 自定义过滤规则。

### 默认上报数据包含的字段

`connectStart`、`connectEnd`、`domainLookupStart`、`domainLookupEnd`、`duration`、`fetchStart`、`redirectStart`、`redirectEnd`、`requestStart`、`responseStart`、`responseEnd`、`secureConnectionStart`、`startTime`、`name`（资源地址）、`initiatorType`、`transferSize`、`encodedBodySize`、`decodedBodySize` 等。

## 资源时间顺序

性能时间线示意图：

```
redirectStart ──→ redirectEnd
                     domainLookupStart ──→ domainLookupEnd
                         connectStart ──→ connectEnd
                             secureConnectionStart
                                 requestStart ──→ responseStart ──→ responseEnd
```

基于此可分析资源缓存命中率、加载耗时等，详情参考 [PerformanceResourceTiming 文档](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)。

## 事件名称

`"browser-resource"`

可在接收端通过 `event === "browser-resource"` 过滤出资源加载性能数据。

## 插件生命周期

| 钩子 | 行为 |
|------|------|
| `start` | 立即回扫已有资源（`performance.getEntriesByType("resource")`），创建 `PerformanceObserver` 监听后续资源加载；返回 cleanup 函数用于断开 Observer |
