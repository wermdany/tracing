# @tracing/browser-error

浏览器错误监控插件，用于 `@tracing/core`。自动捕获未处理的运行时异常、Promise 拒绝、资源加载失败和 console.error 调用。

## 安装

```bash
pnpm add @tracing/core @tracing/browser-error
```

## 快速开始

```ts
import { TracingCore } from "@tracing/core";
import { BrowserErrorPlugin } from "@tracing/browser-error";
import { BuildPlugin } from "browser-tracing";

const tracing = new TracingCore({
  plugins: [BrowserErrorPlugin(), BuildPlugin()]
});

tracing.init();
```

## 配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `onerror` | `boolean` | `true` | 是否监听 `window.onerror` 捕获未处理的运行时异常 |
| `onunhandledrejection` | `boolean` | `true` | 是否监听 `unhandledrejection` 捕获未处理的 Promise 拒绝 |
| `resourceError` | `boolean` | `true` | 是否监听资源加载错误（script/img/link 等 404/超时） |
| `captureConsole` | `boolean` | `false` | 是否拦截 `console.error` 调用 |
| `ignoreErrors` | `(string \| RegExp)[]` | `["Script error", "Javascript error: Script error"]` | 按消息匹配忽略的错误 |
| `allowUrls` | `(string \| RegExp)[]` | `[]` | 仅允许这些 URL 来源的错误（设置后其他 URL 将被过滤） |
| `denyUrls` | `(string \| RegExp)[]` | `[]` | 拒绝这些 URL 来源的错误 |
| `stackTraceLimit` | `number` | `10` | 堆栈帧数上限 |
| `linkedErrorsLimit` | `number` | `5` | 错误链 (`error.cause`) 递归深度 |
| `resourceWatchTags` | `string[]` | `["script","link","img","video","audio","iframe"]` | 需要监控的资源标签名 |

## 事件名称

`"browser-error"` — 可在接收端通过 `event === "browser-error"` 过滤出错误监控数据。

## 上报数据结构

插件调用 `core.report("browser-error", record)` 后，BuildPlugin 会自动包装为以下格式发送：

```json
{
  "header": {
    "url": "http://example.com/page",
    "path": "/page",
    "title": "页面标题",
    "referrer": "...",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "screenWidth": 1920,
    "screenHeight": 1080,
    "timezoneOffset": -480
  },
  "event": "browser-error",
  "body": {
    "source": "uncaught_error",
    "type": "TypeError",
    "message": "x is not defined",
    "stack": "TypeError: x is not defined\n    at fn (http://example.com/app.js:10:5)",
    "frames": [{ "filename": "http://example.com/app.js", "function": "fn", "lineno": 10, "colno": 5 }],
    "causes": [{ "name": "Error", "message": "inner cause", "stack": "Error: inner cause\n    ..." }],
    "reasonType": "error",
    "reasonValue": "promise error",
    "resource": {
      "tagName": "img",
      "src": "http://example.com/404.png",
      "outerHTML": "<img src=\"http://example.com/404.png\">"
    }
  }
}
```

其中 `body` 为插件上报的核心数据：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `source` | `string` | 错误来源：`uncaught_error` / `unhandled_rejection` / `resource_error` / `console_error` |
| `type` | `string` | 错误类型名（如 `TypeError`、`ReferenceError`） |
| `message` | `string` | 错误消息 |
| `stack` | `string` | 原始堆栈字符串 |
| `frames` | `StackFrame[]` | 解析后的堆栈帧数组 |
| `causes` | `CauseFrame[]` | 错误链 (`error.cause`) 递归展开 |
| `reasonType` | `string` | Promise 拒绝时 reason 的 typeof |
| `reasonValue` | `string` | Promise 拒绝时 reason 的序列化值 |
| `resource` | `object` | 资源错误时包含 `{ tagName, src, outerHTML }` |

## 错误来源说明

| 来源 | 监听方式 | 说明 |
| --- | --- | --- |
| `uncaught_error` | `window.addEventListener("error")` | 运行时未捕获异常，通过 `ErrorEvent` 获取完整错误信息 |
| `unhandled_rejection` | `window.addEventListener("unhandledrejection")` | Promise 未 `.catch()` 的拒绝。`reason` 可能是任意类型，本插件会做归一化处理 |
| `resource_error` | `window.addEventListener("error", handler, true)` | 资源加载失败。通过 `event.target` 获取资源标签名和 src/href |
| `console_error` | 拦截 `console.error` | 默认关闭。开启后拦截所有 `console.error` 调用 |

## 跨域脚本错误

当脚本来自不同域且缺少 `crossorigin="anonymous"` 属性时，浏览器会将错误信息掩盖为 `"Script error."`，无法获取堆栈细节。本插件默认忽略此类错误。

解决方案：在引用的 CDN script 标签上添加 `crossorigin="anonymous"`，并确保服务端响应头包含 `Access-Control-Allow-Origin: *`。

## 导出

| 导出                 | 类型        | 说明                            |
| -------------------- | ----------- | ------------------------------- |
| `BrowserErrorPlugin` | `function`  | 插件工厂函数                    |
| `BrowserErrorConfig` | `interface` | 配置接口                        |
| `BrowserErrorEvent`  | `string`    | 事件名常量 `"browser-error"`    |
| `defaultConfig`      | `object`    | 默认配置对象                    |
| `parseStack`         | `function`  | 堆栈字符串解析为 `StackFrame[]` |
| `parseCauseChain`    | `function`  | 递归解析 `error.cause` 链       |
| `ErrorReportData`    | `interface` | 上报数据接口                    |
| `StackFrame`         | `interface` | 堆栈帧结构                      |
| `CauseFrame`         | `interface` | 错误链帧结构                    |

## 插件生命周期

| 钩子      | 行为                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| `start`   | 注册全局错误监听器（`error` / `unhandledrejection` / console.error 拦截器），返回清理函数 |
| `destroy` | 移除所有监听器，恢复原始 `console.error`                                                  |
