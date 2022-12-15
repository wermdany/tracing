import type { CoreConfig } from "@collect/core";
import type { NormalPluginConfig } from "./plugins";
import type { PartialOmit } from "@collect/shared";

import { Collector } from "@collect/core";

import { createNormalPlugin } from "./plugins";

export function createCollectReport(config: PartialOmit<NormalPluginConfig & CoreConfig, "url">) {
  const normalPlugins = createNormalPlugin(config);

  if (config.plugins) {
    config.plugins.unshift(normalPlugins);
  }

  config.plugins = normalPlugins;

  const collector = new Collector(config);

  collector.init();

  return collector;
}
