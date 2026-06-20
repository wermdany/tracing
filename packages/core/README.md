# @tracing/core

Tracing 核心引擎，负责插件生命周期管理、事件上报管道调度以及 Store 状态管理。所有插件包均基于此核心运行。

## 安装

```bash
pnpm add @tracing/core
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
| `plugins` | `Array<TracingPlugin \| TracingPlugin[]>` | `[]` | 注册的插件列表，支持嵌套数组 |
| `sendLog` | `boolean \| ((event, build) => void)` | 开发环境开启 | 是否打印上报日志，或自定义日志函数 |

## 核心方法

| 方法 | 说明 |
|------|------|
| `init()` | 依次执行所有插件的 `prepare` → `start` 钩子 |
| `report(event, record, meta?)` | 触发 `build` → `beforeSend` → `send` 管道，完成数据上报 |
| `destroy()` | 异步执行 `beforeDestroy` → cleanup → `destroy`，清理所有资源 |

## 插件钩子执行顺序

```
init()
  ├─ prepare  (同步顺序)
  └─ start    (同步顺序，可返回 cleanup 函数)

report(event, record)
  ├─ build       (同步链式合并)
  ├─ beforeSend  (同步熔断，返回 false 阻止发送)
  └─ send        (同步熔断，返回 false 阻止后续发送器)

destroy()
  ├─ beforeDestroy  (异步并行)
  ├─ cleanup 函数    (并行)
  └─ destroy        (同步顺序)
```
