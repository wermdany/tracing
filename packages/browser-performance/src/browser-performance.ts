import type { TracingPlugin } from "@tracing/core";

import type { WebVitalConfig } from "./web-vitals";
import { observeLCP, observeFID, observeCLS, observeFCP, observeTTFB } from "./web-vitals";

import type { NavigationTimingData } from "./navigation-timing";
import { observeNavigationTiming } from "./navigation-timing";

import type { LongTaskConfig, LongTaskData } from "./long-tasks";
import { observeLongTasks } from "./long-tasks";

import type { MemoryConfig, MemoryData } from "./memory";
import { observeMemory } from "./memory";

export { observeLCP, observeFID, observeCLS, observeFCP, observeTTFB } from "./web-vitals";

export { observeNavigationTiming } from "./navigation-timing";
export { observeLongTasks } from "./long-tasks";
export { observeMemory } from "./memory";

export const PerformancePageloadEvent = "performance-pageload";
export const PerformanceFIDEvent = "performance-fid";
export const PerformanceCLSEvent = "performance-cls";
export const PerformanceLongTaskEvent = "performance-longtask";
export const PerformanceMemoryEvent = "performance-memory";

export interface PerformanceConfig {
  webVitals: Partial<WebVitalConfig> | false;
  navigation: boolean;
  longTasks: Partial<LongTaskConfig> | false;
  memory: Partial<MemoryConfig> | false;
  batchPageLoad: boolean;
}

const defaultWebVitalConfig: WebVitalConfig = {
  lcp: true,
  fid: true,
  cls: true,
  fcp: true,
  ttfb: true
};

const defaultLongTaskConfig: LongTaskConfig = {
  minDuration: 50
};

const defaultMemoryConfig: MemoryConfig = {
  samplingIntervalMs: 30000
};

const defaultConfig: PerformanceConfig = {
  webVitals: defaultWebVitalConfig,
  navigation: false,
  longTasks: false,
  memory: false,
  batchPageLoad: false
};

interface PageloadBuffer {
  lcp: { value: number; rating: string } | null;
  fcp: { value: number; rating: string } | null;
  ttfb: { value: number; rating: string } | null;
  navigation: NavigationTimingData | null;
}

function buildPageloadBody(buffer: PageloadBuffer): Record<string, any> {
  const body: Record<string, any> = {};

  if (buffer.lcp) {
    body.lcp = buffer.lcp.value;
    body.lcpRating = buffer.lcp.rating;
  }

  if (buffer.fcp) {
    body.fcp = buffer.fcp.value;
    body.fcpRating = buffer.fcp.rating;
  }

  if (buffer.ttfb) {
    body.ttfb = buffer.ttfb.value;
    body.ttfbRating = buffer.ttfb.rating;
  }

  if (buffer.navigation) {
    const n = buffer.navigation;
    body.navDomContentLoadedTime = n.domContentLoadedTime;
    body.navLoadTime = n.loadTime;
    body.navDomInteractiveTime = n.domInteractiveTime;
    body.navRedirectTime = n.redirectTime;
    body.navDnsTime = n.dnsTime;
    body.navTcpTime = n.tcpTime;
    body.navTtfb = n.ttfb;
    body.navResponseTime = n.responseTime;
    body.navDomContentLoadedEventEnd = n.domContentLoadedEventEnd;
    body.navLoadEventEnd = n.loadEventEnd;
    body.navDomInteractive = n.domInteractive;
    body.navDomComplete = n.domComplete;
    body.navDomContentLoadedEventStart = n.domContentLoadedEventStart;
    body.navLoadEventStart = n.loadEventStart;
    body.navRedirectCount = n.redirectCount;
    body.navFetchStart = n.fetchStart;
    body.navResponseStart = n.responseStart;
  }

  return body;
}

export function BrowserPerformancePlugin(config?: Partial<PerformanceConfig>): TracingPlugin {
  const resolveConfig: PerformanceConfig = { ...defaultConfig, ...config };

  return {
    name: "tracing:performance",
    start(ctx) {
      const cleanups: (() => void)[] = [];

      const wvConfig: WebVitalConfig =
        resolveConfig.webVitals === false
          ? { lcp: false, fid: false, cls: false, fcp: false, ttfb: false }
          : resolveConfig.webVitals === true
          ? defaultWebVitalConfig
          : { ...defaultWebVitalConfig, ...resolveConfig.webVitals };

      if (resolveConfig.batchPageLoad) {
        const buffer: PageloadBuffer = {
          lcp: null,
          fcp: null,
          ttfb: null,
          navigation: null
        };
        let flushed = false;

        const flush = () => {
          if (flushed) return;
          flushed = true;
          ctx.report(PerformancePageloadEvent, buildPageloadBody(buffer));
        };

        if (wvConfig.lcp) {
          cleanups.push(
            observeLCP(data => {
              buffer.lcp = { value: data.value, rating: data.rating };
            })
          );
        }

        if (wvConfig.fcp) {
          cleanups.push(
            observeFCP(data => {
              buffer.fcp = { value: data.value, rating: data.rating };
            })
          );
        }

        if (wvConfig.ttfb) {
          cleanups.push(
            observeTTFB(data => {
              buffer.ttfb = { value: data.value, rating: data.rating };
            })
          );
        }

        if (resolveConfig.navigation) {
          cleanups.push(
            observeNavigationTiming((data: NavigationTimingData) => {
              buffer.navigation = data;
            })
          );
        }

        if (wvConfig.fid) {
          cleanups.push(
            observeFID(data => {
              ctx.report(PerformanceFIDEvent, data);
            })
          );
        }

        if (wvConfig.cls) {
          cleanups.push(
            observeCLS(data => {
              ctx.report(PerformanceCLSEvent, data);
            })
          );
        }

        if (document.readyState === "complete") {
          flush();
        } else {
          window.addEventListener("load", flush);
        }
      } else {
        if (wvConfig.lcp) {
          cleanups.push(
            observeLCP(data => {
              ctx.report(PerformancePageloadEvent, data);
            })
          );
        }

        if (wvConfig.fcp) {
          cleanups.push(
            observeFCP(data => {
              ctx.report(PerformancePageloadEvent, data);
            })
          );
        }

        if (wvConfig.ttfb) {
          cleanups.push(
            observeTTFB(data => {
              ctx.report(PerformancePageloadEvent, data);
            })
          );
        }

        if (wvConfig.fid) {
          cleanups.push(
            observeFID(data => {
              ctx.report(PerformanceFIDEvent, data);
            })
          );
        }

        if (wvConfig.cls) {
          cleanups.push(
            observeCLS(data => {
              ctx.report(PerformanceCLSEvent, data);
            })
          );
        }

        if (resolveConfig.navigation) {
          cleanups.push(
            observeNavigationTiming((data: NavigationTimingData) => {
              ctx.report(PerformancePageloadEvent, data);
            })
          );
        }
      }

      if (resolveConfig.longTasks !== false) {
        const ltConfig: LongTaskConfig =
          resolveConfig.longTasks === true
            ? defaultLongTaskConfig
            : { ...defaultLongTaskConfig, ...resolveConfig.longTasks };

        cleanups.push(
          observeLongTasks(ltConfig, (data: LongTaskData) => {
            ctx.report(PerformanceLongTaskEvent, data);
          })
        );
      }

      if (resolveConfig.memory !== false) {
        const memConfig: MemoryConfig =
          resolveConfig.memory === true
            ? defaultMemoryConfig
            : { ...defaultMemoryConfig, ...resolveConfig.memory };

        cleanups.push(
          observeMemory(memConfig, (data: MemoryData) => {
            ctx.report(PerformanceMemoryEvent, data);
          })
        );
      }

      return () => {
        cleanups.forEach(fn => fn());
      };
    }
  };
}
