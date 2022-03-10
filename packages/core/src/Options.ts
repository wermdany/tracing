import type { PluginHooks } from "./Plugin";

export interface InitializeOptions {
  [key: string]: any;

  privacy?: boolean;

  debug?: boolean | Array<keyof PluginHooks>;
}

export interface CustomOptions {}

export class CustomOptions {}

export interface Options extends InitializeOptions, CustomOptions {}

export class OptionsConstructor extends CustomOptions implements InitializeOptions {
  [key: string]: any;

  privacy?: boolean;

  debug?: boolean | Array<keyof PluginHooks>;

  constructor() {
    super();

    this.privacy = false;

    this.debug = false;
  }

  public merge(options?: Options) {
    if (!options) return this;
    for (const key in options) {
      this[key] = options[key];
    }
    return this;
  }
}
