import { isBool, type AnyFun } from "@tracing/shared";
import type { TracingCoreConfig } from "./config";
import type { Store } from "./store";

import { createStore } from "./store";
import { PluginDriver } from "./plugin";
import { createInitConfig } from "./config";
import { createLogger } from "./logger";

export class TracingCore {
  private initialized = false;
  private destroyed = false;

  private pluginDriver;
  private config: TracingCoreConfig;
  private effects: AnyFun[] = [];

  public logger;
  public header!: Store<"header">;

  constructor(config: Partial<TracingCoreConfig>) {
    this.config = createInitConfig(config);
    this.logger = createLogger("core", !!this.config.sendLog);

    this.pluginDriver = PluginDriver(this.config.plugins.flat(), this.config, this.logger);

    this.header = createStore("header", {});
  }

  public init() {
    if (this.initialized) {
      __DEV__ && this.logger.warn('"init" has been initialized, please do not call again');
      return;
    }

    this.pluginDriver.hookSequentialSync("init", [this]);

    this.initialized = true;

    this.effects = this.pluginDriver.hookSequentialSync("setup", [this]);
  }

  public report(event: string, record: Record<string, any>, meta?: unknown) {
    if (!this.initialized) {
      __DEV__ && this.logger.warn('"TracingCore" Not initialized, please execute after initialization');
      return;
    }

    if (this.destroyed) {
      __DEV__ && this.logger.warn('"TracingCore" has been destroyed and you can\'t do anything now');
      return;
    }

    this.build(event, record, meta);
  }

  private build(event: string, record: Record<string, any>, meta?: unknown) {
    const build = this.pluginDriver.hookChainMergeSync("build", [event, record, meta], {});

    if (__DEV__ && this.config.sendLog) {
      if (isBool(this.config.sendLog)) {
        console.log(JSON.stringify(build, null, 2));
      } else {
        this.config.sendLog(event, build);
      }
    }

    this.send(event, build);
  }

  private send(event: string, build: Record<string, any>) {
    const isBail = this.pluginDriver.hookBail("beforeSend", [event, build]);
    if (isBail === false) return;

    this.pluginDriver.hookBail("send", [event, build]);
  }

  public async destroy() {
    if (this.destroyed) {
      __DEV__ && this.logger.warn('"TracingCore" has been destroyed. Please do not retry');
      return;
    }

    await this.pluginDriver.hookParallel("beforeDestroy", [this]);

    await Promise.all(this.effects.map(effect => effect()));

    this.pluginDriver.hookSequentialSync("destroy", [this]);

    this.pluginDriver.destroyPluginDriver();

    this.header.clear();
    this.effects.length = 0;

    this.destroyed = true;
  }
}
