import { TracingCore } from "@tracing/core";
import { noop } from "@tracing/shared";
import { createXhrSenderFactory, XhrSenderPlugin } from "../xhr";
import { SenderError } from "../base";
import { BatchSendMiddleware } from "../middleware";
import { BuildPlugin } from "../../../browser-tracing/src/plugins/BuildPlugin";

jest.setTimeout(20000);

let mockXHR: Record<string, any>;

beforeEach(() => {
  mockXHR = {
    open: jest.fn(),
    send: jest.fn(() => {
      if (mockXHR._simulateTimeout) {
        mockXHR.ontimeout?.();
      } else {
        mockXHR.onloadend?.();
      }
    }),
    setRequestHeader: jest.fn(),
    abort: jest.fn(),
    timeout: 2000,
    withCredentials: false,
    responseType: "",
    status: 200,
    onloadend: null,
    onerror: null,
    ontimeout: null,
    readyState: 4,
    _simulateTimeout: false
  };
  jest.spyOn(globalThis, "XMLHttpRequest").mockImplementation(() => mockXHR as unknown as XMLHttpRequest);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("test createXhrSenderFactory", () => {
  it("should not set url throw error", () => {
    jest.restoreAllMocks();
    expect(() => createXhrSenderFactory()).toThrow();
  });

  it("should success build immutable", done => {
    mockXHR.status = 200;
    const server = createXhrSenderFactory({
      url: "/test/success"
    });

    const build = { a: 1 };
    server("test", build, noop, (event, inBuild) => {
      expect(event).toBe("test");
      expect(inBuild).toBe(build);

      done();
    });
  });

  it("should Validator error build immutable", done => {
    mockXHR.status = 400;
    const server = createXhrSenderFactory({
      url: "/test/error"
    });

    const build = { a: 1 };
    server(
      "test",
      build,
      (event, inBuild, code) => {
        expect(event).toBe("test");
        expect(inBuild).toBe(build);
        expect(code).toBe(SenderError.Validator);

        done();
      },
      noop
    );
  });

  it("should TimeOut error build immutable", done => {
    mockXHR._simulateTimeout = true;
    mockXHR.timeout = 100;
    const server = createXhrSenderFactory({
      url: "/test/timeout",
      timeout: 100
    });

    const fn = jest.fn();
    const build = { a: 1 };
    server("test", build, fn, noop);

    setTimeout(() => {
      expect(fn).toHaveBeenCalled();
      done();
    }, 50);
  });
});

describe("test XhrSenderPlugin", () => {
  it("should send success", done => {
    mockXHR.status = 200;
    const success = jest.fn();
    const tc = new TracingCore({
      sendLog: false,
      plugins: [
        BuildPlugin(),
        XhrSenderPlugin({
          url: "/test/success",
          middleware: [],
          success
        })
      ]
    });

    tc.init();

    tc.report("test", { a: 1 });

    setTimeout(() => {
      expect(success).toHaveBeenCalled();
      done();
    }, 50);
  });

  it("should send success useMiddleware", done => {
    mockXHR.status = 200;
    const success = jest.fn();
    const tc = new TracingCore({
      plugins: [
        BuildPlugin(),
        XhrSenderPlugin({
          url: "/test/success",
          middleware: [BatchSendMiddleware],
          success
        })
      ]
    });

    tc.init();

    tc.report("test", { a: 1 });

    expect(success).not.toBeCalled();
    expect(mockXHR.send).not.toBeCalled();

    tc.destroy().then(() => {
      expect(mockXHR.send).toHaveBeenCalled();
      done();
    });
  });
});
