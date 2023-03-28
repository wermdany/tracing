import { TracingCore } from "@tracing/core";
import { noop } from "@tracing/shared";
import { createXhrSenderFactory, XhrSenderPlugin } from "../xhr";
import { SenderError } from "../base";
import { BatchSendMiddleware } from "../middleware";

import { mockServer } from "../../../../test-utils/mockMsw";

jest.setTimeout(20000);

beforeAll(() => {
  mockServer.listen();
});

afterAll(() => {
  mockServer.close();
});

describe("test createXhrSenderFactory", () => {
  it("should not set url throw error", () => {
    expect(() => createXhrSenderFactory()).toThrow();
  });

  it.skip("should success build immutable", done => {
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

  it.skip("should Validator error build immutable", done => {
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

  it.skip("should TimeOut error build immutable", () => {
    const server = createXhrSenderFactory({
      url: "/test/timeout",
      timeout: 100
    });

    const fn = jest.fn();
    const build = { a: 1 };
    server("test", build, fn, noop);

    expect(fn).toBeCalledWith();
  });
});

describe("test XhrSenderPlugin", () => {
  it.skip("should send success", () => {
    const success = jest.fn();
    const tc = new TracingCore({
      plugins: [
        XhrSenderPlugin({
          url: "/test/success",
          middleware: [],
          success
        })
      ],
      isLogger: false
    });

    tc.init();

    tc.report("test", { a: 1 });

    setTimeout(() => {
      expect(success).toBeCalledWith(["test", { a: 1 }]);
    }, 100);
  });

  it.skip("should send success useMiddleware", () => {
    const success = jest.fn();
    const tc = new TracingCore({
      plugins: [
        XhrSenderPlugin({
          url: "/test/success",
          middleware: [BatchSendMiddleware],
          success
        })
      ],
      isLogger: false
    });

    tc.init();

    tc.report("test", { a: 1 });

    setTimeout(() => {
      expect(success).not.toBeCalled();
    }, 100);

    tc.destroy();

    setTimeout(() => {
      expect(success).toBeCalledWith("");
    }, 100);
  });
});
