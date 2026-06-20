import { noop, formatNumber } from "@tracing/shared";

export interface MemoryConfig {
  samplingIntervalMs: number;
}

export interface MemoryData {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

export function getMemorySupport(): boolean {
  return "memory" in performance;
}

export function observeMemory(config: MemoryConfig, report: (data: MemoryData) => void): () => void {
  if (!getMemorySupport()) return noop;

  const mem = (performance as any).memory;

  function sample() {
    const data: MemoryData = {
      jsHeapSizeLimit: formatNumber(mem.jsHeapSizeLimit, 0),
      totalJSHeapSize: formatNumber(mem.totalJSHeapSize, 0),
      usedJSHeapSize: formatNumber(mem.usedJSHeapSize, 0)
    };

    report(data);
  }

  sample();

  const timerId = window.setInterval(sample, config.samplingIntervalMs);

  return () => {
    window.clearInterval(timerId);
  };
}
