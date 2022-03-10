import type { ObjectType } from "./typeUtils";

/**
 * 根据一个 object 返回 url query
 */
export function qs(obj: ObjectType, prefix: string): string {
  const qsArr = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      qsArr.push(`${key}=${obj[key]}`);
    }
  }
  return prefix + qsArr.join("&");
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop() {}

export function omit<T extends ObjectType, K extends keyof T>(origin: T, keys: K[]) {
  const ret: ObjectType = {};
  for (const key in origin) {
    if (Object.prototype.hasOwnProperty.call(origin, key)) {
      if (!keys.includes(key as unknown as K)) {
        ret[key] = origin[key];
      }
    }
  }
  return ret as Omit<T, K>;
}

export function pick<T extends ObjectType, K extends keyof T>(origin: T, keys: K[]) {
  const ret: ObjectType = {};
  for (const key in origin) {
    if (Object.prototype.hasOwnProperty.call(origin, key)) {
      if (keys.includes(key as unknown as K)) {
        ret[key] = origin[key];
      }
    }
  }
  return ret as Pick<T, K>;
}

export function hasOwn(obj: ObjectType, key: keyof any) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
