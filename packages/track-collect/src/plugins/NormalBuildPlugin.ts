import type { CollectPlugin, Collector } from "@collect/core";
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
} from "@collect/shared";

export function NormalBuildPlugin(): CollectPlugin {
  let collect: Collector;

  return {
    name: "NormalBuildPlugin",
    init(ctx) {
      collect = ctx;

      ctx.header.set("path", getPathName);
      ctx.header.set("referrer", getReferrer);
      ctx.header.set("viewportWidth", getViewportWidth);
      ctx.header.set("viewportHeight", getViewportHeight);
      ctx.header.set("screenWidth", getScreenWidth);
      ctx.header.set("screenHeight", getScreenHeight);
      ctx.header.set("title", getTitle);
      ctx.header.set("url", getUrl);
      ctx.header.set("timezoneOffset", getTimezoneOffset);
    },
    build: {
      order: "pre",
      handler(event, record) {
        return {
          header: collect.header.get(),
          event,
          body: {
            ...record
          }
        };
      }
    }
  };
}
