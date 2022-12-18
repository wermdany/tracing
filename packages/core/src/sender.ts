import type { Collector } from "./collector";

interface BaseSenderConfig {
  url: string;
}

interface XhrResponseMap {
  json: Record<string, string>;
  text: string;
}

export enum XhrErrorEnum {
  TimeOut = 1,
  Abort,
  Network,
  Validator,
  InvalidBuild
}

export interface XhrSenderConfig<T extends keyof XhrResponseMap = "json"> extends BaseSenderConfig {
  xhrTimeout: number;
  xhrMethods: "POST";
  xhrWithCredentials: boolean;
  xhrHeaders: Record<string, string>;
  xhrValidateStatus: (status: number) => boolean;
  xhrResponseType: T;
}

const xhrConfig: XhrSenderConfig = {
  url: "",
  xhrTimeout: 1000,
  xhrMethods: "POST",
  xhrWithCredentials: false,
  xhrHeaders: {
    "Content-Type": "application/json;"
  },
  xhrValidateStatus(status) {
    return status === 200;
  },
  xhrResponseType: "json"
};

type ErrorCallBackFun = (build: Record<string, any>, code: XhrErrorEnum, request?: XMLHttpRequest) => void;
type SuccessCallBackFun = (build: Record<string, any>) => void;

export function createXhrSender(config?: Partial<XhrSenderConfig>) {
  const resolvedConfig: XhrSenderConfig = Object.assign(xhrConfig, config);

  const xhr = (build: Record<string, any>, error: ErrorCallBackFun, success: SuccessCallBackFun) => {
    if (!build || typeof build != "object") {
      error(build, XhrErrorEnum.InvalidBuild);
      return;
    }

    let request: XMLHttpRequest | null = new XMLHttpRequest();

    request.open(resolvedConfig.xhrMethods, resolvedConfig.url, true);

    request.timeout = resolvedConfig.xhrTimeout;

    request.withCredentials = resolvedConfig.xhrWithCredentials;

    request.responseType = resolvedConfig.xhrResponseType;

    if ("setRequestHeader" in request) {
      const headers = resolvedConfig.xhrHeaders;
      for (const key in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, key)) {
          request.setRequestHeader(key, headers[key]);
        }
      }
    }

    const onloadend = () => {
      if (!request) return;
      if (resolvedConfig.xhrValidateStatus(request.status)) {
        success(build);
      } else {
        error(build, XhrErrorEnum.Validator, request);
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

    request.onabort = () => {
      error(build, XhrErrorEnum.Abort, request!);
      request = null;
    };

    request.onerror = () => {
      error(build, XhrErrorEnum.Network, request!);
      request = null;
    };

    request.ontimeout = () => {
      error(build, XhrErrorEnum.TimeOut, request!);
      request = null;
    };

    const send = build !== undefined ? JSON.stringify(build) : null;

    request.send(send);
  };

  return {
    request: xhr
  };
}

const beaconConfig: BaseSenderConfig = {
  url: ""
};

type BeaconCallbackFun = (build: Record<string, any>) => void;

export function createBeaconSender(collector: Collector, config: Partial<BaseSenderConfig>) {
  const logger = collector.logger;
  const isHasBeaconApi = navigator && "sendBeacon" in navigator;
  if (!isHasBeaconApi) {
    __DEV__ && logger.warn("Your browser does not support 'Beacon Api'");
    return;
  }

  const resolveConfig = { ...beaconConfig, ...config };

  const beacon = (build: Record<string, any>, error: BeaconCallbackFun, success: BeaconCallbackFun) => {
    const send = build ? JSON.stringify(build) : null;

    if (!send) {
      error(build);
      return;
    }

    const is = navigator.sendBeacon(resolveConfig.url, send);

    is ? success(build) : error(build);
  };

  return {
    request: beacon
  };
}
