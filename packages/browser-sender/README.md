# @tracing/browser-sender

数据上报插件集合，提供 XHR、Beacon、Fetch 三种发送方式及中间件机制（错误重发、批量发送），用于 `@tracing/core`。

## 安装

```bash
pnpm add @tracing/core @tracing/browser-sender
```

## 快速开始

```ts
import { TracingCore } from "@tracing/core";
import { XhrSenderPlugin } from "@tracing/browser-sender";

const tracing = new TracingCore({
  plugins: [
    XhrSenderPlugin({ url: "/collect" })
  ]
});

tracing.init();
```

## 发送方式

### XMLHttpRequest

```ts
import { XhrSenderPlugin } from "@tracing/browser-sender";
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | `string` | `""` | **必填**，上报地址 |
| `timeout` | `number` | `2000` | 超时时间（ms），`0` 为永不超时 |
| `withCredentials` | `boolean` | `false` | 是否携带跨域凭证 |
| `headers` | `Record<string, string>` | `{ "Content-Type": "application/json;" }` | 请求头 |
| `validateStatus` | `(status: number) => boolean` | `(s) => s === 200` | 判断请求是否成功 |
| `responseType` | `XMLHttpRequestResponseType` | `"json"` | 响应数据类型 |
| `error` | `ErrorCall` | `noop` | 发送失败的回调 |
| `success` | `SuccessCall` | `noop` | 发送成功的回调 |
| `order` | `"pre" \| "post"` | `"pre"` | 在 send 管道中的执行顺序 |
| `excludes` | `Ignore` | `[]` | 不发送的事件列表，会交给下一个发送器 |
| `middleware` | `MiddlewareApi[]` | `[]` | 发送中间件 |

### Beacon

```ts
import { BeaconSenderPlugin } from "@tracing/browser-sender";
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | `string` | `""` | **必填**，上报地址 |
| `order` | `"pre" \| "post"` | `"post"` | 在 send 管道中的执行顺序 |
| `excludes` | `Ignore` | `[]` | 不发送的事件列表 |
| `middleware` | `MiddlewareApi[]` | `[]` | 发送中间件 |

### Fetch

```ts
import { FetchSenderPlugin } from "@tracing/browser-sender";
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | `string` | `""` | **必填**，上报地址 |
| `method` | `string` | `"POST"` | 请求方法 |
| `headers` | `Record<string, any>` | `{ "Content-Type": "application/json;" }` | 请求头 |
| `timeout` | `number` | `2000` | 超时时间（ms） |
| `validateStatus` | `(status: number) => boolean` | `(s) => s === 200` | 判断请求是否成功 |
| `order` | `"pre" \| "post"` | `"pre"` | 在 send 管道中的执行顺序 |
| `excludes` | `Ignore` | `[]` | 不发送的事件列表 |
| `middleware` | `MiddlewareApi[]` | `[]` | 发送中间件 |

## 发送中间件

中间件参考 Redux compose 模式，对 `BaseSenderHandle` 进行增强。

### 错误重发

```ts
import { ErrorRetryMiddleware } from "@tracing/browser-sender";

XhrSenderPlugin({
  url: "/collect",
  middleware: [
    ErrorRetryMiddleware({
      retryCount: 3,
      retryInterval: 1000,
      retryWeight: (count, interval) => count * interval,
      retryIgnoreEvent: [],
      retryIgnoreErrorCode: []
    })
  ]
})
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `retryCount` | `number` | `3` | 最大重试次数 |
| `retryInterval` | `number` | `1000` | 重试间隔基数（ms） |
| `retryWeight` | `(count, interval) => number` | `count * interval` | 重试间隔计算函数 |
| `retryIgnoreEvent` | `Ignore` | `[]` | 忽略重试的事件列表 |
| `retryIgnoreErrorCode` | `Ignore<SenderError>` | `[]` | 忽略重试的错误码列表 |

### 批量发送

```ts
import { BatchSendMiddleware } from "@tracing/browser-sender";

XhrSenderPlugin({
  url: "/collect",
  middleware: [
    BatchSendMiddleware({
      batchCount: 5,
      batchIgnore: []
    })
  ]
})
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `batchCount` | `number` | `5` | 积攒多少条后批量发送 |
| `batchIgnore` | `Ignore` | `[]` | 忽略批量的事件列表 |

## 自定义发送方式

实现 `BaseSenderFactory` 接口即可自定义发送方式：

```ts
import type { BaseSenderHandle, BaseSenderFactory } from "@tracing/browser-sender";

type BaseSenderHandle = (
  event: string,
  build: Record<string, any>,
  error: ErrorCall,
  success: SuccessCall
) => void;

type BaseSenderFactory<T extends Record<string, any>> = (config?: Partial<T>) => BaseSenderHandle;
```

详细参考 [XhrSenderPlugin](src/xhr.ts#L110) 实现。

## 插件生命周期

| 钩子 | 行为 |
|------|------|
| `send` | 根据 `order`（pre/post）注册到 send 管道，检查 excludes 后发送数据，返回 `false` 熔断 |
| `beforeDestroy` | 异步执行中间件销毁（batch 清空队列、retry 清空定时器） |
