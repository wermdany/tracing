# @tracing/browser-resource

提供页面资源加载监控

基于 [PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)

## 使用

```sh

pnpm install @tracing/core @tracing/browser-resource

```

```ts
import { TracingCore } from "@tracing/core";
import { BrowserResourcePlugin } from "@tracing/browser-resource";

const collect = new TracingCore({
  plugins: [BrowserResourcePlugin()] // 页面资源监控已应用
});

collect.init();
```

## 配置项

```ts
export interface ResourceConfig {
  watchResource: (timing: PerformanceResourceTiming) => boolean;
  resourceTimingMeasure: (timing: PerformanceResourceTiming) => Record<string, any>;
}
```

### watchResource

- Type: `(timing: PerformanceResourceTiming) => boolean` 选填
- Default: `defineWatchResource`

需要监听哪些资源文件

### resourceTimingMeasure

- Type: `(timing: PerformanceResourceTiming) => Record<string, any>` 选填
- Default: `defineResourceTimingMeasure`

上报数据格式化

## 资源时间顺序

![timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/timestamp-diagram.svg)

基于此你可以做很多微妙的事情，比如：获取资源缓存命中率、资源加载快照，来对你的资源进行优化

详细参考 [文档](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)
