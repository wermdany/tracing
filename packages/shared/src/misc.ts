let _globalThis: any;

const _funThis = (function (this: any) {
  return this;
})();

export function getGlobalThis<T = Window>() {
  return (_globalThis ||
    (_globalThis =
      typeof globalThis !== "undefined"
        ? globalThis
        : typeof self !== "undefined"
        ? self
        : typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
        ? global
        : typeof _funThis !== "undefined"
        ? _funThis
        : {})) as T;
}

export function isBrowser() {
  return typeof window !== "undefined";
}

/**
 * UUID4 generator
 *
 * @returns string Generated UUID4.
 */
export function uuid4(): string {
  const crypto = window.crypto || window.msCrypto;

  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const getRandomByte =
    crypto && crypto.getRandomValues
      ? () => crypto.getRandomValues(new Uint8Array(1))[0]
      : () => Math.random() * 16;

  // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
  // Concatenating the following numbers as strings results in '10000000100040008000100000000000'
  return (([1e7] as unknown as string) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    // eslint-disable-next-line no-bitwise
    ((c as unknown as number) ^ ((getRandomByte() & 15) >> ((c as unknown as number) / 4))).toString(16)
  );
}

/**
 * if you not know property return this (reduce build size)
 */
export const unknown = "?";
