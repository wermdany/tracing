/**
 * in tracing time only is millisecond
 */

import { formatNumber } from "./helper";
import { unknown } from "./misc";

interface TracingPerformanceTimer {
  timeOrigin: number;
  now: () => number;
}

const performance = window.performance;

export function browserPerformanceTimer(): TracingPerformanceTimer | undefined {
  if (performance) {
    return {
      now: () => performance.now(),
      timeOrigin: Date.now() - performance.now()
    };
  }
}
const platformPerformance = browserPerformanceTimer();

/**
 * return page load relative time
 */
export function timestamp() {
  if (platformPerformance) return formatNumber(platformPerformance.now(), 0);
  return unknown;
}

/**
 * return local now time
 */
export function localTime() {
  return formatNumber(Date.now(), 0);
}
