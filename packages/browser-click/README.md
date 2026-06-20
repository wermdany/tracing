# @tracing/browser-click

基于事件冒泡的页面点击监控插件，用于 `@tracing/core`。支持按标签名、属性和父级层级匹配目标元素，可自定义上报数据格式。

## 安装

```bash
pnpm add @tracing/core @tracing/browser-click
```

## 快速开始

```ts
import { TracingCore } from "@tracing/core";
import { BrowserClickPlugin } from "@tracing/browser-click";

const tracing = new TracingCore({
  plugins: [BrowserClickPlugin()]
});

tracing.init();
```

## 配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `document` | `HTMLElement` | `document.body` | 事件监听挂载元素。基于冒泡机制，注意阻止冒泡的场景 |
| `watchElement` | `Array<keyof HTMLElementTagNameMap>` | `["button", "a", "input", "textarea"]` | 需要监听的元素标签名 |
| `watchAttrs` | `string[]` | `["auto-watch-browser-click"]` | 元素携带这些属性时也会被收集 |
| `watchLevel` | `number` | `1` | 向上查找 parentElement 的层级，用于 ant-design 等组件库内部嵌套场景 |
| `genRecord` | `(target: HTMLElement) => Record<string, any>` | `defaultGenRecord` | 自定义上报数据格式 |

### genRecord

默认生成的数据格式：

```ts
{
  tagName: "BUTTON",
  className: "btn-primary",
  selector: "body > div > button.btn-primary",
  innerText: "提交",
  id: "submit-btn"
}
```

## 事件名称

`"browser-click"`

可在接收端通过 `event === "browser-click"` 过滤出点击监控数据。

## 插件生命周期

| 钩子 | 行为 |
|------|------|
| `prepare` | 在 `document` 上注册 `click` 事件监听，匹配元素后调用 `core.report` |
| `destroy` | 移除 `click` 事件监听，清理资源 |

## 手动上报

```ts
import { TracingCore } from "@tracing/core";
import { BrowserClickPlugin, BrowserClickEvent, defaultGenRecord } from "@tracing/browser-click";

const tracing = new TracingCore({
  plugins: [BrowserClickPlugin()]
});

tracing.init();

const element = document.createElement("div");
const record = defaultGenRecord(element);

tracing.report(BrowserClickEvent, record);
```
