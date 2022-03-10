import type { ObjectType } from "@tracker/shared";
import type { TrackerCore } from "./Core";
import type { Options, InitializeOptions } from "./Options";

import { isFn, isObj, isBool, isArr } from "@tracker/shared";
import { logger } from "./Utils";

export const hooks = ["options", "setup", "beforeSend", "afterSend", "destroy"] as const;

export interface TrackerPlugin {
  /**
   * plugins name
   */
  name: string;
  /**
   * execution order of plugins
   */
  sort: number;
  /**
   * 实例化后在没有进行任何操作时触发，你可以在这里对初始配置项进行覆盖和重写
   */
  options?: (options: Options) => Partial<Options> | null | void;
  /**
   * 启动插件，做初始化操作
   */
  setup?: (self: TrackerCore) => void;
  /**
   * 发送上报数据前，可做拦截和修改
   */
  beforeSend?: (
    profile: ObjectType,
    event: string,
    module: string,
    e: typeof BeforeSendHooksError
  ) => ObjectType | BeforeSendHooksError;
  /**
   *发送上报数据后，可做日志，或者失败重发，当然也可以修改原始数据
   */
  afterSend?: (event: string, origin: ObjectType, trans: ObjectType, result: boolean) => void;

  /** side effects will be removed in reverse order */
  destroy?: (self: TrackerCore) => void;
}

interface BeforeSendHooksError {
  plugin: string;
  skipAfterHooks: boolean;
  returnAs: boolean;
  profile: ObjectType;
}

class BeforeSendHooksError {
  constructor(options: Omit<BeforeSendHooksError, "plugin" | "profile">) {
    this.returnAs = options.returnAs;
    this.skipAfterHooks = options.skipAfterHooks;
  }
}

export function isSendHooksError(val: ObjectType): val is BeforeSendHooksError {
  return val instanceof BeforeSendHooksError;
}

export type PluginHooks = Omit<TrackerPlugin, "name" | "sort">;

export type CreateHooksTypes = ReturnType<typeof createTrackerCoreHooks>;

export function createTrackerCoreHooks(plugins: TrackerPlugin[], initializeOps: InitializeOptions) {
  const isDebug = (hooks: keyof PluginHooks) => {
    const debug = initializeOps.debug;

    if (isBool(debug)) {
      return debug;
    }
    if (isArr(debug)) {
      return debug.includes(hooks);
    }

    return !!debug;
  };

  // filter available hooks
  const createUseHooks = (hook: keyof PluginHooks, plugins: TrackerPlugin[]): TrackerPlugin[] => {
    if (!hooks.includes(hook)) {
      __DEV__ && logger.warn("unknown hooks:", hook);
      return [];
    }
    return plugins.reduce((pre, cur) => {
      if (cur && cur[hook] && isFn(cur[hook])) {
        return pre.concat(cur);
      }
      return pre;
    }, [] as TrackerPlugin[]);
  };

  const createOptionsHooks = (initOptions: Options) => {
    let options = Object.assign({}, initOptions);

    const optionsHooks = createUseHooks("options", plugins);

    for (const plugin of optionsHooks) {
      const res = plugin.options!(options);
      if (!res) {
        __DEV__ &&
          isDebug("options") &&
          logger.debug("hooks:options =>", plugin.name, "skip", "not modified");
        continue;
      } else {
        __DEV__ &&
          isDebug("options") &&
          logger.debug(
            "hooks:options",
            "=>",
            plugin.name,
            "before",
            options,
            "after",
            Object.assign({}, options, res)
          );

        options = Object.assign({}, options, res);
      }
    }
    return options;
  };

  const createSetupHooks = (self: TrackerCore) => {
    const setupHooks = createUseHooks("setup", plugins);
    for (const plugin of setupHooks) {
      __DEV__ && isDebug("setup") && logger.debug("hooks:setup", "=>", plugin.name, "setup");
      plugin.setup!(self);
    }
  };

  const createBeforeSendHooks = (event: string, profile: ObjectType): ObjectType | BeforeSendHooksError => {
    const beforeSendHooks = createUseHooks("beforeSend", plugins);

    let transProfile: ObjectType = profile;

    for (const plugin of beforeSendHooks) {
      const fun = plugin.beforeSend!;
      const ret = fun(profile, event, plugin.name, BeforeSendHooksError);
      if (ret instanceof BeforeSendHooksError) {
        __DEV__ &&
          isDebug("beforeSend") &&
          logger.debug("hooks:beforeSend", "=>", plugin.name, "BeforeSendHooksError", ret);
        ret.profile = transProfile;
        ret.plugin = plugin.name;
        return ret;
      }
      if (!ret) {
        __DEV__ &&
          isDebug("beforeSend") &&
          logger.debug("hooks:beforeSend", "=>", plugin.name, "skip", "not modified");
        continue;
      }
      if (isObj(ret)) {
        __DEV__ &&
          isDebug("beforeSend") &&
          logger.debug("hooks:beforeSend", "=>", plugin.name, "before", transProfile, "after", ret);
        transProfile = ret;
      }
    }

    return transProfile;
  };

  const createAfterSendHooks = (event: string, origin: ObjectType, trans: Object, result: boolean) => {
    const afterSendHooks = createUseHooks("afterSend", plugins);

    for (const plugin of afterSendHooks) {
      const fun = plugin.afterSend;
      __DEV__ &&
        isDebug("afterSend") &&
        logger.debug("hooks:afterSend", "=>", plugin.name, event, origin, trans, result);
      fun!(event, origin, trans, result);
    }
  };

  const createDestroyHooks = (self: TrackerCore) => {
    const destroyHooks = createUseHooks("destroy", plugins);
    // side effects will be removed in reverse order
    for (const plugin of destroyHooks.reverse()) {
      __DEV__ && isDebug("destroy") && logger.debug("hooks:destroy", "=>", plugin.name, "destroy");
      plugin.destroy!(self);
    }
  };

  return {
    createOptionsHooks,
    createSetupHooks,
    createBeforeSendHooks,
    createAfterSendHooks,
    createDestroyHooks
  };
}
