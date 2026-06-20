import { TracingCore } from "@tracing/core";
import axios from "axios";
import type { AxiosError } from "axios";
import {
  BrowserHttpAxiosPlugin,
  defaultGenRecord,
  defaultSanitize,
  defaultClassifyError,
  BrowserHttpRequestEvent
} from "../browser-http-axios";

interface MockAdapterOptions {
  status?: number;
  statusText?: string;
  data?: any;
  delay?: number;
  timeout?: boolean;
  networkError?: boolean;
}

function createMockAdapter(opts: MockAdapterOptions) {
  return (config: any) => {
    return new Promise<any>((resolve, reject) => {
      const trigger = () => {
        if (opts.timeout) {
          const err = new Error("timeout of 0ms exceeded");
          (err as any).code = "ECONNABORTED";
          (err as any).config = config;
          (err as any).isAxiosError = true;
          (err as any).name = "AxiosError";
          reject(err);
        } else if (opts.networkError) {
          const err = new Error("Network Error");
          (err as any).config = config;
          (err as any).isAxiosError = true;
          (err as any).name = "AxiosError";
          reject(err);
        } else {
          resolve({
            data: opts.data ?? { ok: true },
            status: opts.status ?? 200,
            statusText: opts.statusText ?? "OK",
            headers: { "content-type": "application/json" },
            config,
            request: {}
          });
        }
      };

      if ((opts.delay ?? 10) > 0) {
        setTimeout(trigger, opts.delay ?? 10);
      } else {
        trigger();
      }
    });
  };
}

describe("defaultGenRecord", () => {
  it("should format success data", () => {
    const data = {
      url: "/api/users",
      method: "GET",
      baseURL: "/api",
      duration: 320,
      status: 200,
      statusText: "OK",
      errorType: null,
      errorMessage: null
    };

    expect(defaultGenRecord(data)).toEqual({
      event: BrowserHttpRequestEvent,
      url: "/api/users",
      method: "GET",
      baseURL: "/api",
      duration: 320,
      status: 200,
      statusText: "OK",
      errorType: null,
      errorMessage: ""
    });
  });

  it("should format error data", () => {
    const data = {
      url: "/api/users",
      method: "POST",
      baseURL: "/api",
      duration: 5000,
      status: 0,
      statusText: "",
      errorType: "timeout" as const,
      errorMessage: "timeout of 5000ms exceeded"
    };

    const record = defaultGenRecord(data);
    expect(record.errorType).toBe("timeout");
    expect(record.errorMessage).toBe("timeout of 5000ms exceeded");
    expect(record.status).toBe(0);
  });
});

describe("defaultSanitize", () => {
  it("should return the same data", () => {
    const data = {
      url: "/api/users",
      method: "GET",
      duration: 100,
      status: 200,
      statusText: "OK",
      errorType: null,
      errorMessage: null
    };

    expect(defaultSanitize(data)).toBe(data);
  });
});

describe("defaultClassifyError", () => {
  function createAxiosError(overrides: Partial<AxiosError>): AxiosError {
    return {
      name: "AxiosError",
      message: "error",
      isAxiosError: true,
      toJSON: () => ({}),
      config: {} as any,
      ...overrides
    } as AxiosError;
  }

  it("should classify timeout", () => {
    const error = createAxiosError({ code: "ECONNABORTED" });
    expect(defaultClassifyError(error)).toBe("timeout");
  });

  it("should classify http_error when response exists", () => {
    const error = createAxiosError({
      response: {
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: {} as any,
        data: null
      }
    });
    expect(defaultClassifyError(error)).toBe("http_error");
  });

  it("should classify network for unknown errors", () => {
    const error = createAxiosError({ code: "ERR_NETWORK" });
    expect(defaultClassifyError(error)).toBe("network");
  });
});

describe("BrowserHttpAxiosPlugin", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should report successful request", done => {
    const http = axios.create();
    http.defaults.adapter = createMockAdapter({ status: 200, data: { ok: true } });

    const tc = new TracingCore({
      plugins: [BrowserHttpAxiosPlugin({ axiosInstance: http })]
    });

    jest.spyOn(tc, "report");
    tc.init();

    http.get("/users").then(() => {
      expect(tc.report).toHaveBeenCalledWith(
        BrowserHttpRequestEvent,
        expect.objectContaining({
          method: "GET",
          status: 200,
          errorType: null
        })
      );

      tc.destroy();
      done();
    });
  });

  it("should report http error request", done => {
    const http = axios.create();
    http.defaults.adapter = createMockAdapter({ status: 500, data: { error: "bad" } });

    const tc = new TracingCore({
      plugins: [BrowserHttpAxiosPlugin({ axiosInstance: http })]
    });

    jest.spyOn(tc, "report");
    tc.init();

    http.get("/users").then(() => {
      expect(tc.report).toHaveBeenCalledWith(
        BrowserHttpRequestEvent,
        expect.objectContaining({
          method: "GET",
          status: 500,
          errorType: "http_error"
        })
      );

      tc.destroy();
      done();
    });
  });

  it("should report timeout request", done => {
    const http = axios.create({ timeout: 5000 });
    http.defaults.adapter = createMockAdapter({ timeout: true });

    const tc = new TracingCore({
      plugins: [BrowserHttpAxiosPlugin({ axiosInstance: http })]
    });

    jest.spyOn(tc, "report");
    tc.init();

    http.get("/users").catch(() => {
      expect(tc.report).toHaveBeenCalledWith(
        BrowserHttpRequestEvent,
        expect.objectContaining({
          method: "GET",
          errorType: "timeout"
        })
      );

      tc.destroy();
      done();
    });
  });

  it("should report network error", done => {
    const http = axios.create();
    http.defaults.adapter = createMockAdapter({ networkError: true });

    const tc = new TracingCore({
      plugins: [BrowserHttpAxiosPlugin({ axiosInstance: http })]
    });

    jest.spyOn(tc, "report");
    tc.init();

    http.get("/users").catch(() => {
      expect(tc.report).toHaveBeenCalledWith(
        BrowserHttpRequestEvent,
        expect.objectContaining({
          method: "GET",
          errorType: "network"
        })
      );

      tc.destroy();
      done();
    });
  });

  it("should respect shouldRecord filter", done => {
    const http = axios.create();
    http.defaults.adapter = createMockAdapter({ status: 200 });

    const tc = new TracingCore({
      plugins: [
        BrowserHttpAxiosPlugin({
          axiosInstance: http,
          shouldRecord: config => !config.url?.includes("/health")
        })
      ]
    });

    jest.spyOn(tc, "report");
    tc.init();

    http.get("/health").then(() => {
      expect(tc.report).not.toHaveBeenCalled();

      tc.destroy();
      done();
    });
  });

  it("should use custom genRecord", done => {
    const http = axios.create();
    http.defaults.adapter = createMockAdapter({ status: 200 });

    const tc = new TracingCore({
      plugins: [
        BrowserHttpAxiosPlugin({
          axiosInstance: http,
          genRecord: data => ({ custom: "format", url: data.url, dur: data.duration })
        })
      ]
    });

    jest.spyOn(tc, "report");
    tc.init();

    http.get("/users").then(() => {
      expect(tc.report).toHaveBeenCalledWith(
        BrowserHttpRequestEvent,
        expect.objectContaining({
          custom: "format",
          url: "/users",
          dur: expect.any(Number)
        })
      );

      tc.destroy();
      done();
    });
  });

  it("should use custom sanitize", done => {
    const http = axios.create();
    http.defaults.adapter = createMockAdapter({ status: 200 });

    const tc = new TracingCore({
      plugins: [
        BrowserHttpAxiosPlugin({
          axiosInstance: http,
          sanitize: data => ({ ...data, url: data.url.replace(/token=[^&]+/, "token=***") })
        })
      ]
    });

    jest.spyOn(tc, "report");
    tc.init();

    http.get("/users?token=secret123").then(() => {
      const call = (tc.report as jest.Mock).mock.calls[0];
      expect(call[1].url).not.toContain("secret123");
      expect(call[1].url).toContain("token=***");

      tc.destroy();
      done();
    });
  });

  it("should eject interceptors on destroy", async () => {
    const http = axios.create();
    http.defaults.adapter = createMockAdapter({ status: 200 });

    const reqSpy = jest.spyOn(http.interceptors.request, "eject");
    const resSpy = jest.spyOn(http.interceptors.response, "eject");

    const tc = new TracingCore({
      plugins: [BrowserHttpAxiosPlugin({ axiosInstance: http })]
    });

    tc.init();
    await tc.destroy();

    expect(reqSpy).toHaveBeenCalledTimes(1);
    expect(resSpy).toHaveBeenCalledTimes(1);
  });

  it("should use custom classifyError for network errors", done => {
    const http = axios.create();
    http.defaults.adapter = createMockAdapter({ networkError: true });

    const tc = new TracingCore({
      plugins: [
        BrowserHttpAxiosPlugin({
          axiosInstance: http,
          classifyError: () => "http_error"
        })
      ]
    });

    jest.spyOn(tc, "report");
    tc.init();

    http.get("/users").catch(() => {
      expect(tc.report).toHaveBeenCalledWith(
        BrowserHttpRequestEvent,
        expect.objectContaining({
          errorType: "http_error"
        })
      );

      tc.destroy();
      done();
    });
  });

  it("should not report when sampleRate is 0", done => {
    const http = axios.create();
    http.defaults.adapter = createMockAdapter({ status: 200 });

    const tc = new TracingCore({
      plugins: [
        BrowserHttpAxiosPlugin({
          axiosInstance: http,
          sampleRate: 0
        })
      ]
    });

    jest.spyOn(tc, "report");
    tc.init();

    http.get("/users").then(() => {
      expect(tc.report).not.toHaveBeenCalled();

      tc.destroy();
      done();
    });
  });
});
