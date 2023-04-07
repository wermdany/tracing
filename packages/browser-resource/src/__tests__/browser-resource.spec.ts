import { TracingCore } from "@tracing/core";

import {
  BrowserResourcePlugin,
  BrowserResourceEvent,
  defineResourceTimingMeasure
} from "../browser-resource";

const origin = {
  name: "https://www.google-analytics.com/analytics.js",
  entryType: "resource",
  startTime: 44.79999999701977,
  duration: 39.1000000089407,
  initiatorType: "script",
  nextHopProtocol: "",
  renderBlockingStatus: "non-blocking",
  workerStart: 0,
  redirectStart: 0,
  redirectEnd: 0,
  fetchStart: 44.79999999701977,
  domainLookupStart: 0,
  domainLookupEnd: 0,
  connectStart: 0,
  secureConnectionStart: 0,
  connectEnd: 0,
  requestStart: 0,
  responseStart: 0,
  responseEnd: 83.90000000596046,
  transferSize: 0,
  encodedBodySize: 0,
  decodedBodySize: 0,
  responseStatus: 0,
  serverTiming: []
};

function MockGetEntriesByType(length: number) {
  return () =>
    Array.from({ length }, () =>
      Object.assign({}, origin, {
        toJSON: () => origin
      })
    ) as PerformanceEntryList;
}

const observe = jest.fn();
const disconnect = jest.fn();

let callback: PerformanceObserverCallback;

class MockPerformanceObserver {
  public observe = observe;
  public disconnect = disconnect;

  constructor(call: PerformanceObserverCallback) {
    callback = call;
    return this;
  }
}

describe("test BrowserResourcePlugin", () => {
  let tc: TracingCore;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    // @ts-ignore
    window.PerformanceObserver = MockPerformanceObserver;

    performance.getEntriesByType = MockGetEntriesByType(10);

    tc = new TracingCore({
      plugins: [BrowserResourcePlugin()],
      isLogger: false
    });

    jest.spyOn(tc, "report");
    jest.spyOn(performance, "getEntriesByType");

    tc.init();
  });

  it("should init call native api", () => {
    // call getEntriesByType get PerformanceEntryList
    expect(performance.getEntriesByType).toBeCalledWith("resource");
    // call report count to 10
    expect(tc.report).toBeCalledTimes(10);
    // call report data
    expect(tc.report).toBeCalledWith(
      BrowserResourceEvent,
      defineResourceTimingMeasure({
        ...origin,
        ...{ toJSON: () => origin }
      } as unknown as PerformanceResourceTiming)
    );
    // call PerformanceObserver
    expect(observe).toBeCalledWith({ entryTypes: ["resource"] });
    // now not disconnect
    expect(disconnect).not.toBeCalled();
  });

  it("should plugin destroy call disconnect", async () => {
    // destroy call disconnect
    await tc.destroy();

    expect(disconnect).toBeCalled();
  });

  it("should trigger PerformanceObserver", async () => {
    // trigger PerformanceObserver entry
    callback(
      {
        getEntries: MockGetEntriesByType(3)
      } as PerformanceObserverEntryList,
      {} as PerformanceObserver
    );
    // loadedResource(10) + observe(3)
    expect(tc.report).toBeCalledTimes(10 + 3);
  });
});
