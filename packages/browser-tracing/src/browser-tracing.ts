import type { PartialOmit } from "@tracing/shared";
import type { TracingCoreConfig } from "@tracing/core";
import type { NormalPluginConfig } from "./plugins";

import { TracingCore } from "@tracing/core";

import { createNormalPlugin } from "./plugins";

export type BrowserTracingConfig = PartialOmit<NormalPluginConfig & TracingCoreConfig, "url">;

export function createBrowserTracing(config: BrowserTracingConfig) {
  const normalPlugins = createNormalPlugin(config);

  if (config.plugins) {
    config.plugins.unshift(normalPlugins);
  } else {
    config.plugins = normalPlugins;
  }

  const tc = new TracingCore(config);

  tc.init();

  return tc;
}
