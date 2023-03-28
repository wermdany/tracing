import type {
  XhrSenderPluginConfig,
  FetchSenderPluginConfig,
  BeaconSenderPluginConfig,
  BaseSenderConfig,
  MiddlewareConfig
} from "@tracing/browser-sender";

import { XhrSenderPlugin, FetchSenderPlugin, BeaconSenderPlugin } from "@tracing/browser-sender";

import type { TracingPlugin } from "@tracing/core";

type Sender = "xhr" | "fetch" | "beacon";

type SenderUrl = string | ((sender: Sender) => string);

const senderPluginMap = {
  xhr: XhrSenderPlugin,
  fetch: FetchSenderPlugin,
  beacon: BeaconSenderPlugin
};

export interface SenderPluginConfig
  extends Partial<Omit<BaseSenderConfig, "url">>,
    Partial<MiddlewareConfig> {
  url: SenderUrl;
  xhr: Partial<XhrSenderPluginConfig> | false;
  fetch: Partial<FetchSenderPluginConfig> | false;
  beacon: Partial<BeaconSenderPluginConfig> | false;
}

const defineSenderConfig: SenderPluginConfig = {
  url: "",
  fetch: false,
  middleware: [],
  xhr: {
    order: "post",
    excludes: []
  },
  beacon: {
    order: "pre"
  }
};

export function SenderPlugin(config: Partial<SenderPluginConfig>) {
  const resolveConfig = { ...defineSenderConfig, ...config };
  return [
    createSenderPlugin("xhr", resolveConfig),
    createSenderPlugin("fetch", resolveConfig),
    createSenderPlugin("beacon", resolveConfig)
  ].filter(Boolean) as TracingPlugin[];
}

function createSenderPlugin<T extends Sender>(sender: T, config: SenderPluginConfig) {
  const current = config[sender];
  if (current === false) return false;

  const url = parseUrl(config.url, sender);

  const plugin = senderPluginMap[sender];

  return plugin({ ...config, ...{ url }, ...current });
}

function parseUrl(url: SenderUrl, sender: Sender) {
  if (typeof url === "function") return url(sender);
  return url;
}
