import type { NormalSendPluginConfig } from "./NormalSendPlugin";
import { NormalSendPlugin } from "./NormalSendPlugin";
import type { NormalBuildPluginConfig } from "./NormalBuildPlugin";

import { NormalBuildPlugin } from "./NormalBuildPlugin";

export interface NormalPluginConfig extends NormalSendPluginConfig, NormalBuildPluginConfig {}

export function createNormalPlugin(config: Partial<NormalPluginConfig>) {
  return [NormalSendPlugin(config), NormalBuildPlugin(config)];
}
