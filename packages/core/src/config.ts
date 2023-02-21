import type { TracingPlugin } from "./plugin";
import type { LoggerConfig } from "./logger";

export interface TracingCoreConfig extends LoggerConfig {
  plugins: Array<TracingPlugin | TracingPlugin[]>;
  sendLog: boolean;
}

export const initConfig: TracingCoreConfig = {
  isLogger: __DEV__,
  sendLog: __DEV__,
  plugins: []
};

export function createInitConfig(inputConfig?: Partial<TracingCoreConfig>): TracingCoreConfig {
  return { ...initConfig, ...inputConfig };
}
