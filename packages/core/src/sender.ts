import type { Collector } from "./collector";

interface BaseSenderConfig {
  url: string;
}

interface XhrResponseMap {
  json: Record<string, string>;
  text: string;
}

export interface XhrSenderConfig<T extends keyof XhrResponseMap = "json"> extends BaseSenderConfig {
  xhrTimeout: number;
  xhrMethods: "POST";
  xhrWithCredentials: boolean;
  xhrHeaders: Record<string, string>;
  xhrValidateStatus: (
    status: number,
    response: T extends keyof XhrResponseMap ? XhrResponseMap[T] : never
  ) => boolean;
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

type CallBackFun = (build: Record<string, any>) => void;

export function createXhrSender(config?: Partial<XhrSenderConfig>) {
  const resolvedConfig: XhrSenderConfig = Object.assign(xhrConfig, config);

  const xhr = (build: Record<string, any>, error: CallBackFun, success: CallBackFun) => {
    if (!build) {
      error(build);
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

    const clearRequest = () => {
      request = null;
    };

    const onloadend = () => {
      if (!request) return;

      if (resolvedConfig.xhrValidateStatus(request.status, request.response)) {
        success(build);
      } else {
        error(build);
      }
      clearRequest();
    };

    if ("onloadend" in request) {
      request.onloadend = onloadend;
    }

    request.onreadystatechange = () => {
      if (!request || request.readyState !== 4) return;
      setTimeout(onloadend);
    };

    request.onabort = () => {
      error(build);
      clearRequest();
    };

    request.onerror = () => {
      error(build);
      clearRequest();
    };

    request.ontimeout = () => {
      error(build);
      clearRequest();
    };

    const send = build ? JSON.stringify(build) : null;

    request.send(send);
  };

  return {
    request: xhr
  };
}

const beaconConfig: BaseSenderConfig = {
  url: ""
};

export function createBeaconSender(collector: Collector, config: Partial<BaseSenderConfig>) {
  const logger = collector.logger;
  const isHasBeaconApi = navigator && "sendBeacon" in navigator;
  if (!isHasBeaconApi) {
    __DEV__ && logger.warn("Your browser does not support 'Beacon Api'");
    return;
  }

  const resolveConfig = Object.assign(beaconConfig, config);

  const beacon = (build: Record<string, any>, error: CallBackFun, success: CallBackFun) => {
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
