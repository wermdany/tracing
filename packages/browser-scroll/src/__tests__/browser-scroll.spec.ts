import { TracingCore } from "@tracing/core";

import { BrowserScrollPlugin, defaultGenRecord, BrowserScrollEvent } from "../browser-scroll";

import * as modules from "..";

function createScrollableContainer(height = 2000) {
  const container = document.createElement("div");
  Object.defineProperties(container, {
    scrollHeight: { value: height, configurable: true, writable: true },
    clientHeight: { value: 768, configurable: true, writable: true }
  });
  container.scrollTop = 0;
  document.body.appendChild(container);
  return container;
}

function triggerScroll(container: HTMLElement, scrollTop: number) {
  container.scrollTop = scrollTop;
  container.dispatchEvent(new Event("scroll"));
}

describe("browser-scroll-plugin", () => {
  let container: HTMLElement;
  let tc: TracingCore;

  beforeEach(() => {
    jest.useFakeTimers();
    container = createScrollableContainer();

    tc = new TracingCore({
      plugins: [
        BrowserScrollPlugin({
          document: container,
          debounceMs: 300
        })
      ]
    });

    jest.spyOn(tc, "report");
    jest.spyOn(document, "addEventListener");
    jest.spyOn(document, "removeEventListener");

    tc.init();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("should add scroll event listener on init with capture", () => {
    expect(document.addEventListener).toHaveBeenCalledTimes(1);
    expect(document.addEventListener).toHaveBeenCalledWith("scroll", expect.any(Function), {
      capture: true,
      passive: true
    });
  });

  it("should not report when no scrolling happens", () => {
    expect(tc.report).not.toHaveBeenCalled();
  });

  it("should not report on destroy when no scrolling occurred", async () => {
    jest.clearAllMocks();
    await tc.destroy();
    expect(tc.report).not.toHaveBeenCalled();
  });

  it("should report after scrolling and debounce timeout", () => {
    triggerScroll(container, 100);
    expect(tc.report).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(tc.report).toHaveBeenCalledTimes(1);
  });

  it("should report BrowserScrollEvent with correct fields", () => {
    triggerScroll(container, 100);
    jest.advanceTimersByTime(300);

    expect(tc.report).toHaveBeenCalledWith(
      BrowserScrollEvent,
      expect.objectContaining({
        totalDwellTime: expect.any(Number),
        scrollSegments: expect.any(Number),
        maxScrollDepth: expect.any(Number),
        maxScrollDepthPercent: expect.any(Number),
        pageHeight: expect.any(Number),
        viewportHeight: expect.any(Number),
        elements: expect.any(Array)
      })
    );
  });

  it("should report elements with element info when scrolling", () => {
    triggerScroll(container, 100);
    jest.advanceTimersByTime(300);

    const record = (tc.report as jest.Mock).mock.calls[0][1];
    expect(record.elements).toHaveLength(1);

    const elInfo = record.elements[0];
    expect(elInfo).toMatchObject({
      elementTagName: "div",
      elementPath: expect.any(String),
      maxScrollDepth: 100,
      maxScrollDepthPercent: expect.any(Number),
      scrollHeight: 2000,
      clientHeight: 768
    });
  });

  it("should accumulate dwell time across multiple scroll segments", () => {
    triggerScroll(container, 100);
    jest.advanceTimersByTime(300);

    triggerScroll(container, 200);
    jest.advanceTimersByTime(300);

    expect(tc.report).toHaveBeenCalledTimes(2);

    const first = (tc.report as jest.Mock).mock.calls[0][1];
    const second = (tc.report as jest.Mock).mock.calls[1][1];

    expect(first.scrollSegments).toBe(1);
    expect(second.scrollSegments).toBe(2);
    expect(second.totalDwellTime).toBeGreaterThan(first.totalDwellTime);
  });

  it("should track max scroll depth across segments", () => {
    triggerScroll(container, 50);
    jest.advanceTimersByTime(300);

    triggerScroll(container, 500);
    jest.advanceTimersByTime(300);

    const second = (tc.report as jest.Mock).mock.calls[1][1];
    expect(second.maxScrollDepth).toBe(500);
  });

  it("should not report on scroll to same position with no movement", () => {
    triggerScroll(container, 0);
    jest.advanceTimersByTime(300);
    expect(tc.report).toHaveBeenCalledTimes(1);
  });

  it("should flush remaining data on destroy with active scroll", async () => {
    triggerScroll(container, 150);
    jest.advanceTimersByTime(100);

    expect(tc.report).not.toHaveBeenCalled();

    await tc.destroy();

    expect(tc.report).toHaveBeenCalledTimes(1);
  });

  it("should remove scroll event listener on destroy", async () => {
    await tc.destroy();
    expect(document.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it("should not duplicate listener on multiple init calls", () => {
    tc.init();
    expect(document.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("should stop reporting after destroy", async () => {
    await tc.destroy();

    triggerScroll(container, 100);
    jest.advanceTimersByTime(300);

    expect(tc.report).not.toHaveBeenCalled();
  });

  it("should use custom genRecord option", () => {
    const customContainer = createScrollableContainer();
    const customGenRecord = jest.fn(_data => ({ custom: "value" }));

    const customTc = new TracingCore({
      plugins: [
        BrowserScrollPlugin({
          document: customContainer,
          genRecord: customGenRecord,
          debounceMs: 300
        })
      ]
    });

    jest.spyOn(customTc, "report");
    customTc.init();

    triggerScroll(customContainer, 100);
    jest.advanceTimersByTime(300);

    expect(customGenRecord).toHaveBeenCalled();
    expect(customTc.report).toHaveBeenCalledWith(BrowserScrollEvent, { custom: "value" });

    customTc.destroy();
  });

  it("should work with trackScrollDepth disabled", () => {
    const noDepthContainer = createScrollableContainer();
    const noDepthTc = new TracingCore({
      plugins: [
        BrowserScrollPlugin({
          document: noDepthContainer,
          debounceMs: 300,
          trackScrollDepth: false
        })
      ]
    });

    jest.spyOn(noDepthTc, "report");
    noDepthTc.init();

    triggerScroll(noDepthContainer, 500);
    jest.advanceTimersByTime(300);

    expect(noDepthTc.report).toHaveBeenCalled();
  });

  it("should debounce multiple rapid scrolls into a single segment", () => {
    triggerScroll(container, 50);
    jest.advanceTimersByTime(100);
    triggerScroll(container, 100);
    jest.advanceTimersByTime(100);
    triggerScroll(container, 200);
    jest.advanceTimersByTime(100);

    expect(tc.report).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(tc.report).toHaveBeenCalledTimes(1);
    expect((tc.report as jest.Mock).mock.calls[0][1].scrollSegments).toBe(1);
    expect((tc.report as jest.Mock).mock.calls[0][1].maxScrollDepth).toBe(200);
  });

  it("should track nested scrollable elements independently", () => {
    const outer = createScrollableContainer(3000);
    const inner = document.createElement("div");
    Object.defineProperties(inner, {
      scrollHeight: { value: 1500, configurable: true, writable: true },
      clientHeight: { value: 400, configurable: true, writable: true }
    });
    inner.scrollTop = 0;
    outer.appendChild(inner);
    document.body.appendChild(outer);

    const nestedTc = new TracingCore({
      plugins: [
        BrowserScrollPlugin({
          document: outer,
          debounceMs: 300
        })
      ]
    });

    jest.spyOn(nestedTc, "report");
    nestedTc.init();

    triggerScroll(outer, 200);
    triggerScroll(inner, 100);
    jest.advanceTimersByTime(300);

    expect(nestedTc.report).toHaveBeenCalledTimes(1);
    const record = (nestedTc.report as jest.Mock).mock.calls[0][1];

    expect(record.elements).toHaveLength(2);

    const outerInfo = record.elements.find((e: any) => e.elementTagName === "div" && e.scrollHeight === 3000);
    const innerInfo = record.elements.find((e: any) => e.elementTagName === "div" && e.scrollHeight === 1500);

    expect(outerInfo).toBeDefined();
    expect(innerInfo).toBeDefined();
    expect(outerInfo.maxScrollDepth).toBe(200);
    expect(innerInfo.maxScrollDepth).toBe(100);

    nestedTc.destroy();
  });

  it("should compute depth percentage based on actual element dimensions", () => {
    Object.defineProperties(container, {
      scrollHeight: { value: 2000, configurable: true, writable: true },
      clientHeight: { value: 500, configurable: true, writable: true }
    });

    triggerScroll(container, 750);
    jest.advanceTimersByTime(300);

    const record = (tc.report as jest.Mock).mock.calls[0][1];
    const elInfo = record.elements[0];

    const expectedPercent = Math.round((750 / (2000 - 500)) * 100);
    expect(elInfo.maxScrollDepthPercent).toBe(expectedPercent);
    expect(elInfo.scrollHeight).toBe(2000);
    expect(elInfo.clientHeight).toBe(500);
  });

  it("should report element path for scrolled elements", () => {
    triggerScroll(container, 100);
    jest.advanceTimersByTime(300);

    const record = (tc.report as jest.Mock).mock.calls[0][1];
    const elInfo = record.elements[0];

    expect(elInfo.elementTagName).toBe("div");
    expect(elInfo.elementSelector).toBeTruthy();
    expect(elInfo.elementPath).toBeTruthy();
  });

  it("should browser-scroll output modules", () => {
    expect(modules).toMatchSnapshot();
  });
});

describe("browser-scroll -> defaultGenRecord", () => {
  it("should return correct scroll data fields", () => {
    const data = {
      totalDwellTime: 1234,
      scrollSegments: 3,
      maxScrollDepth: 800,
      maxScrollDepthPercent: 60,
      pageHeight: 2000,
      viewportHeight: 768,
      elements: []
    };

    expect(defaultGenRecord(data)).toEqual({
      totalDwellTime: 1234,
      scrollSegments: 3,
      maxScrollDepth: 800,
      maxScrollDepthPercent: 60,
      pageHeight: 2000,
      viewportHeight: 768,
      elements: []
    });
  });

  it("should handle zero values", () => {
    const data = {
      totalDwellTime: 0,
      scrollSegments: 0,
      maxScrollDepth: 0,
      maxScrollDepthPercent: 0,
      pageHeight: 500,
      viewportHeight: 500,
      elements: []
    };

    expect(defaultGenRecord(data)).toEqual({
      totalDwellTime: 0,
      scrollSegments: 0,
      maxScrollDepth: 0,
      maxScrollDepthPercent: 0,
      pageHeight: 500,
      viewportHeight: 500,
      elements: []
    });
  });
});
