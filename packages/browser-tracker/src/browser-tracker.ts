import type { PartialOmit } from "@tracker/shared";
import type { TrackerCoreConfig } from "@tracker/core";
import type { NormalPluginConfig } from "./plugins";

import { TrackerCore } from "@tracker/core";

import { createNormalPlugin } from "./plugins";

export function createBrowserTracker(config: PartialOmit<NormalPluginConfig & TrackerCoreConfig, "url">) {
  const normalPlugins = createNormalPlugin(config);

  if (config.plugins) {
    config.plugins.unshift(normalPlugins);
  }

  config.plugins = normalPlugins;

  const tc = new TrackerCore(config);

  tc.init();

  return tc;
}
