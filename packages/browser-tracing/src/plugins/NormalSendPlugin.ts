import type { TracingPlugin, XhrConfig } from "@tracing/core";

import { createXhrSender, XhrErrorEnum } from "@tracing/core";
import { noop } from "@tracing/shared";

/**
 * give xhr send report
 */

interface RetryConfig {
  xhrRetryCount: number;
  xhrRetryInterval: number;
}

type Factory = (build: Record<string, any>, handler: () => void) => void;

export interface NormalSendPluginConfig extends XhrConfig, RetryConfig {}

export function NormalSendPlugin(config: Partial<NormalSendPluginConfig>): TracingPlugin {
  const resolvedConfig = {
    xhrRetryCount: 3,
    xhrRetryInterval: 1000,
    ...config
  };
  const { request } = createXhrSender(resolvedConfig);

  const retry = resolvedConfig.xhrRetryCount == 0 ? undefined : createErrorRetry(resolvedConfig);

  const requestFactory = (build: Record<string, any>, handler?: () => void) => {
    request(
      build,
      (record, code) => {
        if (code !== XhrErrorEnum.InvalidBuild) {
          retry && retry.add(record, handler || noop, requestFactory);
        }
      },
      record => {
        retry && retry.remove(record, handler || noop, requestFactory);
      }
    );
  };

  return {
    name: "NormalSendPlugin",
    send: {
      order: "post",
      handler(event, build) {
        if (event && build) {
          try {
            requestFactory(build);
          } catch (error) {
            console.log(error);
          }
          return false;
        }
      }
    },
    destroy() {
      retry && retry.destroy();
    }
  };
}

type QueueItemValue = Record<string, any>;

type QueueItemCount = number;

type QueueItemWeight = number;

type ErrorQueueItem = [QueueItemValue, QueueItemCount, QueueItemWeight];

const createErrorRetry = (config: RetryConfig) => {
  const errorQueue: ErrorQueueItem[] = [];

  let timer: number | undefined = undefined;

  const add = (build: Record<string, any>, handler: () => void, factory: Factory) => {
    const index = errorQueue.findIndex(([value]) => build === value);

    if (index == -1) {
      errorQueue.unshift([build, 1, getQueueWeight(1)]);
    } else {
      const queueItem = errorQueue[index];

      errorQueue.splice(index, 1);

      if (queueItem[1] < config.xhrRetryCount) {
        setQueueAgain(errorQueue, genQueueItem(queueItem));
      }
    }

    handler && handler();

    run(factory);
  };

  const remove = (build: Record<string, any>, handler: () => void, factory: Factory) => {
    const index = errorQueue.findIndex(([value]) => build === value);
    if (index != -1) {
      errorQueue.splice(index, 1);
    }

    handler && handler();

    run(factory);
  };

  const run = (handler: (build: Record<string, any>, clear: () => void) => void) => {
    if (timer || !errorQueue.length) return;
    const [build, , weight] = errorQueue[0];

    timer = setTimeout(() => {
      handler(build, () => {
        clearTimeout(timer);
        timer = undefined;
      });
    }, weight);
  };

  const getQueueWeight = (count: number) => 2 ** count * config.xhrRetryInterval;

  const genQueueItem = (item: ErrorQueueItem): ErrorQueueItem => {
    const [build, count] = item;

    return [build, count + 1, getQueueWeight(count + 1)];
  };

  const setQueueAgain = (queue: ErrorQueueItem[], item: ErrorQueueItem) => {
    const [, , weight] = item;
    let index = 0;

    while (index < queue.length) {
      const [, , insWeight] = queue[index];

      if (weight <= insWeight) {
        queue.splice(index, 0, item);
        return;
      }

      index++;
    }

    queue.push(item);
  };

  const destroy = () => {
    errorQueue.length = 0;
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

  return {
    add,
    remove,
    run,
    destroy
  };
};
