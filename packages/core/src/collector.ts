import type { CoreConfig } from "./config";
import type { Store } from "./store";

import { createStore } from "./store";
import { PluginDriver } from "./plugin";
import { createInitConfig } from "./config";
import { createLogger } from "./logger";

export class Collector {
  [key: string]: any;

  private initialized = false;

  private pluginDriver;
  private config: CoreConfig;

  public logger;
  public header!: Store<"header">;

  constructor(config: Partial<CoreConfig>) {
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

  public report(event: string, record: Record<string, any>) {
    if (!this.initialized) {
      __DEV__ && this.logger.warn('"Collector" Not initialized, please execute after initialization');
      return;
    }

    this.pluginDriver.hookSequentialSync("report", [event, record]);

    this.build(event, record);
  }

  private build(event: string, record: Record<string, any>) {
    const build = this.pluginDriver.hookChainMergeSync("build", [event, record], {});

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
  }
}
