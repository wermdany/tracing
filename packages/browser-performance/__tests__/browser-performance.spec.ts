import { observeFCP, observeTTFB, observeLCP, observeCLS, observeFID } from "../src/web-vitals";
import { observeNavigationTiming } from "../src/navigation-timing";
import { observeMemory, getMemorySupport } from "../src/memory";
import { observeLongTasks } from "../src/long-tasks";
import * as modules from "../src";

describe("web-vitals", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("observeFCP should return cleanup function", () => {
    const mockFn = jest.fn();
    const cleanup = observeFCP(mockFn);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("observeTTFB should report from navigation entry", () => {
    const mockNavEntry = {
      responseStart: 600,
      requestStart: 100,
      startTime: 0,
      duration: 1600,
      name: "test",
      entryType: "navigation",
      toJSON() {
        return { responseStart: 600, requestStart: 100 };
      }
    };

    const mockGetEntriesByType: any = (type: string) => {
      if (type === "navigation") return [mockNavEntry];
      return [];
    };

    const originalFn = performance.getEntriesByType;
    try {
      performance.getEntriesByType = mockGetEntriesByType;
    } catch {
      Object.defineProperty(performance, "getEntriesByType", {
        value: mockGetEntriesByType,
        configurable: true,
        writable: true
      });
    }

    Object.defineProperty(document, "readyState", {
      value: "complete",
      configurable: true
    });

    const mockFn = jest.fn();
    const cleanup = observeTTFB(mockFn);

    expect(mockFn).toHaveBeenCalledTimes(1);
    const data = mockFn.mock.calls[0][0];
    expect(data).toHaveProperty("value");
    expect(data).toHaveProperty("rating");

    try {
      performance.getEntriesByType = originalFn;
    } catch {
      Object.defineProperty(performance, "getEntriesByType", {
        value: originalFn,
        configurable: true,
        writable: true
      });
    }
    cleanup();
  });

  it("observeLCP should return cleanup function", () => {
    const mockFn = jest.fn();
    const cleanup = observeLCP(mockFn);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("observeCLS should return cleanup function", () => {
    const mockFn = jest.fn();
    const cleanup = observeCLS(mockFn);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("observeFID should return cleanup function", () => {
    const mockFn = jest.fn();
    const cleanup = observeFID(mockFn);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });
});

describe("navigation-timing", () => {
  const mockNavEntry = {
    fetchStart: 100,
    responseStart: 600,
    responseEnd: 800,
    domInteractive: 900,
    domContentLoadedEventStart: 950,
    domContentLoadedEventEnd: 1000,
    domComplete: 1500,
    loadEventStart: 1500,
    loadEventEnd: 1600,
    redirectStart: 0,
    redirectEnd: 0,
    redirectCount: 0,
    domainLookupStart: 200,
    domainLookupEnd: 300,
    connectStart: 300,
    connectEnd: 500,
    secureConnectionStart: 400,
    startTime: 0,
    duration: 1600,
    name: "test",
    entryType: "navigation",
    toJSON() {
      return {
        fetchStart: this.fetchStart,
        responseStart: this.responseStart,
        responseEnd: this.responseEnd,
        domInteractive: this.domInteractive,
        domContentLoadedEventStart: this.domContentLoadedEventStart,
        domContentLoadedEventEnd: this.domContentLoadedEventEnd,
        domComplete: this.domComplete,
        loadEventStart: this.loadEventStart,
        loadEventEnd: this.loadEventEnd,
        redirectStart: this.redirectStart,
        redirectEnd: this.redirectEnd,
        redirectCount: this.redirectCount,
        domainLookupStart: this.domainLookupStart,
        domainLookupEnd: this.domainLookupEnd,
        connectStart: this.connectStart,
        connectEnd: this.connectEnd
      };
    }
  };

  it("should report navigation timing data when page is complete", () => {
    const originalFn = performance.getEntriesByType;
    const mockGetEntriesByType: any = (type: string) => {
      if (type === "navigation") return [mockNavEntry];
      return [];
    };

    try {
      performance.getEntriesByType = mockGetEntriesByType;
    } catch {
      Object.defineProperty(performance, "getEntriesByType", {
        value: mockGetEntriesByType,
        configurable: true,
        writable: true
      });
    }

    Object.defineProperty(document, "readyState", {
      value: "complete",
      configurable: true
    });

    const mockFn = jest.fn();
    const cleanup = observeNavigationTiming(mockFn);

    expect(mockFn).toHaveBeenCalledTimes(1);
    const data = mockFn.mock.calls[0][0];
    expect(data).toHaveProperty("domContentLoadedTime");
    expect(data).toHaveProperty("loadTime");
    expect(data).toHaveProperty("ttfb");
    expect(data.domContentLoadedTime).toBe(900);
    expect(data.loadTime).toBe(1500);
    expect(data.ttfb).toBe(500);

    try {
      performance.getEntriesByType = originalFn;
    } catch {
      Object.defineProperty(performance, "getEntriesByType", {
        value: originalFn,
        configurable: true,
        writable: true
      });
    }
    cleanup();
  });

  it("should return noop when navigation entry not available", () => {
    const originalFn = performance.getEntriesByType;
    const mockFn2: any = () => [];

    try {
      performance.getEntriesByType = mockFn2;
    } catch {
      Object.defineProperty(performance, "getEntriesByType", {
        value: mockFn2,
        configurable: true,
        writable: true
      });
    }

    const mockFn = jest.fn();
    const cleanup = observeNavigationTiming(mockFn);
    expect(typeof cleanup).toBe("function");
    cleanup();
    expect(mockFn).not.toHaveBeenCalled();

    try {
      performance.getEntriesByType = originalFn;
    } catch {
      Object.defineProperty(performance, "getEntriesByType", {
        value: originalFn,
        configurable: true,
        writable: true
      });
    }
  });
});

describe("long-tasks", () => {
  it("should return cleanup function", () => {
    const mockFn = jest.fn();
    const cleanup = observeLongTasks({ minDuration: 50 }, mockFn);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });
});

describe("memory", () => {
  it("getMemorySupport should return boolean", () => {
    const result = getMemorySupport();
    expect(typeof result).toBe("boolean");
  });

  it("should return cleanup function", () => {
    const mockFn = jest.fn();
    const cleanup = observeMemory({ samplingIntervalMs: 3000 }, mockFn);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });
});

describe("browser-performance -> output modules", () => {
  it("should export new event constants", () => {
    expect(modules.PerformancePageloadEvent).toBe("performance-pageload");
    expect(modules.PerformanceFIDEvent).toBe("performance-fid");
    expect(modules.PerformanceCLSEvent).toBe("performance-cls");
    expect(modules.PerformanceLongTaskEvent).toBe("performance-longtask");
    expect(modules.PerformanceMemoryEvent).toBe("performance-memory");
  });

  it("should not export old event constants", () => {
    expect((modules as any).PerformanceLCPEvent).toBeUndefined();
    expect((modules as any).PerformanceFCPEvent).toBeUndefined();
    expect((modules as any).PerformanceTTFBEvent).toBeUndefined();
    expect((modules as any).PerformanceNavigationEvent).toBeUndefined();
  });

  it("should output modules", () => {
    expect(modules).toMatchSnapshot();
  });
});
