// import { TracingCore } from "@tracing/core";
import { noop } from "@tracing/shared";
import { createBeaconSenderFactory } from "../beacon";
import { SenderError } from "../base";

import { mockServer } from "../../../../test-utils/mockMsw";

jest.setTimeout(20000);

beforeAll(() => {
  mockServer.listen();
});

afterAll(() => {
  mockServer.close();
});

describe("test createBeaconSenderFactory", () => {
  it("should not set url throw error", () => {
    expect(() => createBeaconSenderFactory()).toThrow();
  });

  it.skip("should success build immutable", done => {
    const server = createBeaconSenderFactory({
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
    const server = createBeaconSenderFactory({
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
    const server = createBeaconSenderFactory({
      url: "/test/timeout"
    });

    const fn = jest.fn();
    const build = { a: 1 };
    server("test", build, fn, noop);

    expect(fn).toBeCalledWith();
  });
});
