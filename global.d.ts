declare const __DEV__: boolean;
declare const __VERSION__: string;
declare const __NAME__: string;
declare const __TEST__: boolean;
declare const __ESM_BUNDLER__: boolean;
declare const __ESM_BROWSER__: boolean;
declare const __GLOBAL_BUILD__: boolean;

/**
 * jest add console test match
 */
declare namespace jest {
  interface Matchers<R> {
    toHaveConsoleInfo(module: string, received: string): R;
    toHaveConsoleWarn(module: string, received: string): R;
    toHaveConsoleError(module: string, received: string): R;
  }
}

// in tsconfig.json not install node context but api need use node global
// eslint-disable-next-line no-var
declare var global: typeof globalThis;

// add api to Window
declare interface Window {
  msCrypto: Crypto;
}
