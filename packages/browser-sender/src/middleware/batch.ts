import type { MiddlewareApi } from "./core";

import type { SuccessCall, ErrorCall, BaseSenderHandle, Ignore } from "../base";
import { parseIgnore } from "../base";

export interface BatchSenderConfig {
  batchCount: number;
  batchIgnore: Ignore;
}
export const BatchSenderEvent = "__BATCH_SENDER";

const defineBatchSenderConfig: BatchSenderConfig = {
  batchCount: 10,
  batchIgnore: []
};

interface BatchSenderQueue {
  build: Record<string, any>;
}

export const BatchSendMiddleware: MiddlewareApi<BatchSenderConfig> = config => {
  const { batchCount, batchIgnore } = { ...defineBatchSenderConfig, ...config };

  const ignoreFun = parseIgnore(batchIgnore);

  let inRequest: BaseSenderHandle;

  const queue: BatchSenderQueue[] = [];

  const add = (_event: string, build: Record<string, any>) => {
    queue.push({
      build
    });
  };

  const getBatchBuild = (destroy = false) => {
    if (destroy) return queue;
    return queue.splice(0, batchCount);
  };

  const batchSend = (error: ErrorCall, success: SuccessCall) => {
    if (queue.length < batchCount) return;

    inRequest(BatchSenderEvent, getBatchBuild(), error, success);
  };

  return {
    middleware(request) {
      inRequest = request;
      return (event, build, error, success) => {
        // fix: Batch send direct send
        if (ignoreFun(event) || event == BatchSenderEvent || batchCount < 2) {
          request(event, build, error, success);
          return;
        }

        add(event, build);

        batchSend(error, success);
      };
    },
    destroy() {
      return new Promise(resolve => {
        // fix: clear queue
        if (queue.length) {
          inRequest(
            BatchSenderEvent,
            getBatchBuild(true),
            () => {
              resolve();
            },
            () => {
              resolve();
            }
          );
          queue.length = 0;
        }
      });
    }
  };
};
