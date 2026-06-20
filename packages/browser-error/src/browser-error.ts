import type { TracingPlugin, TracingCore } from "@tracing/core";

import {
  createOnerrorHandler,
  createUnhandledRejectionHandler,
  createResourceErrorHandler,
  createConsoleErrorHandler
} from "./handlers";

export interface BrowserErrorConfig {
  onerror: boolean;
  onunhandledrejection: boolean;
  resourceError: boolean;
  captureConsole: boolean;
  ignoreErrors: (string | RegExp)[];
  denyUrls: (string | RegExp)[];
  allowUrls: (string | RegExp)[];
  stackTraceLimit: number;
  linkedErrorsLimit: number;
  resourceWatchTags: string[];
}

export const BrowserErrorEvent = "browser-error";

export const defaultConfig: BrowserErrorConfig = {
  onerror: true,
  onunhandledrejection: true,
  resourceError: true,
  captureConsole: false,
  ignoreErrors: ["Script error", "Javascript error: Script error"],
  denyUrls: [],
  allowUrls: [],
  stackTraceLimit: 10,
  linkedErrorsLimit: 5,
  resourceWatchTags: ["script", "link", "img", "video", "audio", "iframe"]
};

export function BrowserErrorPlugin(inputConfig?: Partial<BrowserErrorConfig>): TracingPlugin {
  const config: BrowserErrorConfig = {
    ...defaultConfig,
    ...inputConfig
  };

  let cleanups: (() => void)[] = [];

  return {
    name: "tracing:browser-error",

    start(core: TracingCore) {
      cleanups = [];

      if (config.onerror) {
        cleanups.push(createOnerrorHandler(core, config).cleanup);
      }

      if (config.onunhandledrejection) {
        cleanups.push(createUnhandledRejectionHandler(core, config).cleanup);
      }

      if (config.resourceError) {
        cleanups.push(createResourceErrorHandler(core, config).cleanup);
      }

      if (config.captureConsole) {
        cleanups.push(createConsoleErrorHandler(core, config).cleanup);
      }

      return () => {
        cleanups.forEach(fn => fn());
        cleanups = [];
      };
    },

    destroy() {
      cleanups.forEach(fn => fn());
      cleanups = [];
    }
  };
}
