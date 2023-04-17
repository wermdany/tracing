import type { AnyFun } from "@tracing/shared";
import type { Logger } from "./logger";
import type { TracingCore } from "./core";
import type { TracingCoreConfig } from "./config";

import { createLogger } from "./logger";

export interface NormalPlugin {
  name: string;
}

export interface FunctionPlugins {
  // Sync Sequential
  setup: (this: PluginContext, initConfig: TracingCoreConfig) => void;
  // Sync Sequential
  init: (this: PluginContext, ctx: TracingCore) => AnyFun | void;
  // Sync ChainMerge
  build: (
    this: PluginContext,
    event: string,
    record: Record<string, any>,
    meta?: unknown
  ) => Record<string, any>;
  // Sync Bail
  beforeSend: (this: PluginContext, event: string, build: Record<string, any>) => boolean | void | null;
  // Sync Bail
  send: (this: PluginContext, event: string, build: Record<string, any>) => boolean | void | null;
  // Async Parallel
  beforeDestroy: (this: PluginContext, ctx: TracingCore) => any;
  // Sync Sequential
  destroy: (this: PluginContext, ctx: TracingCore) => void;
}

export type handlerOrder = "pre" | "post" | null;

type ObjectHook<T, O = {}> = T | ({ handler: T; order?: handlerOrder } & O);

type MakeAsync<Fn> = Fn extends (this: infer This, ...args: infer Args) => infer Return
  ? (this: This, ...args: Args) => Return | Promise<Return>
  : never;

export type AsyncPluginHooks = "beforeDestroy";

export type SyncPluginHooks = Exclude<keyof FunctionPlugins, AsyncPluginHooks>;
// run as sequential
export type SequentialPluginHooks = "setup" | "init" | "destroy";
// run as parallel
export type ParallelPluginHooks = "beforeDestroy";
// if return then stop
export type BailPluginHooks = "beforeSend" | "send";
// run as merge
export type ChainMergeHooks = Exclude<
  keyof FunctionPlugins,
  SequentialPluginHooks | ParallelPluginHooks | BailPluginHooks
>;

export type PluginHooks = {
  [K in keyof FunctionPlugins]: ObjectHook<
    K extends AsyncPluginHooks ? MakeAsync<FunctionPlugins[K]> : FunctionPlugins[K]
  >;
};

export type TracingPlugin = Partial<PluginHooks> & NormalPlugin;

export function PluginDriver(plugins: TracingPlugin[], options: Partial<TracingCoreConfig>, logger: Logger) {
  const sortedPlugins: Map<keyof FunctionPlugins, TracingPlugin[]> = new Map();
  const pluginContexts: Map<TracingPlugin, PluginContext> = new Map(
    plugins.map(plugin => [plugin, createContext(plugin, options)])
  );

  function destroyPluginDriver() {
    sortedPlugins.clear();
    pluginContexts.clear();
  }

  async function runHook<H extends AsyncPluginHooks>(
    hookName: H,
    args: Parameters<FunctionPlugins[H]>,
    plugin: TracingPlugin
  ): Promise<ReturnType<FunctionPlugins[H]>>;

  async function runHook<H extends AsyncPluginHooks>(hookName: H, args: unknown[], plugin: TracingPlugin) {
    const hook = plugin[hookName]!;

    const handler = typeof hook === "object" ? hook.handler : hook;

    const context = pluginContexts.get(plugin)!;

    return Promise.resolve()
      .then(() => {
        const hookResult = (handler as Function).apply(context, args);

        if (!hookResult?.then) {
          return hookResult;
        }
        return hookResult;
      })
      .catch(err => logger.throwError(err));
  }

  function runHookSync<H extends SyncPluginHooks>(
    hookName: H,
    args: Parameters<FunctionPlugins[H]>,
    plugin: TracingPlugin
  ): ReturnType<FunctionPlugins[H]> {
    const hook = plugin[hookName]!;
    const handler = typeof hook === "object" ? hook.handler : hook;

    const context = pluginContexts.get(plugin)!;

    try {
      return (handler as Function).apply(context, args);
    } catch (err: any) {
      return logger.throwError(err);
    }
  }

  function getSortedValidatePlugins(
    hookName: keyof FunctionPlugins,
    plugins: TracingPlugin[],
    validateHandler = validateFunctionPluginHandler
  ) {
    const pre: TracingPlugin[] = [];
    const normal: TracingPlugin[] = [];
    const post: TracingPlugin[] = [];

    for (const plugin of plugins) {
      const hook = plugin[hookName];
      if (hook) {
        if (typeof hook === "object") {
          validateHandler(hook.handler, hookName, plugin);
          if (hook.order == "pre") {
            pre.push(plugin);
            continue;
          }
          if (hook.order == "post") {
            post.push(plugin);
            continue;
          }
          normal.push(plugin);
        } else {
          validateHandler(hook, hookName, plugin);
          normal.push(plugin);
        }
      }
    }

    return pre.concat(normal, post);
  }

  function validateFunctionPluginHandler(handler: unknown, hookName: string, plugin: TracingPlugin) {
    if (typeof handler !== "function") {
      logger.throwError(
        `Error running plugin hook "${hookName}" for plugin "${plugin.name}", expected a function hook or an object with a "handler" function.`
      );
    }
  }

  function getSortedPlugins(hookName: keyof FunctionPlugins) {
    return getOrCreate(sortedPlugins, hookName, () => getSortedValidatePlugins(hookName, plugins));
  }

  return {
    runHook,
    runHookSync,
    getSortedValidatePlugins,
    destroyPluginDriver,
    async hookParallel<H extends ParallelPluginHooks & AsyncPluginHooks>(
      hookName: H,
      args: Parameters<FunctionPlugins[H]>
    ): Promise<void> {
      const parallelPromises: Promise<unknown>[] = [];

      for (const plugin of getSortedPlugins(hookName)) {
        parallelPromises.push(runHook(hookName, args, plugin));
      }

      await Promise.all(parallelPromises);
    },
    hookSequentialSync<H extends SequentialPluginHooks & SyncPluginHooks>(
      hookName: H,
      args: Parameters<FunctionPlugins[H]>
    ) {
      const effects: AnyFun[] = [];
      for (const plugin of getSortedPlugins(hookName)) {
        const effect = runHookSync(hookName, args, plugin);
        if (effect && typeof effect == "function") {
          effects.push(effect);
        }
      }

      return effects;
    },
    hookBail<H extends BailPluginHooks & SyncPluginHooks>(
      hookName: H,
      args: Parameters<FunctionPlugins[H]>
    ): boolean {
      for (const plugin of getSortedPlugins(hookName)) {
        const result = runHookSync(hookName, args, plugin);
        // 只有在明确返回 false 才会熔断，这个是考虑避免用户写过于复杂判断，没有 return 而导致熔断
        if (result === false) {
          return false;
        }
      }
      return true;
    },
    hookChainMergeSync<H extends ChainMergeHooks & SyncPluginHooks>(
      hookName: H,
      args: Parameters<FunctionPlugins[H]>,
      initialValue: Record<string, any>
    ) {
      let returnValue = initialValue;
      for (const plugin of getSortedPlugins(hookName)) {
        const result = runHookSync(hookName, args, plugin);
        returnValue = mergeConfig(returnValue, result);
      }
      return returnValue;
    }
  };
}

interface ContextMeta {
  version: string;
}

export interface PluginContext {
  logger: Logger;
  meta: ContextMeta;
}

export function createContext(plugin: TracingPlugin, options: Partial<TracingCoreConfig>): PluginContext {
  return {
    logger: createLogger(plugin.name, options),
    meta: {
      version: __VERSION__
    }
  };
}

function getOrCreate<K, V>(plugins: Map<K, V>, key: K, init: () => V): V {
  const existing = plugins.get(key);
  if (existing) {
    return existing;
  }
  const value = init();
  plugins.set(key, value);
  return value;
}

export function mergeConfig(defaults: Record<string, any>, overrides: Record<string, any>) {
  const merged: Record<string, any> = { ...defaults };

  for (const key in overrides) {
    if (!Object.prototype.hasOwnProperty.call(overrides, key)) {
      continue;
    }

    const value = overrides[key];

    if (value == null) {
      continue;
    }

    const existing = merged[key];

    if (existing == null) {
      merged[key] = value;
      continue;
    }

    if (Array.isArray(existing) || Array.isArray(value)) {
      merged[key] = [...toArray(existing ?? []), ...toArray(value ?? [])];
      continue;
    }

    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeConfig(existing, value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function toArray<T>(target: T | T[]) {
  return Array.isArray(target) ? target : [target];
}

function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === "[object Object]";
}
