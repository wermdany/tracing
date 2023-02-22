# @tracing/web-click

提供页面点击事件监听

## 使用

```sh

pnpm install @tracing/core @tracing/web-click

```

```ts
import { TracingCore } from "@tracing/core";
import { WebClickPlugin } from "@tracing/web-click";

const collect = new TracingCore({
  plugins: [WebClickPlugin()] // 页面点击事件已应用
});

collect.init();
```

## 配置项

```ts
interface WebClickPluginConfig {
  document: HTMLElement;
  watchElement: Array<keyof HTMLElementTagNameMap>;
  watchAttrs: string[];
  watchLevel: number;
  genRecord: (target: HTMLElement) => Record<string, any>;
}
```

### document

- Type: `HTMLElement` 选填
- Default: `document.body`

监听事件挂载元素

由于监听是基于事件冒泡的，所以注意是否阻止了冒泡，导致没有监听到点击事件

可以通过手动触发来解决

```ts
import { TracingCore } from "@tracing/core";
import { WebClickPlugin, EventName, defaultGenRecord } from "@tracing/web-click";

const collect = new TracingCore({
  plugins: [WebClickPlugin()]
});

collect.init();

const element = document.createElement("div");

const record = defaultGenRecord(element);

collect.report(EventName, record); // 自定义发送一个 web-click report
```

### watchElement

- Type: `Array<keyof HTMLElementTagNameMap>` 选填
- Default: `["button", "a", "input", "textarea"]`

需要监听哪些元素

### watchAttrs

- Type: `string[]` 选填
- Default: `["auto-watch-web-click"]`

当元素上有这个属性时也会进行收集

### watchLevel

- Type: `number` 选填
- Default: `1`

监听等级

有时候你想监听的元素并不直接作用在当前点击触发元素上，所以这个字段允许查找 parentElement 几次，比较典型的 antd Button 内部有一个 span 标签，而且大多数会点击到 span 上

### genRecord

- Type: `(target: HTMLElement) => Record<string, any>` 选填
- Default: `ReturnType<defaultGenRecord>`

你自定决定自动收集那些数据
