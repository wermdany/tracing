const toString = Object.prototype.toString;

export const isType =
  <T>(type: string | string[]) =>
  (obj: unknown): obj is T =>
    getType(obj) === `[object ${type}]`;

export const getType = (obj: any) => toString.call(obj);

export const isFn = (val: any): val is Function => typeof val === "function";

export const isArr = Array.isArray;

export const isPlainObj = isType<object>("Object");

export const isStr = isType<string>("String");

export const isBool = isType<boolean>("Boolean");

export const isNum = isType<number>("Number");

export const isRegexp = isType<RegExp>("RegExp");

export const isUndefined = isType<undefined>("Undefined");

export const isDate = isType<Date>("Date");

export const isObj = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === "object";

export function isElement(value: unknown): value is Element {
  return isObj(value) && value.nodeType === 1 && !isPlainObj(value);
}
