import type { TracingPlugin, handlerOrder } from "@tracing/core";

import type { MiddlewareConfig } from "./middleware";
import { useMiddleware } from "./middleware";

import type { BaseSenderConfig, BaseSenderFactory, Ignore } from "./base";
import { SenderError, defineBaseSenderConfig, validatorBuild, parseIgnore } from "./base";

export interface BeaconSenderConfig extends BaseSenderConfig {}

const defineBeaconSenderConfig: BeaconSenderConfig = {
  ...defineBaseSenderConfig
};

export const createBeaconSenderFactory: BaseSenderFactory<BeaconSenderConfig> = config => {
  const resolveConfig = { ...defineBeaconSenderConfig, ...config };

  if (!resolveConfig.url) {
    throw new Error("You must set send url");
  }

  return (event, build, error, success) => {
    if (validatorBuild(build)) {
      error(event, build, SenderError.InvalidBuild);
      return;
    }

    const flag = navigator.sendBeacon(resolveConfig.url, JSON.stringify(build));

    flag ? success(event, build) : error(event, build, SenderError.BeaconQueue);
  };
};

export interface BeaconSenderPluginConfig extends BeaconSenderConfig, MiddlewareConfig {
  order: handlerOrder;
  excludes: Ignore;
}

const defineBeaconSenderPluginConfig: BeaconSenderPluginConfig = {
  ...defineBeaconSenderConfig,
  order: "post",
  middleware: [],
  excludes: []
};

export function BeaconSenderPlugin(config?: Partial<BeaconSenderPluginConfig>): TracingPlugin {
  const resolveConfig = { ...defineBeaconSenderPluginConfig, ...config };

  const { instance, destroy } = useMiddleware(createBeaconSenderFactory(resolveConfig), resolveConfig);

  const excludes = parseIgnore(resolveConfig.excludes);

  return {
    name: "tracing:sender-beacon",
    send: {
      order: resolveConfig.order,
      handler(event, build) {
        if (!excludes(event)) return;

        instance(event, build, resolveConfig.error, resolveConfig.success);
        return false;
      }
    },
    async beforeDestroy() {
      await destroy();
    }
  };
}
