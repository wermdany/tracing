import type { ObjectType } from "@tracker/shared";
import type { BaseSendImplement, BaseSendOptions } from "./types";

import { logger } from "./log";

export interface BeaconSendOptions extends Omit<BaseSendOptions, "sendTimeout"> {}

export class BeaconSend implements BaseSendImplement {
  public static type = "Beacon";
  public static validator = () => {
    const isHasBeaconApi = navigator && "sendBeacon" in navigator;
    if (__DEV__) {
      !isHasBeaconApi && logger.warn("Your browser does not support 'Beacon Api'");
    }
    return isHasBeaconApi;
  };

  private options: BeaconSendOptions;

  constructor(options: BeaconSendOptions) {
    this.options = options;
  }

  private beaconSend(profile: ObjectType): Promise<boolean> {
    return new Promise(resolve => {
      const p = navigator.sendBeacon(this.options.url, JSON.stringify(profile));
      resolve(p);
    });
  }

  public report(profile: ObjectType) {
    return this.beaconSend(profile);
  }
}
