import type { TracingPlugin } from "./plugin";

export interface TracingCoreConfig {
  plugins: Array<TracingPlugin | TracingPlugin[]>;
  sendLog: boolean | ((event: string, build: Record<string, any>) => void);
}

export const initConfig: TracingCoreConfig = {
  sendLog: __DEV__,
  plugins: []
};

export function createInitConfig(inputConfig?: Partial<TracingCoreConfig>): TracingCoreConfig {
  return { ...initConfig, ...inputConfig };
}
