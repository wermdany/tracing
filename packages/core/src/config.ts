import type { CollectPlugin } from "./plugin";
import type { LoggerConfig } from "./logger";

export interface CoreConfig extends LoggerConfig {
  plugins: Array<CollectPlugin | CollectPlugin[]>;
  sendLog: boolean;
}

export const initConfig: CoreConfig = {
  isLogger: __DEV__,
  sendLog: __DEV__,
  plugins: []
};

export function createInitConfig(inputConfig?: Partial<CoreConfig>): CoreConfig {
  return Object.assign({}, initConfig, inputConfig);
}
