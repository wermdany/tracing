import type { PartialOmit } from "@tracing/shared";
import type { TracingCoreConfig } from "@tracing/core";
import type { NormalPluginConfig } from "./plugins";

import { TracingCore } from "@tracing/core";

import { createNormalPlugin } from "./plugins";

export function createBrowserTracing(config: PartialOmit<NormalPluginConfig & TracingCoreConfig, "url">) {
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
