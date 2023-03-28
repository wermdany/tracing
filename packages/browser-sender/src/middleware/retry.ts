import type { MiddlewareApi } from "./core";

import type { SuccessCall, ErrorCall, BaseSenderHandle, Ignore } from "../base";

import { SenderError, parseIgnore } from "../base";

export interface ErrorRetryConfig {
  retryCount: number;
  retryInterval: number;
  retryWeight: (count: number, interval: number) => number;
  retryIgnoreEvent: Ignore;
  retryIgnoreErrorCode: Ignore<SenderError>;
}

const defineRetryConfig: ErrorRetryConfig = {
  retryCount: 3,
  retryInterval: 2000,
  retryWeight: (count, interval) => 2 ** count * interval,
  retryIgnoreEvent: () => false,
  retryIgnoreErrorCode: [SenderError.BeaconQueue, SenderError.InvalidBuild]
};

interface ErrorQueue {
  weight: number;
  count: number;

  event: string;
  build: Record<string, any>;
}

export const ErrorRetryMiddleware: MiddlewareApi<ErrorRetryConfig> = config => {
  const { retryWeight, retryCount, retryInterval, retryIgnoreEvent, retryIgnoreErrorCode } = {
    ...defineRetryConfig,
    ...config
  };

  const ignoreEventFun = parseIgnore(retryIgnoreEvent);
  const ignoreErrorCodeFun = parseIgnore(retryIgnoreErrorCode);

  const queue: ErrorQueue[] = [];

  let timer: number;

  let destroyed = false;

  let inRequest: BaseSenderHandle;

  const setQueueAgain = (queue: ErrorQueue[], item: ErrorQueue) => {
    const { weight } = item;
    let index = 0;

    while (index < queue.length) {
      const { weight: insWeight } = queue[index];

      if (weight <= insWeight) {
        queue.splice(index, 0, item);
        return;
      }

      index++;
    }

    queue.push(item);
  };

  const genQueueItem = (item: ErrorQueue): ErrorQueue => {
    const { count, build, event } = item;

    return {
      event,
      build,
      count: count + 1,
      weight: retryWeight(count + 1, retryInterval)
    };
  };

  const add = (event: string, build: Record<string, any>) => {
    if (ignoreEventFun(event) || destroyed) return;

    const index = queue.findIndex(({ build: value }) => value === build);

    if (index == -1) {
      queue.unshift({
        count: 1,
        weight: retryWeight(1, retryInterval),
        event,
        build
      });
    } else {
      const item = queue.splice(index, 1)[0];
      if (item.count <= retryCount) {
        setQueueAgain(queue, genQueueItem(item));
      }
    }
  };

  const remove = (_event: string, build: Record<string, any>) => {
    const index = queue.findIndex(({ build: value }) => build === value);
    if (index != -1) {
      queue.splice(index, 1);
    }
  };

  const loop = () => {
    if (!queue.length || destroyed) return;

    const { weight, event, build } = queue[0];

    timer = setTimeout(() => {
      inRequest(
        event,
        build,
        mc(() => {
          timer = 0;
        }, inError),
        mc(() => {
          timer = 0;
        }, inSuccess)
      );
    }, weight);
  };

  const inError: ErrorCall = (event, build, code) => {
    if (ignoreErrorCodeFun(code)) return;

    add(event, build);
    !timer && loop();
  };

  const inSuccess: SuccessCall = (event, build) => {
    remove(event, build);
    !timer && loop();
  };

  return {
    middleware(request) {
      inRequest = request;

      return (event, build, error, success) => {
        request(event, build, mc(inError, error), mc(inSuccess, success));
      };
    },
    destroy() {
      if (timer) {
        clearTimeout(timer);
      }
      queue.length = 0;
      timer = 0;
      destroyed = true;
    }
  };
};

function mc<T extends (...args: any[]) => any>(inSide: T, outSide: T) {
  return (...args: any[]) => {
    inSide(...args);
    outSide(...args);
  };
}
