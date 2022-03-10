import type { RemoveIndexSignature, GetInstanceType, GetConstructorParameters } from "@tracker/shared";
import type { Send, BaseSendOptions } from "./types";

import { ImageSend } from "./Image";
import { BeaconSend } from "./Beacon";
import { AjaxSend } from "./Ajax";
import { logger } from "./log";

export interface CustomSendTypes {}

export interface SendTypes extends CustomSendTypes {
  [key: string]: Send;

  Ajax: typeof AjaxSend;
  Image: typeof ImageSend;
  Beacon: typeof BeaconSend;
}

export type SendTypesKeys = keyof RemoveIndexSignature<SendTypes>;

class SendFactory {
  private static sends: Record<string, Send> = {};

  public static registerSend = (send: Send) => {
    if (!(send.type in SendFactory.sends)) {
      SendFactory.sends[send.type] = send;
      return SendFactory;
    }
    if (__DEV__) {
      logger.warn(`You cannot Re-register '${send.type}'`);
    }
    return SendFactory;
  };

  constructor(type: string, options: BaseSendOptions) {
    const CurSend = SendFactory.sends[type];
    if (CurSend && CurSend.validator()) {
      return new CurSend(options);
    }
    if (__DEV__) {
      logger.warn(`You are not registered '${type}', but use 'Image' by now.`);
    }
    return new ImageSend(options);
  }
}

interface InitSendFactory {
  sends: SendTypes;
  registerSend: (send: Send) => InitSendFactory;
  new <T extends SendTypesKeys>(
    type: T,
    options: GetConstructorParameters<SendTypes[T]>["0"]
  ): GetInstanceType<SendTypes[T]>;
}

export const InitSend = SendFactory as unknown as InitSendFactory;

export const InitDefSend = InitSend.registerSend(AjaxSend).registerSend(BeaconSend).registerSend(ImageSend);
