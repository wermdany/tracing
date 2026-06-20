# @tracing/browser-expose

元素曝光率（Impression/Exposure）监控插件，用于 `@tracing/core`。基于 **IntersectionObserver** 检测带有指定属性（默认 `data-tracing-expose`）的元素何时进入视口，自动触发曝光上报。同时借助 **MutationObserver** 捕获动态添加的 DOM 节点，完美支持 SPA 场景。

## 安装

```bash
pnpm add @tracing/core @tracing/browser-expose
```

## 快速开始

```ts
import { TracingCore } from "@tracing/core";
import { BrowserExposePlugin } from "@tracing/browser-expose";

const tracing = new TracingCore({
  plugins: [BrowserExposePlugin()]
});

tracing.init();
```

在 HTML 中标记需要曝光追踪的元素：

```html
<!-- 基础用法：属性值作为曝光标识 -->
<div data-tracing-expose="hero-banner">...</div>

<!-- 附带自定义数据（JSON 字符串） -->
<div data-tracing-expose="sidebar" data-tracing-expose-data='{"pos":1,"type":"ad"}'>...</div>
```

## 配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `attribute` | `string` | `DefaultExposeAttribute`（即 `"data-tracing-expose"`） | 标记曝光元素的属性名。元素上存在该属性即进入 IntersectionObserver 观察 |
| `threshold` | `number` | `0` | IntersectionObserver 的 threshold。`0` 表示有任何像素进入视口即触发；`0.5` 表示 50% 可见才触发 |
| `rootMargin` | `string` | `"0px"` | IntersectionObserver 的 rootMargin。设为 `"100px"` 可在元素进入视口前 100px 即触发（预曝光） |
| `once` | `boolean` | `true` | 每个元素是否只上报一次。`true` 时元素首次可见上报后立即 `unobserve`，不再重复 |
| `useMutationObserver` | `boolean` | `true` | 是否启用 MutationObserver 监听 DOM 变化。启用后动态添加的曝光元素也会自动被观察 |
| `genRecord` | `(entry: IntersectionObserverEntry, element: HTMLElement) => Record<string, any>` | `defaultGenRecord` | 自定义记录生成函数。覆盖默认的字段提取逻辑 |

### 默认配置导出

```ts
import { DefaultExposeAttribute, defaultConfig } from "@tracing/browser-expose";

DefaultExposeAttribute; // => "data-tracing-expose"

// 默认配置对象
defaultConfig ===
  {
    attribute: DefaultExposeAttribute,
    threshold: 0,
    rootMargin: "0px",
    once: true,
    useMutationObserver: true,
    genRecord: defaultGenRecord
  };
```

### genRecord

默认实现 `defaultGenRecord` 生成的数据格式：

```ts
{
  exposeLabel: "hero-banner",                          // data-tracing-expose 属性值
  exposeData: { pos: 1, type: "ad", name: "demo" },   // 见下方「exposeData 拼接机制」
  elementTagName: "div",
  elementClassName: "banner hero",
  elementSelector: "body > div.container > div.hero",
  elementPath: "html>body>div>div",
  elementId: "hero-banner",
  intersectionRatio: 0.35,
  timestamp: 1712345678901,
  viewportWidth: 1440,
  viewportHeight: 900,
}
```

### exposeData 拼接机制

`exposeData` 通过内部的 `extractExposeData(element, attribute)` 函数从元素的多个属性中 **拼接** 提取，支持两种形式。

**实现算法：**

1. 遍历 `element.attributes`，收集所有以 `{attribute}-data-` 开头的属性，将后缀作为 key、属性值作为 value 存入 `exposeData`
2. 读取 `{attribute}-data` 属性的值，尝试 `JSON.parse` 解析为对象，然后 `Object.assign` 合并到 `exposeData`（覆盖第一步的同名 key）
3. JSON 解析失败时，DEV 环境输出详细警告并跳过，已有数据不受影响

**函数签名：**

```ts
// 内部函数，被 defaultGenRecord 调用
function extractExposeData(element: HTMLElement, attribute: string): Record<string, any>;
```

支持两种形式：

#### 1. 独立属性键值对

属性名格式：`{attribute}-data-{key}`（默认 `data-tracing-expose-data-{key}`）

```html
<div
  data-tracing-expose="banner"
  data-tracing-expose-data-name="homepage"
  data-tracing-expose-data-type="hero"
  data-tracing-expose-data-position="top"
  >...</div
>
```

等价于 `exposeData: { name: "homepage", type: "hero", position: "top" }`。

#### 2. JSON 属性（覆盖）

通过 `{attribute}-data`（默认 `data-tracing-expose-data`）传入 JSON 字符串，解析后合并到 `exposeData` 中。**优先级高于独立属性**：

```html
<!-- 独立属性先被收集，JSON 中的字段会覆盖同名 key -->
<div
  data-tracing-expose="banner"
  data-tracing-expose-data-name="sidebar"
  data-tracing-expose-data='{"name":"hero","color":"blue"}'
  >...</div
>
```

结果为 `exposeData: { name: "hero", color: "blue" }`（`name` 被 JSON 覆盖）。

#### 3. 合并规则总结

| 来源      | 示例                                         | 优先级       |
| --------- | -------------------------------------------- | ------------ |
| 独立属性  | `data-tracing-expose-data-{key}="value"`     | 低（先收集） |
| JSON 属性 | `data-tracing-expose-data='{"key":"value"}'` | 高（后覆盖） |

#### 4. JSON 解析失败的 DEV 警告

当 `data-tracing-expose-data` 的值不是合法 JSON 时，开发环境会在控制台输出详细警告，指明出错元素的信息：

```
[tracing:browser-expose] Failed to parse "data-tracing-expose-data" JSON on element
  → { tagName: "DIV", id: "my-banner", className: "...", selector: "...", rawValue: "not-json" }
```

生产环境（`__DEV__ = false`）不会输出此警告。

## 事件名称

`"browser-expose"`

接收端通过 `event === "browser-expose"` 过滤出曝光监控数据。

## 插件生命周期

| 钩子      | 行为                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| `prepare` | 创建 IntersectionObserver + MutationObserver，扫描 `[data-tracing-expose]` 元素开始观察 |
| `destroy` | 断开 IntersectionObserver 和 MutationObserver，清空已观察元素集合                       |

### 曝光触发流程

1. 元素进入视口 → `IntersectionObserver` callback 触发
2. 调用 `config.genRecord(entry, el)` 生成记录
3. `core.report(BrowserExposeEvent, record)` 进入构建管道（build → beforeSend → send）
4. 若 `once: true`（默认），立即 `io.unobserve(el)`，该元素不再被观察

## 进阶用法

### 自定义曝光属性名

```ts
BrowserExposePlugin({
  attribute: "data-expose",
  threshold: 0.3
});
```

```html
<div data-expose="footer-banner" data-expose-data-name="links">...</div>
<!-- exposeData → { name: "links" } -->
```

### 预曝光（提前触发）

```ts
BrowserExposePlugin({
  rootMargin: "100px"
});
```

### 重复曝光

```ts
BrowserExposePlugin({
  once: false
});
```

### 自定义上报数据

```ts
BrowserExposePlugin({
  genRecord(entry, element) {
    return {
      label: element.getAttribute("data-expose-label"),
      visible: entry.isIntersecting,
      ratio: entry.intersectionRatio,
      rect: entry.boundingClientRect.toJSON(),
      time: Date.now()
    };
  }
});
```

### SPA 动态元素

`useMutationObserver` 默认开启。无需额外配置：

```ts
const div = document.createElement("div");
div.setAttribute("data-tracing-expose", "dynamic-banner");
div.setAttribute("data-tracing-expose-data-index", "1");
document.body.appendChild(div);
// 自动被 MutationObserver 捕获并开始观察，exposeData → { index: "1" }
```

### 关闭 MutationObserver

```ts
BrowserExposePlugin({
  useMutationObserver: false
});
```

## 手动上报

```ts
import { TracingCore } from "@tracing/core";
import { BrowserExposePlugin, BrowserExposeEvent, defaultGenRecord } from "@tracing/browser-expose";

const tracing = new TracingCore({
  plugins: [BrowserExposePlugin()]
});

tracing.init();

const element = document.createElement("div");
element.setAttribute("data-tracing-expose", "manual");

const entry = {
  intersectionRatio: 0.5,
  boundingClientRect: { x: 0, y: 0, width: 100, height: 100 }
} as unknown as IntersectionObserverEntry;

const record = defaultGenRecord(entry, element);
tracing.report(BrowserExposeEvent, record);
```
