import type { TracingPlugin, handlerOrder } from "@tracing/core";

import type { BaseSenderFactory, BaseSenderConfig, Ignore } from "./base";
import { defineBaseSenderConfig, SenderError, validatorBuild, parseIgnore } from "./base";

import type { MiddlewareConfig } from "./middleware";
import { useMiddleware } from "./middleware";

export interface FetchSenderConfig extends Omit<RequestInit, "body">, BaseSenderConfig {
  timeout: number;
  validateStatus: (status: number) => boolean;
  headers: Record<string, any>;
}

const defineFetchSenderConfig: FetchSenderConfig = {
  ...defineBaseSenderConfig,
  method: "POST",
  headers: {
    "Content-Type": "application/json;"
  },
  timeout: 2000,
  validateStatus: (status: number) => status == 200
};

export const createFetchSenderFactory: BaseSenderFactory<FetchSenderConfig> = config => {
  const resolveConfig = { ...defineFetchSenderConfig, ...config };

  if (!resolveConfig.url) {
    throw new Error("You must set send url");
  }

  const adapter = (url: string, options: RequestInit, timeout: number) => {
    if (timeout <= 0) return fetch(url, options);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  return (event, build, error, success) => {
    if (validatorBuild(build)) {
      error(event, build, SenderError.InvalidBuild);
      return;
    }

    adapter(
      resolveConfig.url,
      { ...resolveConfig, ...{ body: JSON.stringify(build) } },
      resolveConfig.timeout
    )
      .then(body => {
        if (resolveConfig.validateStatus(body.status)) {
          success(event, build);
        } else {
          error(event, build, SenderError.Validator, body);
        }
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") {
          error(event, build, SenderError.TimeOut);
        } else {
          error(event, build, SenderError.Network);
        }
      });
  };
};

export interface FetchSenderPluginConfig extends FetchSenderConfig, MiddlewareConfig {
  order: handlerOrder;
  excludes: Ignore;
}

const defineFetchSenderPluginConfig: FetchSenderPluginConfig = {
  ...defineFetchSenderConfig,
  order: "pre",
  middleware: [],
  excludes: []
};

export function FetchSenderPlugin(config?: Partial<FetchSenderPluginConfig>): TracingPlugin {
  const resolveConfig = { ...defineFetchSenderPluginConfig, ...config };
  const { instance, destroy } = useMiddleware(createFetchSenderFactory(resolveConfig), resolveConfig);

  const excludes = parseIgnore(resolveConfig.excludes);

  return {
    name: "tracing:sender-fetch",
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
