import type { BaseSenderHandle } from "../base";
import type { BatchSenderConfig } from "./batch";
import type { ErrorRetryConfig } from "./retry";

export function compose<R>(...funcs: Function[]): (...args: any[]) => R;
export function compose(...funcs: Function[]) {
  if (funcs.length === 0) {
    return <T>(arg: T) => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(
    (a, b) =>
      (...args: any) =>
        a(b(...args))
  );
}

export type Middleware<Base extends BaseSenderHandle = BaseSenderHandle> = (
  request: Base
) => (...args: Parameters<Base>) => void;

export type MiddlewareDestroy = (...args: any[]) => void | Promise<void>;

export type MiddlewareApi<Config extends Record<string, any> = {}> = (config: Partial<Config>) => {
  middleware: Middleware;
  destroy: MiddlewareDestroy;
};

export interface MiddlewareConfig extends Partial<ErrorRetryConfig>, Partial<BatchSenderConfig> {
  middleware: MiddlewareApi[];
}

export function useMiddleware<Ins extends BaseSenderHandle>(instance: Ins, config: MiddlewareConfig) {
  const { destroy, middleware } = config.middleware.reduce(
    (callback, current) => {
      const { middleware, destroy } = current(config);
      callback.destroy.push(destroy);
      callback.middleware.push(middleware);
      return callback;
    },
    { middleware: [], destroy: [] } as {
      middleware: Middleware[];
      destroy: MiddlewareDestroy[];
    }
  );

  return {
    instance: compose<Ins>(...middleware)(instance),
    destroy() {
      return Promise.all(destroy.map(fun => fun()));
    }
  };
}
