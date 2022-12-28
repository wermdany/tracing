# @tracker/web-click

提供页面点击事件监听

## 使用

```sh

pnpm install @tracker/browser-tracker @tracker/web-click

```

```ts
import { createBrowserTracker } from "@tracker/browser-tracker";
import { WebClickPlugin } from "@tracker/web-click";

const collect = createBrowserTracker({
  url: "apis/success",
  plugins: [WebClickPlugin()] // 页面点击事件已应用
});
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

监听事件挂载元素，默认是 `document.body`

由于监听是基于事件冒泡的，所以注意是否阻止了冒泡，导致没有监听到点击事件

可以通过手动触发来解决

```ts
import { createBrowserTracker } from "@tracker/browser-tracker";
import { WebClickPlugin, EventName, defaultGenRecord } from "@tracker/web-click";

const collect = createBrowserTracker({
  url: "apis/success",
  plugins: [WebClickPlugin()] // 页面点击事件已应用
});

const element = document.createElement("div");

const record = defaultGenRecord(element);

collect.report(EventName, record); // 自定义发送一个 web-click report
```

### watchElement

需要监听哪些元素，默认是 `"button", "a", "input", "textarea"`

### watchAttrs

当元素上有这个属性时也会进行收集 `auto-watch-web-click`

### watchLevel

监听等级，默认是 `1`

有时候你想监听的元素并不直接作用在当前点击触发元素上，所以这个字段允许查找 parentElement 几次，比较典型的 antd Button 内部有一个 span 标签，而且大多数会点击到 span 上

### genRecord

你自定决定自动收集那些数据，默认是 `defaultGenRecord`
