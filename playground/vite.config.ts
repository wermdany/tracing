import { resolve } from "node:path";
import { createRequire } from "node:module";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(resolve(__dirname, "../"));

const rootPkg = require(resolve("../package.json"));

import { MockServerPlugin } from "./scripts/node";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 是否使用 watch 模式，此时 vite 会直接使用 monorepo 文件作为源代码，便于直接调试
  const isWatch = mode === "watch";

  return {
    define: isWatch
      ? {
          __DEV__: JSON.stringify(command == "serve"),
          __VERSION__: JSON.stringify(rootPkg.version),
          __NAME__: JSON.stringify(rootPkg.name),
          __TEST__: "false",
          // watch 固定为 esm-bundler
          __ESM_BUNDLER__: "true",
          __ESM_BROWSER__: "false",
          __GLOBAL_BUILD__: "false"
        }
      : {},
    resolve: {
      alias: isWatch
        ? [
            {
              find: "browser-tracing",
              replacement: resolve(__dirname, "../packages/browser-tracing/src")
            },
            {
              find: /^@tracing\/(.*)/,
              replacement: resolve(__dirname, "../packages/$1/src")
            }
          ]
        : []
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true
        }
      }
    },
    plugins: [react(), MockServerPlugin()]
  };
});
