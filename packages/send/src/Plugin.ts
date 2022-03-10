import type { TrackerPlugin } from "@tracker/core";

import { InitDefSend } from "./SendFactory";

export function SendPlugin(): TrackerPlugin {
  return {
    name: "core:send",
    sort: 100,
    options() {
      return { sendType: "Image" };
    },
    setup(self) {
      const options = self.options;
      const sendType = options.sendType;
      const defSend = new InitDefSend(sendType, options);
      self.registerProperty("send", defSend);
    },
    destroy(self) {
      self.unregisterProperty("send");
    }
  };
}
