import type { NormalSendPluginConfig } from "./NormalSendPlugin";
import { NormalSendPlugin } from "./NormalSendPlugin";

import { NormalBuildPlugin } from "./NormalBuildPlugin";

export interface NormalPluginConfig extends NormalSendPluginConfig {}

export function createNormalPlugin(config: Partial<NormalPluginConfig>) {
  return [NormalSendPlugin(config), NormalBuildPlugin()];
}
