import type { TracingPlugin, TracingCore } from "@tracing/core";
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";

export const BrowserHttpRequestEvent = "http-request";

export type BrowserHttpAxiosErrorType = "timeout" | "network" | "http_error" | "canceled" | null;

export interface BrowserHttpAxiosData {
  url: string;
  method: string;
  baseURL?: string;
  duration: number;
  status: number;
  statusText: string;
  errorType: BrowserHttpAxiosErrorType;
  errorMessage: string | null;
}

export interface BrowserHttpAxiosPluginConfig {
  axiosInstance: AxiosInstance;
  shouldRecord?: (config: InternalAxiosRequestConfig) => boolean;
  sampleRate?: number;
  sanitize?: (data: BrowserHttpAxiosData) => BrowserHttpAxiosData;
  classifyError?: (error: AxiosError) => BrowserHttpAxiosErrorType;
  genRecord?: (data: BrowserHttpAxiosData) => Record<string, any>;
}

const requestTimings = new WeakMap<InternalAxiosRequestConfig, { startTime: number }>();

export function defaultSanitize<T extends BrowserHttpAxiosData>(data: T): T {
  return data;
}

export function defaultClassifyError(error: AxiosError): BrowserHttpAxiosErrorType {
  if (error.code === "ECONNABORTED") return "timeout";
  if (error.response) return "http_error";
  return "network";
}

export function defaultGenRecord(data: BrowserHttpAxiosData): Record<string, any> {
  return {
    event: BrowserHttpRequestEvent,
    url: data.url,
    method: data.method,
    baseURL: data.baseURL || "",
    duration: Math.round(data.duration),
    status: data.status,
    statusText: data.statusText,
    errorType: data.errorType,
    errorMessage: data.errorMessage || ""
  };
}

export const defineBrowserHttpAxiosConfig = {
  shouldRecord: () => true,
  sampleRate: 1,
  sanitize: defaultSanitize,
  classifyError: defaultClassifyError,
  genRecord: defaultGenRecord
};

export function BrowserHttpAxiosPlugin(config: BrowserHttpAxiosPluginConfig): TracingPlugin {
  const resolvedConfig = {
    ...defineBrowserHttpAxiosConfig,
    ...config
  } as Required<BrowserHttpAxiosPluginConfig>;

  let core: TracingCore;
  let reqInterceptorId: number | null = null;
  let resInterceptorId: number | null = null;

  return {
    name: "browser:http-axios",

    prepare(ctx) {
      core = ctx;

      reqInterceptorId = resolvedConfig.axiosInstance.interceptors.request.use(
        requestConfig => {
          if (!resolvedConfig.shouldRecord(requestConfig)) {
            return requestConfig;
          }

          requestTimings.set(requestConfig, { startTime: performance.now() });

          return requestConfig;
        },
        error => Promise.reject(error)
      );

      resInterceptorId = resolvedConfig.axiosInstance.interceptors.response.use(
        response => {
          const timing = requestTimings.get(response.config);
          if (!timing) return response;

          const duration = performance.now() - timing.startTime;

          if (samplePass(resolvedConfig.sampleRate)) {
            const isHttpError = response.status >= 400;
            const data: BrowserHttpAxiosData = {
              url: response.config.url || "",
              method: (response.config.method || "GET").toUpperCase(),
              baseURL: response.config.baseURL,
              duration,
              status: response.status,
              statusText: response.statusText,
              errorType: isHttpError ? "http_error" : null,
              errorMessage: isHttpError ? `Request failed with status code ${response.status}` : null
            };

            reportRequest(core, resolvedConfig, data);
          }

          return response;
        },
        (error: AxiosError) => {
          const reqConfig = error.config;
          const timing = reqConfig ? requestTimings.get(reqConfig) : undefined;
          const duration = timing ? performance.now() - timing.startTime : 0;

          if (reqConfig && timing && samplePass(resolvedConfig.sampleRate)) {
            const isCanceled = error.message === "canceled" || (error as any).__CANCEL__;
            const data: BrowserHttpAxiosData = {
              url: reqConfig.url || "",
              method: (reqConfig.method || "GET").toUpperCase(),
              baseURL: reqConfig.baseURL,
              duration,
              status: error.response?.status || 0,
              statusText: error.response?.statusText || "",
              errorType: isCanceled ? "canceled" : resolvedConfig.classifyError(error),
              errorMessage: error.message || ""
            };

            reportRequest(core, resolvedConfig, data);
          }

          return Promise.reject(error);
        }
      );
    },

    destroy() {
      if (reqInterceptorId !== null) {
        resolvedConfig.axiosInstance.interceptors.request.eject(reqInterceptorId);
        reqInterceptorId = null;
      }
      if (resInterceptorId !== null) {
        resolvedConfig.axiosInstance.interceptors.response.eject(resInterceptorId);
        resInterceptorId = null;
      }
    }
  };
}

function samplePass(rate: number): boolean {
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return Math.random() < rate;
}

function reportRequest(
  core: TracingCore,
  config: Required<BrowserHttpAxiosPluginConfig>,
  data: BrowserHttpAxiosData
) {
  try {
    const sanitized = config.sanitize(data);
    const record = config.genRecord(sanitized);
    core.report(BrowserHttpRequestEvent, record);
  } catch (e) {
    __DEV__ && console.error("[browser:http-axios] report error:", e);
  }
}
