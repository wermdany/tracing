import type { TrackerPlugin, TrackerCore, StoreProfile } from "@tracker/core";
import {
  getPathName,
  getReferrer,
  getViewportHeight,
  getScreenHeight,
  getScreenWidth,
  getTitle,
  getUrl,
  getTimezoneOffset,
  getViewportWidth
} from "@tracker/shared";

interface BuildFormatParams {
  header: Record<string, any>;
  build: Record<string, any>;
  event: string;
}

export interface NormalBuildPluginConfig {
  formatBuild: (params: BuildFormatParams) => Record<string, any>;
  headers: Record<string, StoreProfile>;
}

export function NormalBuildPlugin(config: Partial<NormalBuildPluginConfig>): TrackerPlugin {
  let tracker: TrackerCore;

  const { formatBuild, headers } = config;

  const defaultHeaders = {
    path: getPathName,
    referrer: getReferrer,
    viewportWidth: getViewportWidth,
    viewportHeight: getViewportHeight,
    screenWidth: getScreenWidth,
    screenHeight: getScreenHeight,
    title: getTitle,
    url: getUrl,
    timezoneOffset: getTimezoneOffset
  };

  return {
    name: "NormalBuildPlugin",
    init(ctx) {
      tracker = ctx;

      const useHeaders = headers ? headers : defaultHeaders;

      for (const key in useHeaders) {
        if (Object.prototype.hasOwnProperty.call(useHeaders, key)) {
          ctx.header.set(key, useHeaders[key]);
        }
      }
    },
    build: {
      order: "pre",
      handler(event, record) {
        const header = tracker.header.get();

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
