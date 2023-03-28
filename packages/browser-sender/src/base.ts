import { noop, isArr } from "@tracing/shared";

export interface BaseSenderConfig {
  url: string;
  error: ErrorCall;
  success: SuccessCall;
}

export const defineBaseSenderConfig: BaseSenderConfig = {
  url: "",
  error: noop,
  success: noop
};

export type ErrorCall<Code = SenderError, Instance = any> = (
  event: string,
  build: Record<string, any>,
  code: Code,
  instance?: Instance
) => void;

export type SuccessCall = (event: string, build: Record<string, any>) => void;

export type BaseSenderHandle = (
  event: string,
  build: Record<string, any>,
  error: ErrorCall,
  success: SuccessCall
) => void;

export type BaseSenderFactory<T extends Record<string, any>> = (config?: Partial<T>) => BaseSenderHandle;

export enum SenderError {
  TimeOut = 1,
  Network,
  Validator,
  InvalidBuild,
  BeaconQueue
}

export const validatorBuild = (build: any) => !build || typeof build != "object";

export type Ignore<T = string> = T[] | ((event: T) => boolean);

export const parseIgnore = <T = string>(ignore: Ignore<T>) =>
  isArr(ignore) ? (event: T) => ignore.includes(event) : ignore;
