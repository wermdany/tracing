/**
 * api-extractor do not export declare module
 * we will search this file and auto add them to the end of the type file
 */

import type { ObjectType } from "@tracker/shared";

import type { AjaxSendOptions, AjaxSend } from "./Ajax";
import type { BeaconSendOptions, BeaconSend } from "./Beacon";
import type { ImageSendOptions, ImageSend } from "./Image";
import type { SendTypesKeys } from "./SendFactory";

declare module "@tracker/core" {
  interface CustomOptions extends AjaxSendOptions, BeaconSendOptions, ImageSendOptions {
    sendType: SendTypesKeys;
  }
  interface TrackerCorePrototype {
    readonly send: ImageSend | BeaconSend | AjaxSend;
    readonly track: (event: string, profile?: ObjectType, options?: any) => Promise<boolean>;
  }
}
