import type { BuildPluginConfig } from "./BuildPlugin";
import { BuildPlugin } from "./BuildPlugin";

import type { SenderPluginConfig } from "./SenderPlugin";
import { SenderPlugin } from "./SenderPlugin";

import type { BrowserClickPluginConfig } from "@tracing/browser-click";
import { BrowserClickPlugin } from "@tracing/browser-click";

import type { ResourceConfig } from "@tracing/browser-resource";
import { BrowserResourcePlugin } from "@tracing/browser-resource";

import type { BrowserPageConfig } from "@tracing/browser-page";
import { BrowserPagePlugin } from "@tracing/browser-page";

import type { BrowserScrollPluginConfig } from "@tracing/browser-scroll";
import { BrowserScrollPlugin } from "@tracing/browser-scroll";

import type { BrowserHttpAxiosPluginConfig } from "@tracing/browser-http-axios";
import { BrowserHttpAxiosPlugin } from "@tracing/browser-http-axios";

import type { PerformanceConfig } from "@tracing/browser-performance";
import { BrowserPerformancePlugin } from "@tracing/browser-performance";

import type { BrowserExposePluginConfig } from "@tracing/browser-expose";
import { BrowserExposePlugin } from "@tracing/browser-expose";

export interface NormalPluginConfig extends BuildPluginConfig, SenderPluginConfig {
  webClick: Partial<BrowserClickPluginConfig> | false;
  resource: Partial<ResourceConfig> | false;
  page: Partial<BrowserPageConfig> | false;
  scroll: Partial<BrowserScrollPluginConfig> | false;
  axios: BrowserHttpAxiosPluginConfig | false;
  performance: Partial<PerformanceConfig> | false;
  expose: Partial<BrowserExposePluginConfig> | false;
}

export function createNormalPlugin(config: Partial<NormalPluginConfig>) {
  const plugins = [BuildPlugin(config), ...SenderPlugin(config)];

  if (config.webClick !== false) {
    plugins.push(BrowserClickPlugin(config.webClick));
  }

  if (config.resource !== false) {
    plugins.push(BrowserResourcePlugin(config.resource));
  }

  if (config.page !== false) {
    plugins.push(BrowserPagePlugin(config.page));
  }

  if (config.scroll !== false) {
    plugins.push(BrowserScrollPlugin(config.scroll));
  }

  if (config.axios !== false && config.axios) {
    plugins.push(BrowserHttpAxiosPlugin(config.axios));
  }

  if (config.performance !== false) {
    plugins.push(BrowserPerformancePlugin(config.performance));
  }

  if (config.expose !== false) {
    plugins.push(BrowserExposePlugin(config.expose));
  }

  return plugins;
}
