# @tracing/shared

共享工具函数库，提供类型判断、DOM/BOM 操作、存储封装、编解码、时间工具等通用能力。被所有 `@tracing/*` 包依赖。

## 安装

```bash
pnpm add @tracing/shared
```

## 快速开始

```ts
import { isBrowser, uuid4, encrypt, getUrl, getPathName } from "@tracing/shared";

if (isBrowser()) {
  console.log(getUrl(), getPathName());
}

const id = uuid4();
const encoded = encrypt("hello");
```

## 模块概览

| 模块 | 说明 |
|------|------|
| `is` | 类型判断，如 `isStr`、`isFn`、`isPlainObj`、`isElement` |
| `browser` | BOM/DOM 工具，如 `getUrl`、`getPathName`、`getViewportWidth`、`getElementSelector` |
| `helper` | 通用工具，如 `qs`（对象转 query）、`omit`、`pick`、`choice` |
| `time` | 时间工具，`browserPerformanceTimer`、`timestamp`、`localTime` |
| `encrypt` | Base64 编解码 |
| `storage` | `localStorage` / `sessionStorage` / `Cookie` 封装 |
| `misc` | `getGlobalThis`、`isBrowser`、`uuid4` |
| `typeUtils` | TypeScript 类型工具，如 `PartialOmit`、`UnionToIntersection` |
| `supports` | 特性检测，如 `isSupportSymbol` |

## 常用工具

### 类型判断

```ts
import { isStr, isFn, isPlainObj, isElement, isNum } from "@tracing/shared";

isStr("foo");   // true
isFn(() => {}); // true
isPlainObj({}); // true
```

### DOM 选择器

```ts
import { getElementSelector, getElementPath } from "@tracing/shared";

const el = document.querySelector("button");
getElementSelector(el); // "body > div.container > button.btn"
getElementPath(el);     // "body > div > button"
```

### 存储封装

```ts
import { createLocalStorage } from "@tracing/shared";

const store = createLocalStorage<{ token: string }>("my-app");
store.set("token", "abc");
store.get(); // { token: "abc" }
```
