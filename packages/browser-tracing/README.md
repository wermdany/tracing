# browser-tracing

提供集成了 Tracing 全部能力，但是你还是可以通过配置来开关和配置具体功能

> 处于对打包体积的考虑，如果您只需要部分功能请参考 [定制功能](../../README.md#定制功能)

## 使用

```sh

pnpm install browser-tracing

```

```ts
import type { BrowserTracingConfig } from "browser-tracing";
import { createBrowserTracing } from "browser-tracing";

const config: BrowserTracingConfig = {
  url: "/apis/success",
  xhrResponseType: "json",
  xhrTimeout: 1000
};

export const tracing = createBrowserTracing(config);
```

如果需要配置插件

```ts
import type { BrowserTracingConfig } from "browser-tracing";
import { createBrowserTracing } from "browser-tracing";

const config: BrowserTracingConfig = {
  url: "/apis/success",
  xhrResponseType: "json",
  xhrTimeout: 1000,
  webClick: {
    watchElement: ["a", "button"]
  }
};

export const tracing = createBrowserTracing(config);
```

关闭插件能力只需要设置 `webClick:false` 即可

## 内部插件

内部插件，提供了负责整个流程的必须能力，比如发送、组装发送格式

### NormalBuildPlugin

提供基本的组装发送数据格式能力

#### 配置参数

```ts
interface BuildFormatParams {
  header: Record<string, any>;
  build: Record<string, any>;
  event: string;
}

export interface NormalBuildPluginConfig {
  formatBuild: (params: BuildFormatParams) => Record<string, any>;
  headers: Record<string, StoreProfile>;
}
```

##### formatBuild

- Type: `BuildFormatParams` 选填
- Default: `{ "event": "event", "header": {}, "body": {} }`

格式化发送数据

##### headers

- Type: `Record<string, StoreProfile>` 选填
- Default:

```ts
import {
  getPathName,
  getReferrer,
  getViewportHeight,
  getScreenHeight,
  getScreenWidth,
  getTitle,
  getUrl,
  getTimezoneOffset,
  getViewportWidth
} from "@tracing/shared";

const defaultHeaders = {
  path: getPathName,
  referrer: getReferrer,
  viewportWidth: getViewportWidth,
  viewportHeight: getViewportHeight,
  screenWidth: getScreenWidth,
  screenHeight: getScreenHeight,
  title: getTitle,
  url: getUrl,
  timezoneOffset: getTimezoneOffset
};
```

设置公共头部信息

### NormalSendPlugin

提供 Ajax 上报能力，同时还可以在失败时进行重发

#### 配置参数

```ts
interface BaseSenderConfig {
  url: string;
}

export interface XhrSenderConfig<T extends keyof XhrResponseMap = "json"> extends BaseSenderConfig {
  xhrTimeout: number;
  xhrMethods: "POST";
  xhrWithCredentials: boolean;
  xhrHeaders: Record<string, string>;
  xhrValidateStatus: (status: number) => boolean;
  xhrResponseType: T;
}

interface RetryConfig {
  xhrRetryCount: number;
  xhrRetryInterval: number;
}

export interface NormalSendPluginConfig extends XhrConfig, RetryConfig {}
```

##### url

- Type: `string` 必填
- Default: `""`

上报地址

##### xhrTimeout

- Type: `number` 选填
- Default: `1000`

超时时间

##### xhrMethods

- Type: `POST` 选填
- Default: `POST`

Ajax 发送方式

##### xhrWithCredentials

- Type: `boolean` 选填
- Default: `false`

是否发送跨域请求凭证

##### xhrHeaders

- Type: `Record<string, string>` 选填
- Default: `{ "Content-Type": "application/json;" }`

设置请求头

##### xhrValidateStatus

- Type: `(status: number) => boolean` 选填
- Default: `(status) => status === 200`

判断是否请求成功

##### xhrResponseType

- Type: `"" | "arraybuffer" | "blob" | "document" | "json" | "text"` 选填
- Default: `json`

返回数据类型

##### xhrRetryCount

- Type: `number` 选填
- Default: `3`

错误重发次数

##### xhrRetryInterval

- Type: `number` 选填
- Default: `1000`

错误重发间隔

> 错误重发会基于权重决定顺序，权重计算方式为：
>
> ```ts
> const getQueueWeight = (count: number) => 2 ** xhrRetryCount * xhrRetryInterval;
> ```
