import type { TracingPlugin, handlerOrder } from "@tracing/core";

import type { BaseSenderConfig, BaseSenderFactory, Ignore } from "./base";
import { SenderError, defineBaseSenderConfig, validatorBuild, parseIgnore } from "./base";

import type { MiddlewareConfig } from "./middleware";
import { useMiddleware } from "./middleware";

type XhrResponseType = "text" | "json";

export interface XhrSenderConfig<T extends XhrResponseType = "json"> extends BaseSenderConfig {
  timeout: number;
  methods: "POST";
  withCredentials: boolean;
  headers: Record<string, string>;
  validateStatus: (status: number) => boolean;
  responseType: T;
}

const defineXhrSenderConfig: XhrSenderConfig = {
  ...defineBaseSenderConfig,
  timeout: 2000,
  methods: "POST",
  withCredentials: false,
  headers: {
    "Content-Type": "application/json;"
  },
  validateStatus: (status: number) => status == 200,
  responseType: "json"
};

export const createXhrSenderFactory: BaseSenderFactory<XhrSenderConfig> = config => {
  const resolveConfig: XhrSenderConfig = { ...defineXhrSenderConfig, ...config };

  if (!resolveConfig.url) {
    throw new Error("You must set send url");
  }

  return (event, build, error, success) => {
    if (validatorBuild(build)) {
      error(event, build, SenderError.InvalidBuild);
      return;
    }

    let request: XMLHttpRequest | null = new XMLHttpRequest();

    request.open(resolveConfig.methods, resolveConfig.url, true);

    request.timeout = resolveConfig.timeout;

    request.withCredentials = resolveConfig.withCredentials;

    request.responseType = resolveConfig.responseType;

    if ("setRequestHeader" in request) {
      const headers = resolveConfig.headers;
      for (const key in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, key)) {
          request.setRequestHeader(key, headers[key]);
        }
      }
    }

    const onloadend = () => {
      if (!request) return;
      if (resolveConfig.validateStatus(request.status)) {
        success(event, build);
      } else {
        error(event, build, SenderError.Validator, request);
      }
      request = null;
    };

    if ("onloadend" in request) {
      request.onloadend = onloadend;
    } else {
      // @ts-ignore
      request.onreadystatechange = () => {
        if (!request || request.readyState !== 4) return;
        setTimeout(onloadend);
      };
    }

    request.onerror = () => {
      error(event, build, SenderError.Network, request!);
      request = null;
    };

    request.ontimeout = () => {
      error(event, build, SenderError.TimeOut, request!);
      request = null;
    };

    request.send(JSON.stringify(build));
  };
};

export interface XhrSenderPluginConfig extends XhrSenderConfig, MiddlewareConfig {
  order: handlerOrder;
  excludes: Ignore;
}

const defineXhrSenderPluginConfig: XhrSenderPluginConfig = {
  ...defineXhrSenderConfig,
  order: "pre",
  middleware: [],
  excludes: []
};

export function XhrSenderPlugin(config?: Partial<XhrSenderPluginConfig>): TracingPlugin {
  const resolveConfig = { ...defineXhrSenderPluginConfig, ...config };
  const { instance, destroy } = useMiddleware(createXhrSenderFactory(resolveConfig), resolveConfig);

  const excludes = parseIgnore(resolveConfig.excludes);

  return {
    name: "tracing:sender-xhr",
    send: {
      order: resolveConfig.order,
      handler(event, build) {
        if (excludes(event)) return;

        instance(event, build, resolveConfig.error, resolveConfig.success);
        return false;
      }
    },
    async beforeDestroy() {
      await destroy();
    }
  };
}
