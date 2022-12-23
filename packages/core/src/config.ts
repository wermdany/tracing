import type { TrackerPlugin } from "./plugin";
import type { LoggerConfig } from "./logger";

export interface TrackerCoreConfig extends LoggerConfig {
  plugins: Array<TrackerPlugin | TrackerPlugin[]>;
  sendLog: boolean;
}

export const initConfig: TrackerCoreConfig = {
  isLogger: __DEV__,
  sendLog: __DEV__,
  plugins: []
};

export function createInitConfig(inputConfig?: Partial<TrackerCoreConfig>): TrackerCoreConfig {
  return { ...initConfig, ...inputConfig };
}
