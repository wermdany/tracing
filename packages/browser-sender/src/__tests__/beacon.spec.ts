import { noop } from "@tracing/shared";
import { createBeaconSenderFactory } from "../beacon";
import { SenderError } from "../base";

jest.setTimeout(20000);

beforeEach(() => {
  Object.defineProperty(navigator, "sendBeacon", {
    value: jest.fn().mockReturnValue(true),
    writable: true,
    configurable: true
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("test createBeaconSenderFactory", () => {
  it("should not set url throw error", () => {
    jest.restoreAllMocks();
    expect(() => createBeaconSenderFactory()).toThrow();
  });

  it("should success build immutable", done => {
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

  it("should BeaconQueue error build immutable", done => {
    (navigator.sendBeacon as jest.Mock).mockReturnValue(false);

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
        expect(code).toBe(SenderError.BeaconQueue);

        done();
      },
      noop
    );
  });

  it("should BeaconQueue error on send failure", done => {
    (navigator.sendBeacon as jest.Mock).mockReturnValue(false);

    const server = createBeaconSenderFactory({
      url: "/test/beacon"
    });

    const fn = jest.fn();
    const build = { a: 1 };
    server("test", build, fn, noop);

    setTimeout(() => {
      expect(fn).toHaveBeenCalled();
      done();
    }, 20);
  });
});
