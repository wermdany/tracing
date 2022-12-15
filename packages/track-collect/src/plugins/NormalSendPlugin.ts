import type { CollectPlugin, XhrConfig } from "@collect/core";

import { createXhrSender } from "@collect/core";

/**
 * give XHR send report
 */

type ErrorQueueMap = Map<Record<string, any>, number>;

export interface NormalSendPluginConfig extends XhrConfig {
  sendSuccess: (build: Record<string, any>, errorQueue: ErrorQueueMap) => void;
  sendError: (build: Record<string, any>, errorQueue: ErrorQueueMap) => void;
  retryCount: number;
  retryInterval: number;
}

export function NormalSendPlugin(config: Partial<NormalSendPluginConfig>): CollectPlugin {
  const resolvedConfig = {
    retryCount: 3,
    retryInterval: 1000,
    ...config
  };
  const { request } = createXhrSender(resolvedConfig);
  const errorQueue: ErrorQueueMap = new Map();

  const insideRequest = (build: Record<string, any>) => {
    request(build, insideError, insideSuccess);
  };

  const insideError = (build: Record<string, any>) => {
    const error =
      resolvedConfig.sendError ||
      ((build, queue) => {
        if (!resolvedConfig.retryCount) return;
        const count = queue.get(build);
        if (count === undefined) {
          queue.set(build, 1);
          run(build);
        } else {
          if (count === resolvedConfig.retryCount) {
            queue.delete(build);
          } else {
            queue.set(build, count + 1);
            run(build);
          }
        }
      });

    error(build, errorQueue);
  };

  const insideSuccess = (build: Record<string, any>) => {
    const success =
      resolvedConfig.sendSuccess ||
      ((build, queue) => {
        if (queue.has(build)) {
          queue.delete(build);
        }
      });

    success(build, errorQueue);
  };

  const run = (build: Record<string, any>) => {
    const count = errorQueue.get(build)!;
    const timeout = 2 ** (count + 1) * resolvedConfig.retryInterval;
    setTimeout(() => {
      insideRequest(build);
    }, timeout);
  };

  return {
    name: "NormalSendPlugin",
    send: {
      order: "post",
      handler(event, build) {
        if (event && build) {
          insideRequest(build);
          return false;
        }
      }
    },
    destroy() {
      errorQueue.clear();
    }
  };
}
