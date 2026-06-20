# @tracing/browser-performance

基于 [PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) 的页面性能监控插件，用于 `@tracing/core`。支持 Web Vitals（LCP / FCP / TTFB / FID / CLS）、Navigation Timing、Long Tasks、Memory 采集。

## 安装

```bash
pnpm add @tracing/core @tracing/browser-performance
```

## 快速开始

```ts
import { TracingCore } from "@tracing/core";
import { BrowserPerformancePlugin } from "@tracing/browser-performance";

const tracing = new TracingCore({
  plugins: [BrowserPerformancePlugin()]
});

tracing.init();
```

## 配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `webVitals` | `Partial<WebVitalConfig> \| false` | 全部启用 | Web Vitals 各指标的开关 |
| `navigation` | `boolean` | `false` | 是否采集 Navigation Timing |
| `longTasks` | `Partial<LongTaskConfig> \| false` | `false` | Long Tasks 配置，设为 `{}` 启用默认 |
| `memory` | `Partial<MemoryConfig> \| false` | `false` | 内存监控配置，仅在 Chrome 下有效 |
| `batchPageLoad` | `boolean` | `false` | 是否将 LCP / FCP / TTFB / Navigation 合并为一次 `performance-pageload` 事件 |

### WebVitalConfig

| 参数   | 类型      | 默认值 | 说明         |
| ------ | --------- | ------ | ------------ |
| `lcp`  | `boolean` | `true` | 最大内容绘制 |
| `fid`  | `boolean` | `true` | 首次输入延迟 |
| `cls`  | `boolean` | `true` | 累积布局偏移 |
| `fcp`  | `boolean` | `true` | 首次内容绘制 |
| `ttfb` | `boolean` | `true` | 首字节时间   |

### LongTaskConfig

| 参数          | 类型     | 默认值 | 说明                 |
| ------------- | -------- | ------ | -------------------- |
| `minDuration` | `number` | `50`   | 长任务最小阈值（ms） |

### MemoryConfig

| 参数                 | 类型     | 默认值  | 说明               |
| -------------------- | -------- | ------- | ------------------ |
| `samplingIntervalMs` | `number` | `30000` | 内存采样间隔（ms） |

## batchPageLoad 模式

开启后，LCP / FCP / TTFB / Navigation Timing 合并为一次事件上报，数据扁平化：

```ts
BrowserPerformancePlugin({
  webVitals: true,
  navigation: true,
  batchPageLoad: true
});
```

上报事件 `"performance-pageload"` 的 body 结构：

```json
{
  "lcp": 2500,
  "lcpRating": "needs-improvement",
  "fcp": 1200,
  "fcpRating": "good",
  "ttfb": 600,
  "ttfbRating": "good",
  "navLoadTime": 1500,
  "navDomContentLoadedTime": 900,
  "navDomInteractiveTime": 800,
  "navDomComplete": 1400,
  "navTtfb": 500,
  "navDnsTime": 100,
  "navTcpTime": 200
}
```

FID 和 CLS 在各自的触发时机独立上报，不受 batch 影响。

## 事件名称

| 事件                     | 触发时机                                               |
| ------------------------ | ------------------------------------------------------ |
| `"performance-pageload"` | 页面加载完成后合并上报（batch 模式），或各指标独立上报 |
| `"performance-fid"`      | 首次用户交互时上报                                     |
| `"performance-cls"`      | 页面关闭时上报最终 CLS 值                              |
| `"performance-longtask"` | 长任务发生时即时上报                                   |
| `"performance-memory"`   | 定时采样上报                                           |

## Web Vitals 阈值

| 指标 | 良好     | 较差     |
| ---- | -------- | -------- |
| LCP  | < 2500ms | > 4000ms |
| FID  | < 100ms  | > 300ms  |
| CLS  | < 0.1    | > 0.25   |
| FCP  | < 1800ms | > 3000ms |
| TTFB | < 800ms  | > 1800ms |

## 插件生命周期

| 钩子 | 行为 |
| --- | --- |
| `start` | 按配置启动各性能 Observer（Web Vitals / Navigation / Long Tasks / Memory），返回聚合 cleanup 函数 |
