import type { PartialOmit } from "@tracing/shared";
import type { TracingCoreConfig } from "@tracing/core";
import type { NormalPluginConfig } from "./plugins";

import { TracingCore } from "@tracing/core";

import { createNormalPlugin } from "./plugins";

export type BrowserTracingConfig = PartialOmit<NormalPluginConfig & TracingCoreConfig, "url">;

export function createBrowserTracing(config: BrowserTracingConfig) {
  const defaultPlugins = createNormalPlugin(config);

  const allPlugins = config.plugins ? [...defaultPlugins, ...config.plugins] : defaultPlugins;

  const instance = new TracingCore({ ...config, plugins: allPlugins });

  instance.init();

  return instance;
}
