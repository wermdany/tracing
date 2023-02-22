import type { NormalSendPluginConfig } from "./NormalSendPlugin";
import { NormalSendPlugin } from "./NormalSendPlugin";
import type { NormalBuildPluginConfig } from "./NormalBuildPlugin";

import { NormalBuildPlugin } from "./NormalBuildPlugin";

import type { WebClickPluginConfig } from "@tracing/web-click";
import { WebClickPlugin } from "@tracing/web-click";

export interface NormalPluginConfig extends NormalSendPluginConfig, NormalBuildPluginConfig {
  webClick?: Partial<WebClickPluginConfig> | false;
}

export function createNormalPlugin(config: Partial<NormalPluginConfig>) {
  const plugins = [NormalSendPlugin(config), NormalBuildPlugin(config)];

  if (config.webClick !== false) {
    plugins.push(WebClickPlugin(config.webClick));
  }

  return plugins;
}
