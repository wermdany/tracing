import { TracingCore } from "@tracing/core";

import { BrowserErrorPlugin, BrowserErrorEvent, parseStack, parseCauseChain } from "..";

import * as modules from "..";

function createPEvent(type: string, reason: unknown): Event {
  const event = new Event(type);
  Object.defineProperty(event, "reason", { value: reason, configurable: true });
  Object.defineProperty(event, "promise", {
    value: Promise.resolve(),
    configurable: true
  });
  return event;
}

function createResourceEvent(tagName: string, src: string): Event {
  const event = new Event("error", { bubbles: true, cancelable: true });
  const el = document.createElement(tagName);
  if (tagName !== "link") {
    (el as HTMLImageElement).src = src;
  } else {
    (el as HTMLLinkElement).href = src;
  }
  Object.defineProperty(event, "target", {
    value: el,
    configurable: true
  });
  return event;
}

function createSyntheticErrorEvent(
  error: Error,
  message: string,
  filename = "http://example.com/app.js",
  lineno = 10,
  colno = 5
): Event {
  const event = new ErrorEvent("error", {
    message,
    filename,
    lineno,
    colno
  });
  Object.defineProperty(event, "error", {
    value: error,
    configurable: true,
    writable: true
  });
  return event;
}

describe("browser-error-plugin", () => {
  let tc: TracingCore;

  afterEach(async () => {
    jest.clearAllMocks();
    await tc?.destroy();
  });

  describe("onerror", () => {
    beforeEach(() => {
      tc = new TracingCore({
        plugins: [BrowserErrorPlugin()]
      });
      jest.spyOn(tc, "report");
      tc.init();
    });

    it("should capture ErrorEvent and report", () => {
      window.dispatchEvent(
        new ErrorEvent("error", {
          message: "Uncaught TypeError: test type error",
          filename: "http://example.com/app.js",
          lineno: 10,
          colno: 5
        })
      );

      expect(tc.report).toBeCalledWith(
        BrowserErrorEvent,
        expect.objectContaining({
          source: "uncaught_error",
          message: "Uncaught TypeError: test type error"
        })
      );
    });

    it("should extract ErrorEvent message and event properties", () => {
      window.dispatchEvent(
        new ErrorEvent("error", {
          message: "Uncaught ReferenceError: x is not defined",
          filename: "http://example.com/app.js",
          lineno: 10,
          colno: 5
        })
      );

      expect(tc.report).toBeCalledWith(
        BrowserErrorEvent,
        expect.objectContaining({
          source: "uncaught_error",
          message: "Uncaught ReferenceError: x is not defined",
          frames: expect.any(Array),
          causes: expect.any(Array)
        })
      );
    });

    it("should filter Script error by default", () => {
      window.dispatchEvent(
        new ErrorEvent("error", {
          message: "Script error.",
          filename: "",
          lineno: 0,
          colno: 0,
          error: null
        } as any)
      );

      expect(tc.report).not.toBeCalled();
    });

    it("should respect ignoreErrors config", () => {
      const tc2 = new TracingCore({
        plugins: [
          BrowserErrorPlugin({
            ignoreErrors: ["ignore-me"]
          })
        ]
      });
      jest.spyOn(tc2, "report");
      tc2.init();

      const error = new Error("please ignore-me");
      window.dispatchEvent(createSyntheticErrorEvent(error, "Uncaught Error: please ignore-me"));

      expect(tc2.report).not.toBeCalled();
      tc2.destroy();
    });

    it("should respect allowUrls filter", () => {
      const tc2 = new TracingCore({
        plugins: [
          BrowserErrorPlugin({
            allowUrls: [/allowed\.com/]
          })
        ]
      });
      jest.spyOn(tc2, "report");
      tc2.init();

      const error = new Error("from blocked domain");
      error.stack = "Error: from blocked domain\n    at (http://evil.com/script.js:1:1)";
      window.dispatchEvent(
        createSyntheticErrorEvent(error, "Error: from blocked domain", "http://evil.com/script.js")
      );

      expect(tc2.report).not.toBeCalled();
      tc2.destroy();
    });
  });

  describe("unhandledrejection", () => {
    beforeEach(() => {
      tc = new TracingCore({
        plugins: [BrowserErrorPlugin()]
      });
      jest.spyOn(tc, "report");
      tc.init();
    });

    it("should capture rejection with Error reason", () => {
      const reason = new Error("promise error");
      window.dispatchEvent(createPEvent("unhandledrejection", reason));

      expect(tc.report).toBeCalledWith(
        BrowserErrorEvent,
        expect.objectContaining({
          source: "unhandled_rejection",
          type: "Error",
          message: "promise error",
          reasonType: "error",
          reasonValue: "promise error"
        })
      );
    });

    it("should capture rejection with string reason", () => {
      window.dispatchEvent(createPEvent("unhandledrejection", "oops"));

      expect(tc.report).toBeCalledWith(
        BrowserErrorEvent,
        expect.objectContaining({
          source: "unhandled_rejection",
          message: "oops",
          reasonType: "string",
          reasonValue: "oops"
        })
      );
    });

    it("should capture rejection with object reason", () => {
      window.dispatchEvent(createPEvent("unhandledrejection", { code: 500 }));

      expect(tc.report).toBeCalledWith(
        BrowserErrorEvent,
        expect.objectContaining({
          source: "unhandled_rejection",
          message: '{"code":500}',
          reasonType: "object",
          reasonValue: '{"code":500}'
        })
      );
    });

    it("should capture rejection with undefined reason", () => {
      window.dispatchEvent(createPEvent("unhandledrejection", undefined));

      expect(tc.report).toBeCalledWith(
        BrowserErrorEvent,
        expect.objectContaining({
          source: "unhandled_rejection",
          message: "Promise rejected with no reason",
          reasonType: "undefined"
        })
      );
    });

    it("should have synthetic stack for non-Error rejection", () => {
      window.dispatchEvent(createPEvent("unhandledrejection", "string rejection"));

      expect(tc.report).toBeCalledWith(
        BrowserErrorEvent,
        expect.objectContaining({
          source: "unhandled_rejection",
          stack: expect.stringContaining("Error")
        })
      );
    });
  });

  describe("resource error", () => {
    beforeEach(() => {
      tc = new TracingCore({
        plugins: [BrowserErrorPlugin()]
      });
      jest.spyOn(tc, "report");
      tc.init();
    });

    it("should capture resource loading error", () => {
      window.dispatchEvent(createResourceEvent("img", "http://example.com/404.png"));

      expect(tc.report).toBeCalledWith(
        BrowserErrorEvent,
        expect.objectContaining({
          source: "resource_error",
          type: "ResourceError",
          resource: expect.objectContaining({
            tagName: "img",
            src: "http://example.com/404.png"
          })
        })
      );
    });

    it("should ignore ErrorEvent (not duplicate onerror)", () => {
      const error = new Error("runtime");
      window.dispatchEvent(createSyntheticErrorEvent(error, "Uncaught Error: runtime"));

      const reports = (tc.report as jest.Mock).mock.calls.filter(([event]) => event === BrowserErrorEvent);
      const resourceReports = reports.filter(([, data]: [string, any]) => data.source === "resource_error");

      expect(resourceReports.length).toBe(0);
    });

    it("should filter by resourceWatchTags", () => {
      window.dispatchEvent(createResourceEvent("div", "http://example.com/test"));
      expect(tc.report).not.toBeCalled();
    });
  });

  describe("captureConsole", () => {
    beforeEach(() => {
      jest.spyOn(console, "error").mockImplementation(jest.fn());
    });

    it("should not capture console.error by default", () => {
      tc = new TracingCore({
        plugins: [BrowserErrorPlugin()]
      });
      jest.spyOn(tc, "report");
      tc.init();

      console.error("test error");
      expect(tc.report).not.toBeCalled();
    });

    it("should capture console.error when captureConsole is enabled", () => {
      tc = new TracingCore({
        plugins: [
          BrowserErrorPlugin({
            captureConsole: true
          })
        ]
      });
      jest.spyOn(tc, "report");
      tc.init();

      console.error("custom error");

      expect(tc.report).toBeCalledWith(
        BrowserErrorEvent,
        expect.objectContaining({
          source: "console_error",
          message: "custom error"
        })
      );
    });

    it("should restore console.error on destroy", async () => {
      const originalError = console.error;

      tc = new TracingCore({
        plugins: [
          BrowserErrorPlugin({
            captureConsole: true
          })
        ]
      });
      tc.init();

      expect(console.error).not.toBe(originalError);

      await tc.destroy();

      expect(console.error).toBe(originalError);
    });
  });

  describe("cause chain", () => {
    it("should parse error.cause chain", () => {
      const innerError = new Error("inner cause");
      const error = new Error("outer error", { cause: innerError });

      const causes = parseCauseChain(error, 5);
      expect(causes).toHaveLength(1);
      expect(causes[0]).toMatchObject({
        name: "Error",
        message: "inner cause"
      });
    });

    it("should respect linkedErrorsLimit", () => {
      let current = new Error("level 5");
      for (let i = 4; i >= 1; i--) {
        const e = new Error(`level ${i}`);
        e.cause = current;
        current = e;
      }
      const root = new Error("level 0");
      root.cause = current;

      const causes = parseCauseChain(root, 3);
      expect(causes).toHaveLength(3);
      expect(causes[0].message).toBe("level 1");
      expect(causes[1].message).toBe("level 2");
      expect(causes[2].message).toBe("level 3");
    });

    it("should return empty array when no cause", () => {
      const error = new Error("no cause");
      const causes = parseCauseChain(error, 5);
      expect(causes).toEqual([]);
    });
  });

  describe("destroy", () => {
    it("should remove all event listeners", async () => {
      const addSpy = jest.spyOn(window, "addEventListener");
      const removeSpy = jest.spyOn(window, "removeEventListener");

      tc = new TracingCore({
        plugins: [BrowserErrorPlugin()]
      });
      tc.init();

      expect(addSpy).toHaveBeenCalled();

      await tc.destroy();

      expect(removeSpy).toHaveBeenCalled();

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("should clean up even without init", async () => {
      tc = new TracingCore({
        plugins: [BrowserErrorPlugin()]
      });

      await expect(tc.destroy()).resolves.toBeUndefined();
    });
  });

  describe("config", () => {
    it("should not register onerror when disabled", () => {
      tc = new TracingCore({
        plugins: [
          BrowserErrorPlugin({
            onerror: false
          })
        ]
      });
      jest.spyOn(tc, "report");
      tc.init();

      const error = new TypeError("test");
      window.dispatchEvent(createSyntheticErrorEvent(error, "Uncaught TypeError: test"));

      expect(tc.report).not.toBeCalled();
    });

    it("should not register unhandledrejection when disabled", () => {
      tc = new TracingCore({
        plugins: [
          BrowserErrorPlugin({
            onunhandledrejection: false
          })
        ]
      });
      jest.spyOn(tc, "report");
      tc.init();

      window.dispatchEvent(createPEvent("unhandledrejection", "test"));

      expect(tc.report).not.toBeCalled();
    });

    it("should not register resourceError when disabled", () => {
      tc = new TracingCore({
        plugins: [
          BrowserErrorPlugin({
            resourceError: false
          })
        ]
      });
      jest.spyOn(tc, "report");
      tc.init();

      window.dispatchEvent(createResourceEvent("img", "http://example.com/404.png"));

      expect(tc.report).not.toBeCalled();
    });
  });

  it("should export stable modules", () => {
    expect(modules).toMatchSnapshot();
  });
});

describe("browser-error -> parseStack", () => {
  it("should parse Chrome/V8 format stack", () => {
    const stack = `Error: test
    at fn1 (http://example.com/app.js:10:5)
    at fn2 (http://example.com/app.js:20:15)`;

    const frames = parseStack(stack, 10);
    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({
      function: "fn1",
      filename: "http://example.com/app.js",
      lineno: 10,
      colno: 5
    });
    expect(frames[1]).toEqual({
      function: "fn2",
      filename: "http://example.com/app.js",
      lineno: 20,
      colno: 15
    });
  });

  it("should parse V8 format with anonymous functions", () => {
    const stack = `Error: test
    at http://example.com/app.js:10:5`;

    const frames = parseStack(stack, 10);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual({
      function: "anonymous",
      filename: "http://example.com/app.js",
      lineno: 10,
      colno: 5
    });
  });

  it("should parse Firefox format stack", () => {
    const stack = `fn1@http://example.com/app.js:10:5
fn2@http://example.com/app.js:20:15`;

    const frames = parseStack(stack, 10);
    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({
      function: "fn1",
      filename: "http://example.com/app.js",
      lineno: 10,
      colno: 5
    });
  });

  it("should truncate to limit", () => {
    const stack = `Error: test
    at a (x.js:1:1)
    at b (x.js:2:2)
    at c (x.js:3:3)
    at d (x.js:4:4)`;

    const frames = parseStack(stack, 2);
    expect(frames).toHaveLength(2);
  });

  it("should return empty array for empty stack", () => {
    expect(parseStack("", 10)).toEqual([]);
  });
});
