export type { BuildPluginConfig } from "./plugins/BuildPlugin";
export { BuildPlugin } from "./plugins/BuildPlugin";

export type { BrowserTracingConfig } from "./browser-tracing";
export { createBrowserTracing } from "./browser-tracing";

export * from "@tracing/browser-sender";

export const version = __VERSION__;
