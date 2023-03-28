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
