# browser-tracing

一站式浏览器端监控集成 SDK，整合所有 `@tracing/*` 插件，开箱即用。支持点击追踪、页面访问、滚动行为、资源性能、HTTP 请求等全方位的监控能力。

> 如需按需加载以减少打包体积，请参考 [定制功能](../../README.md#定制功能) 单独使用各插件。

## 安装

```bash
pnpm add browser-tracing
```

## 快速开始

```ts
import { createBrowserTracing } from "browser-tracing";

const tracing = createBrowserTracing({
  url: "/collect"
});
```

### 配置插件

```ts
import { createBrowserTracing } from "browser-tracing";

const tracing = createBrowserTracing({
  url: "/collect",
  webClick: {
    watchElement: ["a", "button"]
  }
});
```

关闭某个插件只需设为 `false`：

```ts
createBrowserTracing({
  url: "/collect",
  webClick: false, // 关闭点击追踪
  scroll: false, // 关闭滚动追踪
  resource: false // 关闭资源性能监控
});
```

## 配置

### 全局配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | `string \| ((sender) => string)` | `""` | **必填**，上报地址；支持函数形式根据发送器类型返回不同地址 |
| `sendLog` | `boolean \| ((event, build) => void)` | 开发环境开启 | 是否打印上报日志 |
| `plugins` | `Array<TracingPlugin>` | `[]` | 额外自定义插件，追加在默认插件之后 |

### 发送配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `xhr` | `Partial<XhrSenderPluginConfig> \| false` | `{ order: "post" }` | XHR 发送配置，设为 `false` 关闭 |
| `fetch` | `Partial<FetchSenderPluginConfig> \| false` | `false` | Fetch 发送配置，默认关闭 |
| `beacon` | `Partial<BeaconSenderPluginConfig> \| false` | `{ order: "pre" }` | Beacon 发送配置 |
| `middleware` | `MiddlewareApi[]` | `[]` | 发送中间件（错误重发、批量发送等） |
| `error` | `ErrorCall` | `noop` | 发送失败回调 |
| `success` | `SuccessCall` | `noop` | 发送成功回调 |

### Build 插件配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `formatBuild` | `(params: { header, build, event }) => Record<string, any>` | 内置格式 | 自定义组装上报数据格式 |
| `headers` | `Record<string, StoreProfile>` | 见下方 | 公共头部信息，延迟求值 |

#### 默认公共头部

```ts
{
  path: getPathName,
  referrer: getReferrer,
  viewportWidth: getViewportWidth,
  viewportHeight: getViewportHeight,
  screenWidth: getScreenWidth,
  screenHeight: getScreenHeight,
  title: getTitle,
  url: getUrl,
  timezoneOffset: getTimezoneOffset,
  userAgent: getUserAgent,            // User-Agent 字符串
  os: getOsName,                      // 操作系统名（macOS/Windows/Linux/Android/iOS）
  browser: getBrowserInfo,            // 浏览器名称和版本（Chrome 120/Firefox 121）
  networkType: getNetworkType,        // 网络类型（4g/3g/2g 等，不支持时为空）
  deviceMemory: getDeviceMemory,      // 设备内存 GB（不支持时为 0）
  hardwareConcurrency: getHardwareConcurrency  // CPU 逻辑核数
}
```

### 各插件独立配置

通过以下字段可分别配置各插件，传入 `false` 关闭：

| 字段          | 插件                         | 配置类型                             | 默认启用         |
| ------------- | ---------------------------- | ------------------------------------ | ---------------- |
| `webClick`    | @tracing/browser-click       | `Partial<BrowserClickPluginConfig>`  | 是               |
| `page`        | @tracing/browser-page        | `Partial<BrowserPageConfig>`         | 是               |
| `scroll`      | @tracing/browser-scroll      | `Partial<BrowserScrollPluginConfig>` | 是               |
| `resource`    | @tracing/browser-resource    | `Partial<ResourceConfig>`            | 是               |
| `axios`       | @tracing/browser-http-axios  | `BrowserHttpAxiosPluginConfig`       | 否（需要时开启） |
| `performance` | @tracing/browser-performance | `Partial<PerformanceConfig>`         | 是               |

## 内置插件

### BuildPlugin

组装发送数据格式，负责将 header、event、body 拼接为统一的上报结构。

### SenderPlugin

根据配置创建 XHR / Beacon / Fetch 发送器插件，支持中间件增强。

## 事件一览

| 事件                     | 来源                         | 说明                     |
| ------------------------ | ---------------------------- | ------------------------ |
| `"browser-click"`        | @tracing/browser-click       | 点击事件                 |
| `"page-enter"`           | @tracing/browser-page        | 进入页面                 |
| `"page-exit"`            | @tracing/browser-page        | 离开页面                 |
| `"browser-scroll"`       | @tracing/browser-scroll      | 滚动行为                 |
| `"browser-resource"`     | @tracing/browser-resource    | 资源加载                 |
| `"http-request"`         | @tracing/browser-http-axios  | HTTP 请求                |
| `"performance-pageload"` | @tracing/browser-performance | 页面加载性能（合并上报） |
| `"performance-fid"`      | @tracing/browser-performance | 首次输入延迟             |
| `"performance-cls"`      | @tracing/browser-performance | 累积布局偏移             |
| `"performance-longtask"` | @tracing/browser-performance | 长任务监控               |
| `"performance-memory"`   | @tracing/browser-performance | 内存监控（Chrome）       |
