import type { TracingPlugin, TracingCore, StoreProfile } from "@tracing/core";
import {
  hasOwn,
  getPathName,
  getReferrer,
  getViewportHeight,
  getScreenHeight,
  getScreenWidth,
  getTitle,
  getUrl,
  getTimezoneOffset,
  getViewportWidth,
  getUserAgent,
  getOsName,
  getBrowserInfo,
  getNetworkType,
  getDeviceMemory,
  getHardwareConcurrency
} from "@tracing/shared";

interface BuildFormatParams {
  header: Record<string, any>;
  build: Record<string, any>;
  event: string;
}

export interface BuildPluginConfig {
  formatBuild: (params: BuildFormatParams) => Record<string, any>;
  headers: Record<string, StoreProfile>;
}

export function BuildPlugin(config?: Partial<BuildPluginConfig>): TracingPlugin {
  let tracing: TracingCore;

  const { formatBuild, headers } = config || {};

  const defaultHeaders = {
    path: getPathName,
    referrer: getReferrer,
    viewportWidth: getViewportWidth,
    viewportHeight: getViewportHeight,
    screenWidth: getScreenWidth,
    screenHeight: getScreenHeight,
    title: getTitle,
    url: getUrl,
    timezoneOffset: getTimezoneOffset,
    userAgent: getUserAgent,
    os: getOsName,
    browser: getBrowserInfo,
    networkType: getNetworkType,
    deviceMemory: getDeviceMemory,
    hardwareConcurrency: getHardwareConcurrency
  };

  return {
    name: "tracing:build",
    prepare(ctx) {
      tracing = ctx;

      const useHeaders = headers ? headers : defaultHeaders;

      for (const key in useHeaders) {
        if (hasOwn(useHeaders, key)) {
          ctx.header.set(key, useHeaders[key]);
        }
      }
    },
    build: {
      order: "pre",
      handler(event, record) {
        const header = tracing.header.get();

        const defaultFormat = {
          header,
          event,
          body: {
            ...record
          }
        };

        return formatBuild ? formatBuild({ header, build: record, event }) : defaultFormat;
      }
    }
  };
}
