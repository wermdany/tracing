import type { ObjectType } from "@tracker/shared";
import type { Options } from "./Options";
import type { TrackerPlugin, CreateHooksTypes } from "./Plugin";

import { hasOwn } from "@tracker/shared";
import { OptionsConstructor } from "./Options";
import { createTrackerCoreHooks, isSendHooksError } from "./Plugin";
import { logger } from "./Utils";

export interface TrackerCorePrototype {}

export class TrackerCorePrototype {}

export class TrackerCore extends TrackerCorePrototype {
  public static plugins: TrackerPlugin[] = [];

  public static use(plugin: TrackerPlugin) {
    if (TrackerCore.plugins.includes(plugin) || TrackerCore.plugins.some(item => item.name === plugin.name)) {
      __DEV__ && logger.warn(`You cannot re-register plugin: '${plugin.name}'.`);
      return TrackerCore;
    }
    TrackerCore.plugins.push(plugin);
    TrackerCore.plugins = TrackerCore.plugins.sort((a, b) => a.sort - b.sort);
    return TrackerCore;
  }

  readonly [key: keyof any]: any;

  public options: Options;

  public readonly hooks: CreateHooksTypes;

  constructor(options: Options) {
    super();

    this.hooks = createTrackerCoreHooks(TrackerCore.plugins, options);

    this.options = new OptionsConstructor().merge(this.hooks.createOptionsHooks(options));

    this.hooks.createSetupHooks(this);
  }
  /**
   * @internal
   */
  public async sendReport(event: string, profile: ObjectType) {
    if (this.send && this.send.report) {
      const res = this.hooks.createBeforeSendHooks(event, profile);
      if (isSendHooksError(res)) {
        const { skipAfterHooks = false, returnAs = false, profile: transProfile } = res;
        if (!skipAfterHooks) {
          this.hooks.createAfterSendHooks(event, profile, transProfile, returnAs);
        }
        return Promise.resolve(returnAs);
      }
      const response = await this.send.report(profile);

      this.hooks.createAfterSendHooks(event, profile, res, response);

      return response;
    }

    throw new Error(logger.msg("You have not registered a method to report data."));
  }

  public registerProperty(key: keyof any, value: unknown) {
    if (!hasOwn(this, key)) {
      // @ts-ignore
      this[key] = value;
      return;
    }

    __DEV__ && logger.warn(`You cannot register an existing property: '${String(key)}'`);
  }

  public unregisterProperty(key: keyof any) {
    if (hasOwn(this, key)) {
      // @ts-ignore
      delete this[key];
      return;
    }

    __DEV__ && logger.warn(`Currently no property exists: '${String(key)}'`);
  }

  public destroy() {
    this.hooks.createDestroyHooks(this);
  }
}
