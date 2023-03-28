// import { TracingCore } from "@tracing/core";
import { noop } from "@tracing/shared";
import { createFetchSenderFactory } from "../fetch";
import { SenderError } from "../base";

import { mockServer } from "../../../../test-utils/mockMsw";

jest.setTimeout(20000);

beforeAll(() => {
  mockServer.listen();
});

afterAll(() => {
  mockServer.close();
});

describe("test createFetchSenderFactory", () => {
  it("should not set url throw error", () => {
    expect(() => createFetchSenderFactory()).toThrow();
  });

  it.skip("should success build immutable", done => {
    const server = createFetchSenderFactory({
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
    const server = createFetchSenderFactory({
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
    const server = createFetchSenderFactory({
      url: "/test/timeout",
      timeout: 100
    });

    const fn = jest.fn();
    const build = { a: 1 };
    server("test", build, fn, noop);

    expect(fn).toBeCalledWith();
  });
});
