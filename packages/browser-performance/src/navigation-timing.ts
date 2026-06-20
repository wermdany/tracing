import { noop, formatNumber } from "@tracing/shared";

export interface NavigationTimingData {
  domContentLoadedTime: number;
  loadTime: number;
  domInteractiveTime: number;
  redirectTime: number;
  dnsTime: number;
  tcpTime: number;
  ttfb: number;
  responseTime: number;
  domContentLoadedEventEnd: number;
  loadEventEnd: number;
  domInteractive: number;
  domComplete: number;
  domContentLoadedEventStart: number;
  loadEventStart: number;
  redirectCount: number;
  fetchStart: number;
  responseStart: number;
}

export function observeNavigationTiming(report: (data: NavigationTimingData) => void): () => void {
  const entries = performance.getEntriesByType("navigation");
  const navEntry = entries[0] as PerformanceNavigationTiming | undefined;
  if (!navEntry) return noop;

  const n = navEntry;

  function send() {
    const data: NavigationTimingData = {
      domContentLoadedTime: formatNumber(n.domContentLoadedEventEnd - n.fetchStart, 0),
      loadTime: formatNumber(n.loadEventEnd - n.fetchStart, 0),
      domInteractiveTime: formatNumber(n.domInteractive - n.fetchStart, 0),
      redirectTime: formatNumber(n.redirectEnd - n.redirectStart, 0),
      dnsTime: formatNumber(n.domainLookupEnd - n.domainLookupStart, 0),
      tcpTime: formatNumber(n.connectEnd - n.connectStart, 0),
      ttfb: formatNumber(n.responseStart - n.fetchStart, 0),
      responseTime: formatNumber(n.responseEnd - n.responseStart, 0),
      domContentLoadedEventEnd: formatNumber(n.domContentLoadedEventEnd, 0),
      loadEventEnd: formatNumber(n.loadEventEnd, 0),
      domInteractive: formatNumber(n.domInteractive, 0),
      domComplete: formatNumber(n.domComplete, 0),
      domContentLoadedEventStart: formatNumber(n.domContentLoadedEventStart, 0),
      loadEventStart: formatNumber(n.loadEventStart, 0),
      redirectCount: n.redirectCount,
      fetchStart: formatNumber(n.fetchStart, 0),
      responseStart: formatNumber(n.responseStart, 0)
    };

    report(data);
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
