import { noop, formatNumber } from "@tracing/shared";

interface LayoutShiftEntry {
  value: number;
  hadRecentInput: boolean;
}

export interface WebVitalConfig {
  lcp: boolean;
  fid: boolean;
  cls: boolean;
  fcp: boolean;
  ttfb: boolean;
}

const WEB_VITAL_THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800]
};

function getRating(metric: string, value: number): "good" | "needs-improvement" | "poor" {
  const thresholds = WEB_VITAL_THRESHOLDS[metric];
  if (!thresholds) return "needs-improvement";
  if (value <= thresholds[0]) return "good";
  if (value <= thresholds[1]) return "needs-improvement";
  return "poor";
}

export function observeLCP(
  report: (data: { value: number; rating: string; final?: boolean }) => void
): () => void {
  if (typeof PerformanceObserver === "undefined") return noop;

  let latestValue = 0;
  let observer: PerformanceObserver | null = null;

  try {
    observer = new PerformanceObserver(entryList => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        latestValue = formatNumber(entries[entries.length - 1].startTime, 0);
        report({ value: latestValue, rating: getRating("LCP", latestValue) });
      }
    });
    observer.observe({
      type: "largest-contentful-paint" as string,
      buffered: true
    } as PerformanceObserverInit);
  } catch {
    return noop;
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden" && latestValue > 0) {
      report({ value: latestValue, rating: getRating("LCP", latestValue), final: true });
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    if (observer) observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export function observeFID(report: (data: { value: number; rating: string }) => void): () => void {
  if (typeof PerformanceObserver === "undefined") return noop;

  let observer: PerformanceObserver | null = null;

  try {
    observer = new PerformanceObserver(entryList => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const firstInput = entries[0] as PerformanceEventTiming;
        const value = formatNumber(firstInput.processingStart! - firstInput.startTime!, 0);
        report({ value, rating: getRating("FID", value) });
        if (observer) observer.disconnect();
      }
    });
    observer.observe({ type: "first-input" as string, buffered: true } as PerformanceObserverInit);
  } catch {
    return noop;
  }

  return () => {
    if (observer) observer.disconnect();
  };
}

export function observeCLS(
  report: (data: { value: number; rating: string; final?: boolean }) => void
): () => void {
  if (typeof PerformanceObserver === "undefined") return noop;

  let clsValue = 0;
  let observer: PerformanceObserver | null = null;

  try {
    observer = new PerformanceObserver(entryList => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        const layoutShift = entry as unknown as LayoutShiftEntry;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      });
      clsValue = formatNumber(clsValue, 3);
    });
    observer.observe({ type: "layout-shift" as string, buffered: true } as PerformanceObserverInit);
  } catch {
    return noop;
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      report({ value: clsValue, rating: getRating("CLS", clsValue), final: true });
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    if (observer) observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export function observeFCP(report: (data: { value: number; rating: string }) => void): () => void {
  if (typeof PerformanceObserver === "undefined") return noop;

  let observer: PerformanceObserver | null = null;

  try {
    observer = new PerformanceObserver(entryList => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (entry.name === "first-contentful-paint") {
          const value = formatNumber(entry.startTime, 0);
          report({ value, rating: getRating("FCP", value) });
          if (observer) observer.disconnect();
        }
      });
    });
    observer.observe({ type: "paint" as string, buffered: true } as PerformanceObserverInit);
  } catch {
    return noop;
  }

  return () => {
    if (observer) observer.disconnect();
  };
}

export function observeTTFB(report: (data: { value: number; rating: string }) => void): () => void {
  const entries = performance.getEntriesByType("navigation");
  const navEntry = entries[0] as PerformanceNavigationTiming | undefined;
  if (!navEntry) return noop;

  function send() {
    const value = formatNumber(navEntry!.responseStart - navEntry!.requestStart, 0);
    report({ value, rating: getRating("TTFB", value) });
  }

  if (document.readyState === "complete") {
    send();
    return noop;
  }

  function handler() {
    send();
  }

  window.addEventListener("load", handler);

  return () => {
    window.removeEventListener("load", handler);
  };
}
