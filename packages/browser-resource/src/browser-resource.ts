import type { TracingPlugin, TracingCore } from "@tracing/core";
import { pickParse, formatNumber } from "@tracing/shared";
export interface ResourceConfig {
  watchResource: (timing: PerformanceResourceTiming) => boolean;
  resourceTimingMeasure: (timing: PerformanceResourceTiming) => Record<string, any>;
}

const defineResourceConfig: ResourceConfig = {
  watchResource: defineWatchResource,
  resourceTimingMeasure: defineResourceTimingMeasure
};

export function BrowserResourcePlugin(config?: Partial<ResourceConfig>): TracingPlugin {
  const resolveConfig = { ...defineResourceConfig, ...config };
  let core: TracingCore;

  function loadedResource() {
    const list = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    eachEntryList(list);
  }

  function observerResource() {
    const ob = new PerformanceObserver(entry => {
      const timings = entry.getEntries() as PerformanceResourceTiming[];

      eachEntryList(timings);
    });

    return {
      observe() {
        loadedResource();

        ob.observe({
          entryTypes: ["resource"]
        });
      },
      disconnect() {
        ob.disconnect();
      }
    };
  }

  function eachEntryList(timings: PerformanceResourceTiming[]) {
    const list = timings.slice();
    while (list.length) {
      const timing = list.shift()!;
      if (!resolveConfig.watchResource(timing)) {
        return;
      }
      const record = resolveConfig.resourceTimingMeasure(timing);

      core.report(BrowserResourceEvent, record);
    }
  }

  const { observe, disconnect } = observerResource();

  return {
    name: "tracing:browser-resource",
    init(ctx) {
      core = ctx;

      observe();
    },
    beforeDestroy() {
      disconnect();
    }
  };
}

export function defineResourceTimingMeasure(timing: PerformanceResourceTiming) {
  return pickParse(
    timing.toJSON(),
    [
      "connectStart",
      "connectEnd",
      "domainLookupStart",
      "domainLookupEnd",
      "duration",
      "fetchStart",
      "redirectStart",
      "redirectEnd",
      "requestStart",
      "responseEnd",
      "responseStart",
      "secureConnectionStart",
      "startTime"
    ],
    formatNumber,
    ["serverTiming"]
  );
}

export function defineWatchResource(timing: PerformanceResourceTiming) {
  return ["script", "link", "css", "img", "other"].includes(timing.initiatorType);
}

export const BrowserResourceEvent = "browser-resource";
