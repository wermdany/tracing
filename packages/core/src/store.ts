import type { Logger } from "./logger";

import { hasOwn, omit, transProfile } from "@tracker/shared";

export type JsonPrimitive = string | number | boolean | null;

export type StoreProfile = JsonPrimitive | (() => JsonPrimitive);

export interface Store<N extends string> {
  name: N;
  get: () => Record<string, any>;
  set: (key: string, value: StoreProfile) => void;
  getOrigin: () => Record<string, StoreProfile>;
  remove: (key: string) => void;
  clear: () => void;
}

export function createStore<N extends string>(
  name: N,
  initStore?: Record<string, StoreProfile>,
  logger?: Logger
): Store<N> {
  let store = { ...initStore };

  return {
    name,
    get() {
      return transProfile(store);
    },
    set(key: string, value: StoreProfile) {
      __DEV__ &&
        logger &&
        hasOwn(store, key) &&
        logger.warn("store:".concat(name), `You are trying to overwrite an existing property: ${key}`);
      store[key] = value;
    },
    getOrigin() {
      return { ...store };
    },
    remove(key: string) {
      store = omit(store, [key]);
    },
    clear() {
      store = {};
    }
  };
}
