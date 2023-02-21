export type { Store, StoreProfile } from "./store";
export { createStore } from "./store";

export type { LoggerConfig, Logger } from "./logger";
export { createLogger } from "./logger";

export type { TracingCoreConfig } from "./config";
export { TracingCore } from "./core";

export type { XhrSenderConfig as XhrConfig } from "./sender";
export { createBeaconSender, createXhrSender, XhrErrorEnum } from "./sender";

export type { PluginHooks, TracingPlugin, PluginContext } from "./plugin";

export const version = __VERSION__;
