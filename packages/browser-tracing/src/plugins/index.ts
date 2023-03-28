import type { BuildPluginConfig } from "./BuildPlugin";
import { BuildPlugin } from "./BuildPlugin";

import type { SenderPluginConfig } from "./SenderPlugin";
import { SenderPlugin } from "./SenderPlugin";

import type { BrowserClickPluginConfig } from "@tracing/browser-click";
import { BrowserClickPlugin } from "@tracing/browser-click";

export interface NormalPluginConfig extends BuildPluginConfig, SenderPluginConfig {
  webClick: Partial<BrowserClickPluginConfig> | false;
}

export function createNormalPlugin(config: Partial<NormalPluginConfig>) {
  const plugins = [BuildPlugin(config), ...SenderPlugin(config)];

  if (config.webClick !== false) {
    plugins.push(BrowserClickPlugin(config.webClick));
  }

  return plugins;
}
