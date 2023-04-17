import { isRegexp } from "./is";
import type { Choice } from "./typeUtils";

/**
 * 根据一个 object 返回 url query
 */
export function qs(obj: Record<string, any>, prefix?: string): string {
  const qsArr = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      qsArr.push(`${key}=${obj[key]}`);
    }
  }
  return (prefix || "") + qsArr.join("&");
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop() {}

export function omit<T extends Record<string, any>, K extends keyof T>(origin: T, keys: K[]) {
  const ret: Record<string, any> = {};
  for (const key in origin) {
    if (Object.prototype.hasOwnProperty.call(origin, key)) {
      if (!keys.includes(key as unknown as K)) {
        ret[key] = origin[key];
      }
    }
  }
  return ret as Omit<T, K>;
}

export function pick<T extends Record<string, any>, K extends keyof T>(origin: T, keys: K[]) {
  const ret: Record<string, any> = {};
  for (const key in origin) {
    if (Object.prototype.hasOwnProperty.call(origin, key)) {
      if (keys.includes(key as unknown as K)) {
        ret[key] = origin[key];
      }
    }
  }
  return ret as Pick<T, K>;
}

export function hasOwn<T extends Record<string, any>>(obj: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * 转化参数，如果是函数就会执行
 *
 * @param origin - 原始数据
 *
 */
export function transProfile<T extends Record<string, any>>(origin: T): Record<string, any> {
  const finish = { ...origin };
  for (const key in finish) {
    if (typeof finish[key] === "function") {
      finish[key] = finish[key].call();
    }
  }
  return finish;
}

export function choice<T extends string>(type: Choice<T>): (arg: T) => boolean {
  if (typeof type == "function") {
    return type;
  }

  if (isRegexp(type)) {
    return (arg: T) => type.test(arg);
  }

  return (arg: T) => type.includes(arg);
}

export function pickParse<T extends Record<string, any>, K extends keyof T & string>(
  obj: T,
  keys: K[],
  parse: (arg: T[K]) => T[K],
  omit: K[] = []
) {
  const finish: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && !omit.includes(key as unknown as K)) {
      if (keys.includes(key as unknown as K)) {
        finish[key] = parse(obj[key as unknown as K]);
      } else {
        finish[key] = obj[key];
      }
    }
  }
  return finish as T;
}

export function formatNumber(number: number, precision = 0) {
  const weight = 10 ** precision;
  return Math.floor(number * weight) / weight;
}
