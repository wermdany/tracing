# @tracing/browser-sender

提供数据上报能力

目前提供 XMLHttpRequest、fetch、beacon 三种上报方式

以下以使用 XMLHttpRequest 上报方式为例介绍，其余上报方式使用类似

## 使用

```sh
pnpm install @tracing/core @tracing/browser-sender
```

```ts
import { TracingCore } from "@tracing/core";
import { XhrSenderPlugin } from "@tracing/browser-sender";

const collect = new TracingCore({
  plugins: [XhrSenderPlugin()] // 已经使用 XMLHttpRequest 方式上报数据
});

collect.init();
```

## 配置项

```ts
export interface BaseSenderConfig {
  url: string;
  error: ErrorCall;
  success: SuccessCall;
}
```

### url

- Type: `string` 必填
- Default: `""`

上报数据地址

### error

- Type: `ErrorCall` 选填
- Default: `noop`

上报数据失败时执行的回调函数

注意：如果你使用了错误重发中间件，重发接口的状态只会在内部处理

### error

- Type: `SuccessCall` 选填
- Default: `noop`

上报数据成功时执行的回调函数

注意：如果你使用了错误重发中间件，重发接口的状态只会在内部处理

XMLHttpRequest 独有配置

```ts
export interface XhrSenderConfig<T extends XhrResponseType = "json"> extends BaseSenderConfig {
  timeout: number;
  methods: "POST";
  withCredentials: boolean;
  headers: Record<string, string>;
  validateStatus: (status: number) => boolean;
  responseType: T;
}
```

### timeout

- Type: `number` 选填
- Default: `2000` ms

上报超时时间， `0` 则永远不会超时

### methods

- Type: `"POST"` 选填
- Default: `"POST"` ms

上报请求方式

### withCredentials

- Type: `boolean` 选填
- Default: `false`

是否发送跨域请求凭证

### headers

- Type: `Record<string, string>` 选填
- Default: `{ "Content-Type": "application/json;" }`

设置请求头

### validateStatus

- Type: `(status: number) => boolean` 选填
- Default: `(status) => status === 200`

判断是否请求成功

### responseType

- Type: `"" | "arraybuffer" | "blob" | "document" | "json" | "text"` 选填
- Default: `json`

返回数据类型

XMLHttpRequest 插件独有

```ts
export interface XhrSenderPluginConfig extends XhrSenderConfig, MiddlewareConfig {
  order: handlerOrder;
  excludes: Ignore;
}
```

### order

- Type: `handlerOrder` 选填
- Default: `post`

这个插件要在什么顺序执行

### excludes

- Type: `Ignore` 选填
- Default: `[]`

这个插件不发送哪些事件，会交给下一个发送插件处理（如果有）

## 发送中间件

在上报数据的时候，可能有很多边界问题，最常见比如：批量发送、错误重发，要实现这个能力就需要使用中间件来实现

在这里，发送中间件充分参考了 redux 中间件，经过处理后，返回一个强化版的 `BaseSenderHandle`

### 拓展发送中间件

发送中间件是一个类似于 redux compose 的组合

```ts
export type Middleware<Base extends BaseSenderHandle = BaseSenderHandle> = (
  request: Base
) => (...args: Parameters<Base>) => void;

export type MiddlewareDestroy = (...args: any[]) => void | Promise<void>;

export type MiddlewareApi<Config extends Record<string, any> = {}> = (config: Partial<Config>) => {
  middleware: Middleware;
  destroy: MiddlewareDestroy;
};
```

如果你想要自定义一个发送中间件，可以参考上面接口，实现一个 `MiddlewareApi`

其中 `destroy` 是清除中间件的副作用，在实际使用中，比如批量发送会在销毁前会把队列中未发送的数据全部发送

### 错误重发

提供错误重发能力

```ts
export interface ErrorRetryConfig {
  retryCount: number;
  retryInterval: number;
  retryWeight: (count: number, interval: number) => number;
  retryIgnoreEvent: Ignore;
  retryIgnoreErrorCode: Ignore<SenderError>;
}
```

### 批量发送

提供批量发送能力

```ts
export interface BatchSenderConfig {
  batchCount: number;
  batchIgnore: Ignore;
}
```

## 自定义发送方式

如果目前内部提供的三种上报方式并不能满足你的需求，你也可以自定义一个发送方式

你只需要实现 `BaseSenderFactory`

```ts
export type BaseSenderHandle = (
  event: string,
  build: Record<string, any>,
  error: ErrorCall,
  success: SuccessCall
) => void;

export type BaseSenderFactory<T extends Record<string, any>> = (config?: Partial<T>) => BaseSenderHandle;
```

详细可以参考 [XhrSenderPlugin](src/xhr.ts#L110) 的实现方式
