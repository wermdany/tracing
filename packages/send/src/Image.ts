import type { ObjectType } from "@tracker/shared";
import type { BaseSendImplement, BaseSendOptions } from "./types";

import { qs } from "@tracker/shared";

export type CrossOriginType = "anonymous" | "use-credentials";

export interface ImageSendOptions extends BaseSendOptions {
  /** ImageSend crossOrigin @default undefined */
  imageSendCrossOrigin?: CrossOriginType;
}

const ImageSendDefOptions = {
  sendTimeout: 500
};

export class ImageSend implements BaseSendImplement {
  public static type = "Image";
  public static validator = () => true;

  private target: HTMLImageElement;
  private options: ImageSendOptions;
  private timer: number | null = null;
  constructor(options: ImageSendOptions) {
    this.options = Object.assign({}, ImageSendDefOptions, options);
    this.target = this.initTarget();
  }

  private initTarget() {
    const target = document.createElement("img");
    if (this.options.imageSendCrossOrigin) {
      target.crossOrigin = this.options.imageSendCrossOrigin;
    }

    target.width = 1;
    target.height = 1;

    return target;
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private resetTarget() {
    this.clearTimer();
    this.target.onabort = null;
    this.target.onerror = null;
    this.target.onload = null;
    this.target.src = "";
  }

  private targetSend(profile: ObjectType): Promise<boolean> {
    return new Promise(resolve => {
      this.target.onabort = () => {
        this.resetTarget();
        resolve(false);
      };
      this.target.onerror = () => {
        this.resetTarget();
        resolve(false);
      };
      this.target.onload = () => {
        this.resetTarget();
        resolve(true);
      };

      this.timer = setTimeout(() => {
        this.resetTarget();
      }, this.options.sendTimeout);

      this.target.src = this.options.url + qs(profile, "?");
    });
  }

  public report(profile: ObjectType) {
    return this.targetSend(profile);
  }
}
