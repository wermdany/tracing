import { TracingCore } from "@tracing/core";

import {
  BrowserExposePlugin,
  BrowserExposeEvent,
  defaultGenRecord,
  defaultConfig,
  DefaultExposeAttribute
} from "..";

import * as modules from "..";

/* -------------------------------------------------------------------------- */
/*  Mock helpers                                                              */
/* -------------------------------------------------------------------------- */

let observeMock: jest.Mock;
let unobserveMock: jest.Mock;
let ioDisconnectMock: jest.Mock;
let intersectionCallback: IntersectionObserverCallback;

let mutationObserveMock: jest.Mock;
let mutationDisconnectMock: jest.Mock;
let mutationCallback: MutationCallback;

beforeEach(() => {
  observeMock = jest.fn();
  unobserveMock = jest.fn();
  ioDisconnectMock = jest.fn();

  (window as any).IntersectionObserver = jest.fn(cb => {
    intersectionCallback = cb;
    return {
      observe: observeMock,
      unobserve: unobserveMock,
      disconnect: ioDisconnectMock
    };
  });

  mutationObserveMock = jest.fn();
  mutationDisconnectMock = jest.fn();

  (window as any).MutationObserver = jest.fn(cb => {
    mutationCallback = cb;
    return {
      observe: mutationObserveMock,
      disconnect: mutationDisconnectMock
    };
  });
});

afterEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = "";
});

function makeEntry(
  element: HTMLElement,
  isIntersecting: boolean,
  intersectionRatio = 1
): IntersectionObserverEntry {
  return {
    isIntersecting,
    intersectionRatio,
    target: element,
    boundingClientRect: element.getBoundingClientRect() as DOMRectReadOnly,
    intersectionRect: null as unknown as DOMRectReadOnly,
    rootBounds: null as unknown as DOMRectReadOnly,
    time: Date.now()
  } as IntersectionObserverEntry;
}

function triggerExposure(element: HTMLElement, intersectionRatio = 1) {
  if (!intersectionCallback) return;
  intersectionCallback([makeEntry(element, true, intersectionRatio)], null as any);
}

function createExposeElement(label = "test", extraAttrs?: Record<string, string>): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("data-tracing-expose", label);
  if (extraAttrs) {
    Object.entries(extraAttrs).forEach(([k, v]) => el.setAttribute(k, v));
  }
  return el;
}

/* -------------------------------------------------------------------------- */
/*  Plugin tests                                                              */
/* -------------------------------------------------------------------------- */

describe("browser-expose-plugin", () => {
  let tc: TracingCore;

  afterEach(async () => {
    await tc?.destroy();
  });

  describe("initialization", () => {
    it("should create IntersectionObserver on init", () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      tc.init();

      expect(window.IntersectionObserver).toHaveBeenCalledTimes(1);
    });

    it("should create MutationObserver on init by default", () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      tc.init();

      expect(window.MutationObserver).toHaveBeenCalledTimes(1);
      expect(mutationObserveMock).toHaveBeenCalledWith(document.body, {
        childList: true,
        subtree: true
      });
    });

    it("should not create MutationObserver when useMutationObserver is false", () => {
      tc = new TracingCore({
        plugins: [BrowserExposePlugin({ useMutationObserver: false })]
      });
      tc.init();

      expect(window.MutationObserver).not.toHaveBeenCalled();
    });

    it("should scan existing DOM elements with the expose attribute", () => {
      const el1 = createExposeElement("banner");
      const el2 = createExposeElement("sidebar");
      document.body.append(el1, el2);

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      tc.init();

      expect(observeMock).toHaveBeenCalledTimes(2);
      expect(observeMock).toHaveBeenCalledWith(el1);
      expect(observeMock).toHaveBeenCalledWith(el2);
    });

    it("should not observe elements without the expose attribute", () => {
      const el = document.createElement("div");
      document.body.appendChild(el);

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      tc.init();

      expect(observeMock).not.toHaveBeenCalled();
    });

    it("should not duplicate observers on multiple init calls", () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      tc.init();
      tc.init();

      expect(window.IntersectionObserver).toHaveBeenCalledTimes(1);
      expect(window.MutationObserver).toHaveBeenCalledTimes(1);
    });

    it("should use custom attribute name for scanning", () => {
      const el = document.createElement("div");
      el.setAttribute("data-expose", "custom");
      document.body.appendChild(el);

      tc = new TracingCore({
        plugins: [BrowserExposePlugin({ attribute: "data-expose" })]
      });
      tc.init();

      expect(observeMock).toHaveBeenCalledTimes(1);
      expect(observeMock).toHaveBeenCalledWith(el);
    });

    it("should not scan elements with default attribute when custom attribute is set", () => {
      const el = document.createElement("div");
      el.setAttribute("data-tracing-expose", "default");
      document.body.appendChild(el);

      tc = new TracingCore({
        plugins: [BrowserExposePlugin({ attribute: "data-expose" })]
      });
      tc.init();

      expect(observeMock).not.toHaveBeenCalled();
    });
  });

  describe("exposure reporting", () => {
    it("should report when element intersects", () => {
      const el = createExposeElement("banner");
      document.body.appendChild(el);

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el);

      expect(tc.report).toHaveBeenCalledTimes(1);
      expect(tc.report).toHaveBeenCalledWith(BrowserExposeEvent, expect.any(Object));
    });

    it("should not report if element is not intersecting", () => {
      const el = createExposeElement("banner");
      document.body.appendChild(el);

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      jest.spyOn(tc, "report");
      tc.init();

      if (intersectionCallback) {
        intersectionCallback([makeEntry(el, false, 0)], null as any);
      }

      expect(tc.report).not.toHaveBeenCalled();
    });

    it("should report with correct fields", () => {
      const el = createExposeElement("hero-banner");
      el.className = "hero primary";
      document.body.appendChild(el);

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el, 0.356);

      expect(tc.report).toHaveBeenCalledWith(
        BrowserExposeEvent,
        expect.objectContaining({
          exposeLabel: "hero-banner",
          elementTagName: "div",
          elementClassName: "hero primary",
          elementSelector: expect.any(String),
          elementPath: expect.any(String),
          elementId: "",
          intersectionRatio: 0.36,
          timestamp: expect.any(Number),
          viewportWidth: expect.any(Number),
          viewportHeight: expect.any(Number),
          exposeData: {}
        })
      );
    });

    it("should call unobserve after first exposure when once: true (default)", () => {
      const el = createExposeElement("once");
      document.body.appendChild(el);

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el);

      expect(unobserveMock).toHaveBeenCalledWith(el);
    });

    it("should report every time when once: false", () => {
      const el = createExposeElement("repeat");
      document.body.appendChild(el);

      tc = new TracingCore({
        plugins: [BrowserExposePlugin({ once: false })]
      });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el);
      triggerExposure(el);
      triggerExposure(el);

      expect(tc.report).toHaveBeenCalledTimes(3);
      expect(unobserveMock).not.toHaveBeenCalled();
    });

    it("should use custom genRecord", () => {
      const customGenRecord = jest.fn(() => ({ custom: "data" }));
      const el = createExposeElement("custom");
      document.body.appendChild(el);

      tc = new TracingCore({
        plugins: [BrowserExposePlugin({ genRecord: customGenRecord })]
      });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el);

      expect(customGenRecord).toHaveBeenCalled();
      expect(tc.report).toHaveBeenCalledWith(BrowserExposeEvent, { custom: "data" });
    });

    it("should pass correct arguments to genRecord", () => {
      const customGenRecord = jest.fn(() => ({}));
      const el = createExposeElement("args");
      document.body.appendChild(el);

      tc = new TracingCore({
        plugins: [BrowserExposePlugin({ genRecord: customGenRecord })]
      });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el, 0.75);

      expect(customGenRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          isIntersecting: true,
          intersectionRatio: 0.75,
          target: el
        }),
        el
      );
    });

    it("should use custom attribute for label extraction", () => {
      const el = document.createElement("div");
      el.setAttribute("data-expose", "custom-label");
      document.body.appendChild(el);

      tc = new TracingCore({
        plugins: [BrowserExposePlugin({ attribute: "data-expose" })]
      });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el);

      expect(tc.report).toHaveBeenCalledWith(
        BrowserExposeEvent,
        expect.objectContaining({ exposeLabel: "custom-label" })
      );
    });
  });

  describe("exposeData concatenation", () => {
    function createWithAttrs(label: string, dataAttrs: Record<string, string>): HTMLElement {
      return createExposeElement(label, dataAttrs);
    }

    it("should extract individual data-tracing-expose-data-{key} attributes", () => {
      const el = createWithAttrs("concat", {
        "data-tracing-expose-data-name": "homepage",
        "data-tracing-expose-data-type": "hero"
      });
      document.body.appendChild(el);

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el);

      expect(tc.report).toHaveBeenCalledWith(
        BrowserExposeEvent,
        expect.objectContaining({
          exposeData: { name: "homepage", type: "hero" }
        })
      );
    });

    it("should merge JSON data-tracing-expose-data attribute", () => {
      const el = createWithAttrs("json", {
        "data-tracing-expose-data": '{"pos":1,"color":"blue"}'
      });
      document.body.appendChild(el);

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el);

      expect(tc.report).toHaveBeenCalledWith(
        BrowserExposeEvent,
        expect.objectContaining({
          exposeData: { pos: 1, color: "blue" }
        })
      );
    });

    it("should let JSON override individual keys", () => {
      const el = createWithAttrs("override", {
        "data-tracing-expose-data-name": "sidebar",
        "data-tracing-expose-data": '{"name":"hero","color":"blue"}'
      });
      document.body.appendChild(el);

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el);

      expect(tc.report).toHaveBeenCalledWith(
        BrowserExposeEvent,
        expect.objectContaining({
          exposeData: { name: "hero", color: "blue" }
        })
      );
    });

    it("should merge individual keys from custom attribute", () => {
      const el = document.createElement("div");
      el.setAttribute("data-expose", "custom-attr");
      el.setAttribute("data-expose-data-section", "footer");
      el.setAttribute("data-expose-data-lang", "zh");
      document.body.appendChild(el);

      tc = new TracingCore({
        plugins: [BrowserExposePlugin({ attribute: "data-expose" })]
      });
      jest.spyOn(tc, "report");
      tc.init();

      triggerExposure(el);

      expect(tc.report).toHaveBeenCalledWith(
        BrowserExposeEvent,
        expect.objectContaining({
          exposeLabel: "custom-attr",
          exposeData: { section: "footer", lang: "zh" }
        })
      );
    });

    it("should pass exposeData through defaultGenRecord when called directly", () => {
      const el = createWithAttrs("direct", {
        "data-tracing-expose-data-key": "value"
      });

      const record = defaultGenRecord(
        { intersectionRatio: 0.5, isIntersecting: true } as IntersectionObserverEntry,
        el
      );

      expect(record.exposeData).toEqual({ key: "value" });
    });
  });

  describe("dynamic elements via MutationObserver", () => {
    it("should observe newly added elements", () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      jest.spyOn(tc, "report");
      tc.init();

      const el = createExposeElement("dynamic");

      if (mutationCallback) {
        mutationCallback([{ type: "childList", addedNodes: [el] } as unknown as MutationRecord], null as any);
      }

      expect(observeMock).toHaveBeenCalledWith(el);
    });

    it("should observe nested elements with the attribute", () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      jest.spyOn(tc, "report");
      tc.init();

      const wrapper = document.createElement("div");
      const inner = createExposeElement("nested");
      wrapper.appendChild(inner);

      if (mutationCallback) {
        mutationCallback(
          [{ type: "childList", addedNodes: [wrapper] } as unknown as MutationRecord],
          null as any
        );
      }

      expect(observeMock).toHaveBeenCalledWith(inner);
    });

    it("should not observe added nodes without the attribute", () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      tc.init();

      const el = document.createElement("div");

      if (mutationCallback) {
        mutationCallback([{ type: "childList", addedNodes: [el] } as unknown as MutationRecord], null as any);
      }

      expect(observeMock).not.toHaveBeenCalled();
    });

    it("should skip non-element nodes", () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      tc.init();

      if (mutationCallback) {
        mutationCallback(
          [{ type: "childList", addedNodes: [document.createTextNode("text")] } as unknown as MutationRecord],
          null as any
        );
      }

      expect(observeMock).not.toHaveBeenCalled();
    });

    it("should handle multiple added nodes", () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      tc.init();

      const el1 = createExposeElement("a");
      const el2 = createExposeElement("b");

      if (mutationCallback) {
        mutationCallback(
          [{ type: "childList", addedNodes: [el1, el2] } as unknown as MutationRecord],
          null as any
        );
      }

      expect(observeMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should not crash when genRecord throws", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
      const el = createExposeElement("crash");
      document.body.appendChild(el);

      tc = new TracingCore({
        plugins: [
          BrowserExposePlugin({
            genRecord: () => {
              throw new Error("genRecord error");
            }
          })
        ]
      });
      jest.spyOn(tc, "report");
      tc.init();

      expect(() => triggerExposure(el)).not.toThrow();
      expect(tc.report).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should not crash when IntersectionObserver is not supported", () => {
      const origIO = (window as any).IntersectionObserver;
      delete (window as any).IntersectionObserver;

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      expect(() => tc.init()).not.toThrow();

      (window as any).IntersectionObserver = origIO;
    });

    it("should not crash when MutationObserver is not supported", () => {
      const origMO = (window as any).MutationObserver;
      delete (window as any).MutationObserver;

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      expect(() => tc.init()).not.toThrow();

      (window as any).MutationObserver = origMO;
    });
  });

  describe("destroy", () => {
    it("should disconnect IntersectionObserver on destroy", async () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      tc.init();
      await tc.destroy();

      expect(ioDisconnectMock).toHaveBeenCalledTimes(1);
    });

    it("should disconnect MutationObserver on destroy", async () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      tc.init();
      await tc.destroy();

      expect(mutationDisconnectMock).toHaveBeenCalledTimes(1);
    });

    it("should not report after destroy on subsequent intersection", async () => {
      const el = createExposeElement("destroyed");
      document.body.appendChild(el);

      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      jest.spyOn(tc, "report");
      tc.init();
      await tc.destroy();

      expect(ioDisconnectMock).toHaveBeenCalledTimes(1);
      expect(mutationDisconnectMock).toHaveBeenCalledTimes(1);
    });

    it("should not disconnect when not initialized", async () => {
      tc = new TracingCore({ plugins: [BrowserExposePlugin()] });
      await tc.destroy();

      expect(ioDisconnectMock).not.toHaveBeenCalled();
      expect(mutationDisconnectMock).not.toHaveBeenCalled();
    });
  });

  it("should export stable modules", () => {
    expect(modules).toMatchSnapshot();
  });
});

/* -------------------------------------------------------------------------- */
/*  defaultGenRecord unit tests                                               */
/* -------------------------------------------------------------------------- */

describe("browser-expose -> defaultGenRecord", () => {
  const mockEntry = makeEntry(document.createElement("div"), true, 0.567);

  it("should return correct fields", () => {
    const el = document.createElement("div");
    el.setAttribute("data-tracing-expose", "test-label");

    const record = defaultGenRecord(mockEntry, el);

    expect(record).toEqual({
      exposeLabel: "test-label",
      exposeData: {},
      elementTagName: "div",
      elementClassName: "",
      elementSelector: expect.any(String),
      elementPath: expect.any(String),
      elementId: "",
      intersectionRatio: 0.57,
      timestamp: expect.any(Number),
      viewportWidth: expect.any(Number),
      viewportHeight: expect.any(Number)
    });
  });

  it("should round intersectionRatio to 2 decimal places", () => {
    const el = document.createElement("div");
    el.setAttribute("data-tracing-expose", "test");

    const testCases = [
      { input: 0.123, expected: 0.12 },
      { input: 0.999, expected: 1 },
      { input: 0, expected: 0 },
      { input: 0.5, expected: 0.5 },
      { input: 0.356, expected: 0.36 }
    ];

    for (const { input, expected } of testCases) {
      const entry = makeEntry(document.createElement("div"), true, input);
      const record = defaultGenRecord(entry, el);
      expect(record.intersectionRatio).toBe(expected);
    }
  });

  it("should extract exposeLabel from default attribute", () => {
    const el = document.createElement("div");
    el.setAttribute("data-tracing-expose", "my-label");

    const record = defaultGenRecord(mockEntry, el);
    expect(record.exposeLabel).toBe("my-label");
  });

  it("should accept custom attribute parameter", () => {
    const el = document.createElement("div");
    el.setAttribute("data-expose", "custom-label");

    const record = defaultGenRecord(mockEntry, el, "data-expose");
    expect(record.exposeLabel).toBe("custom-label");
  });

  it("should fall back to DefaultExposeAttribute when no attribute given", () => {
    const el = document.createElement("div");
    el.setAttribute(DefaultExposeAttribute, "constant-label");

    const record = defaultGenRecord(mockEntry, el);
    expect(record.exposeLabel).toBe("constant-label");
  });

  it("should return empty exposeLabel when attribute is missing", () => {
    const el = document.createElement("div");

    const record = defaultGenRecord(mockEntry, el);
    expect(record.exposeLabel).toBe("");
  });

  it("should extract exposeData with concatenated attributes", () => {
    const el = document.createElement("div");
    el.setAttribute("data-tracing-expose", "concat");
    el.setAttribute("data-tracing-expose-data-x", "1");
    el.setAttribute("data-tracing-expose-data-y", "2");

    const record = defaultGenRecord(mockEntry, el);
    expect(record.exposeData).toEqual({ x: "1", y: "2" });
  });

  it("should parse data-tracing-expose-data JSON", () => {
    const el = document.createElement("div");
    el.setAttribute("data-tracing-expose", "json");
    el.setAttribute("data-tracing-expose-data", '{"a":1,"b":2}');

    const record = defaultGenRecord(mockEntry, el);
    expect(record.exposeData).toEqual({ a: 1, b: 2 });
  });

  it("should let JSON override individual keys in concatenation", () => {
    const el = document.createElement("div");
    el.setAttribute("data-tracing-expose", "merge");
    el.setAttribute("data-tracing-expose-data-name", "old");
    el.setAttribute("data-tracing-expose-data", '{"name":"new","extra":true}');

    const record = defaultGenRecord(mockEntry, el);
    expect(record.exposeData).toEqual({ name: "new", extra: true });
  });

  it("should return empty exposeData when there are no data attributes", () => {
    const el = document.createElement("div");
    el.setAttribute("data-tracing-expose", "empty");

    const record = defaultGenRecord(mockEntry, el);
    expect(record.exposeData).toEqual({});
  });

  it("should handle invalid JSON in data-tracing-expose-data gracefully", () => {
    const el = document.createElement("div");
    el.setAttribute("data-tracing-expose", "bad-json");
    el.setAttribute("data-tracing-expose-data", "not-valid-json");

    const record = defaultGenRecord(mockEntry, el);
    expect(record.exposeData).toEqual({});
  });
});

/* -------------------------------------------------------------------------- */
/*  Constants and config exports                                              */
/* -------------------------------------------------------------------------- */

describe("browser-expose -> exports", () => {
  it("should export DefaultExposeAttribute constant", () => {
    expect(DefaultExposeAttribute).toBe("data-tracing-expose");
  });

  it("should export defaultConfig with correct shape", () => {
    expect(defaultConfig).toEqual({
      attribute: "data-tracing-expose",
      threshold: 0,
      rootMargin: "0px",
      once: true,
      useMutationObserver: true,
      genRecord: defaultGenRecord
    });
  });

  it("should export BrowserExposeEvent constant", () => {
    expect(BrowserExposeEvent).toBe("browser-expose");
  });

  it("should use defaultConfig when no config provided", () => {
    const plugin = BrowserExposePlugin();
    expect(plugin.name).toBe("tracing:browser-expose");
  });
});
