export type { Store } from "./store";
export { createStore } from "./store";

export type { LoggerConfig as LoggerOptions } from "./logger";
export { createLogger } from "./logger";

export type { CoreConfig } from "./config";
export { Collector } from "./collector";

export type { XhrSenderConfig as XhrConfig } from "./sender";
export { createBeaconSender, createXhrSender } from "./sender";

export type { PluginHooks, CollectPlugin, PluginContext } from "./plugin";

export const version = __VERSION__;
