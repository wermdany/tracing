import { noop, formatNumber } from "@tracing/shared";

export interface LongTaskConfig {
  minDuration: number;
}

export interface LongTaskData {
  duration: number;
  startTime: number;
  containerName: string;
  containerType: string;
  containerId: string;
  containerSrc: string;
}

function getContainerInfo(entry: PerformanceEntry) {
  const attribution = (entry as any).attribution;
  if (attribution && attribution.length > 0) {
    const container = attribution[0];
    return {
      containerName: container.containerName || "",
      containerType: container.containerType || "",
      containerId: container.containerId || "",
      containerSrc: container.containerSrc || ""
    };
  }
  return {
    containerName: "",
    containerType: "",
    containerId: "",
    containerSrc: ""
  };
}

export function observeLongTasks(config: LongTaskConfig, report: (data: LongTaskData) => void): () => void {
  if (typeof PerformanceObserver === "undefined") return noop;

  let observer: PerformanceObserver | null = null;

  try {
    observer = new PerformanceObserver(entryList => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        const duration = entry.duration;
        if (duration < config.minDuration) return;

        const container = getContainerInfo(entry);

        const data: LongTaskData = {
          duration: formatNumber(duration, 0),
          startTime: formatNumber(entry.startTime, 0),
          ...container
        };

        report(data);
      });
    });
    observer.observe({ type: "longtask" as string } as PerformanceObserverInit);
  } catch {
    return noop;
  }

  return () => {
    if (observer) observer.disconnect();
  };
}
