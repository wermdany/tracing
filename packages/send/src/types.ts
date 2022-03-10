import type { ObjectType } from "@tracker/shared";

export interface BaseSendOptions {
  /** Send Common */
  url: string;
  /** Send Common timeOut @default 500ms */
  sendTimeout?: number;
}

export interface BaseSendImplement {
  report: (profile: ObjectType, options?: ObjectType) => Promise<boolean>;
}

export interface Send {
  new (options: BaseSendOptions): BaseSendImplement;
  type: string;
  validator: () => boolean;
}
