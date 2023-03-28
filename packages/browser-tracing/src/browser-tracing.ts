import type { PartialOmit } from "@tracing/shared";
import type { TracingCoreConfig } from "@tracing/core";
import type { NormalPluginConfig } from "./plugins";

import { TracingCore } from "@tracing/core";

import { createNormalPlugin } from "./plugins";

export type BrowserTracingConfig = PartialOmit<NormalPluginConfig & TracingCoreConfig, "url">;

export function createBrowserTracing(config: BrowserTracingConfig) {
  const plugins = createNormalPlugin(config);

  if (config.plugins) {
    config.plugins.unshift(plugins);
  } else {
    config.plugins = plugins;
  }

  const instance = new TracingCore(config);

  instance.init();

  return instance;
}
