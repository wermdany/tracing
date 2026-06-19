import { noop } from "@tracing/shared";
import { createFetchSenderFactory } from "../fetch";
import { SenderError } from "../base";

jest.setTimeout(20000);

beforeEach(() => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    status: 200,
    json: async () => ({})
  } as any);
});

afterEach(() => {
  delete (globalThis as any).fetch;
});

describe("test createFetchSenderFactory", () => {
  it("should not set url throw error", () => {
    jest.restoreAllMocks();
    expect(() => createFetchSenderFactory()).toThrow();
  });

  it("should success build immutable", done => {
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

  it("should Validator error build immutable", done => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      status: 400
    });

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

  it("should TimeOut error build immutable", done => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new DOMException("Aborted", "AbortError"));

    const server = createFetchSenderFactory({
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
