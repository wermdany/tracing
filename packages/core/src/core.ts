import type { TracingCoreConfig } from "./config";
import type { Store } from "./store";

import { createStore } from "./store";
import { PluginDriver } from "./plugin";
import { createInitConfig } from "./config";
import { createLogger } from "./logger";

export class TracingCore {
  [key: string]: any;

  private initialized = false;
  private destroyed = false;

  private pluginDriver;
  private config: TracingCoreConfig;

  public logger;
  public header!: Store<"header">;

  constructor(config: Partial<TracingCoreConfig>) {
    this.config = createInitConfig(config);
    this.logger = createLogger("core", this.config);

    this.pluginDriver = PluginDriver(this.config.plugins.flat(), this.config, this.logger);

    this.pluginDriver.hookSequentialSync("setup", [this.config]);
  }

  public init() {
    if (this.initialized) {
      __DEV__ && this.logger.warn('"init" has been initialized, please do not call again');
      return;
    }

    this.header = createStore("header", {});

    this.initialized = true;
    this.pluginDriver.hookSequentialSync("init", [this]);
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

    this.send(event, build);
  }

  private send(event: string, build: Record<string, any>) {
    const isBail = this.pluginDriver.hookBail("beforeSend", [event, build]);
    if (isBail === false) return;

    if (__DEV__ && this.config.isLogger && this.config.sendLog) {
      console.log(JSON.stringify(build, null, 2));
    }

    this.pluginDriver.hookBail("send", [event, build]);
  }

  public async destroy() {
    await this.pluginDriver.hookParallel("beforeDestroy", [this]);
    this.pluginDriver.hookSequentialSync("destroy", [this]);

    this.header.clear();

    this.destroyed = true;
  }
}
