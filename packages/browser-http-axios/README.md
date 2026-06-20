# @tracing/browser-http-axios

基于 axios 拦截器的 HTTP 请求监控插件，用于 `@tracing/browser-tracing` SDK。通过拦截 `axios.create()` 创建的实例，自动采集每个请求的耗时、地址、状态码和错误信息。

## 安装

```bash
pnpm add @tracing/browser-http-axios axios
```

`axios` 为 peer 依赖，请确保项目中已安装。

## 快速开始

```ts
import axios from "axios";
import { createBrowserTracing } from "@tracing/browser-tracing";

const http = axios.create({ baseURL: "/api" });

createBrowserTracing({
  url: "/collect",
  axios: {
    axiosInstance: http
  }
});

// 从此之后，该实例的所有请求都会被自动监控上报
http.get("/users");
http.post("/users", { name: "foo" });
```

## 配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `axiosInstance` | `AxiosInstance` | — | **必填**，通过 `axios.create()` 创建的实例 |
| `shouldRecord` | `(config) => boolean` | `() => true` | 过滤函数，返回 `false` 跳过该请求 |
| `sampleRate` | `number` | `1` | 采样率 0-1，`1` 为全部上报 |
| `sanitize` | `(data) => data` | 恒等函数 | 上报前清洗数据，适合脱敏 token/password |
| `classifyError` | `(error) => HttpAxiosErrorType` | 内置分类 | 自定义错误分类，覆盖默认判断 |
| `genRecord` | `(data) => Record` | 见下方 | 自定义上报数据格式 |

### 内置错误分类

```
error.code === 'ECONNABORTED'  → "timeout"       // 请求超时
error.response 存在            → "http_error"     // 4xx/5xx 但有响应体
axios.isCancel(error)          → "canceled"       // 手动取消
其余                           → "network"        // DNS/连接/CORS 等
```

可通过 `classifyError` 覆盖任一分支。

### 默认上报格式

```ts
{
  event: "http-request",
  url: "/api/users",
  method: "GET",
  baseURL: "/api",
  duration: 320,          // 毫秒
  status: 200,
  statusText: "OK",
  errorType: null,         // 成功时为 null
  errorMessage: ""
}
```

## 使用示例

### 过滤 + 采样

```ts
{
  axiosInstance: http,
  shouldRecord: config => !config.url?.includes("/health"),
  sampleRate: 0.3
}
```

### 数据脱敏 + 自定义格式

```ts
{
  axiosInstance: http,
  sanitize: data => ({
    ...data,
    url: data.url.replace(/token=[^&]+/, "token=***")
  }),
  genRecord: data => ({
    api: `${data.method} ${data.url}`,
    cost: data.duration,
    code: data.status,
    error: data.errorType ? `${data.errorType}: ${data.errorMessage}` : null
  })
}
```

### 自定义错误分类

```ts
{
  axiosInstance: http,
  classifyError: error => {
    if (error.response?.status === 401) return "http_error";
    if (error.response?.status === 503) return "network";
    return undefined; // 使用默认分类
  }
}
```

## 事件名称

`"http-request"`

可在接收端（例如服务端数据平台）通过 `event === "http-request"` 过滤出 HTTP 请求监控数据。

## 插件生命周期

| 钩子 | 行为 |
|------|------|
| `prepare` | 注册 axios 请求/响应拦截器 |
| `destroy` | 卸载拦截器，清理资源 |

拦截器在 `prepare` 阶段注册，确保 SDK init 完成后所有请求都会被监控。
