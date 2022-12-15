import { isStr, isNum, isDate } from "./is";

export type BaseStorageOptions = "localStorage" | "sessionStorage";

export class BaseStorage<T> {
  private name: string;
  private s: globalThis.Storage;
  constructor(name: string, type: BaseStorageOptions) {
    this.name = name;
    this.s = window[type];
  }

  get(): T | null {
    const value = this.s.getItem(this.name)!;
    try {
      const parsed = JSON.parse(value);
      return parsed;
    } catch (e) {
      return null;
    }
  }

  set(value: T): boolean {
    try {
      this.s.setItem(this.name, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  clear() {
    this.s.removeItem(this.name);
  }
}

export function createLocalStorage<T>(name: string) {
  return new BaseStorage<T>(name, "localStorage");
}

export function createSessionStorage<T>(name: string) {
  return new BaseStorage<T>(name, "sessionStorage");
}
export interface CookieOptions {
  path: string;
  domain: string;
  expires: string | number | Date;
  secure: boolean;
}

export function createCookie<T>(name: string, options: Partial<CookieOptions> = {}) {
  const { path, domain, expires, secure } = options;

  const genExpires = () => {
    if (!expires) return "";

    if (isNum(expires)) {
      if (expires === Infinity) {
        return "; expires=Fri, 31 Dec 9999 23:59:59 GMT";
      } else {
        return "; max-age=" + expires;
      }
    }

    if (isStr(expires)) {
      return "; expires=" + expires;
    }

    if (isDate(expires)) {
      return "; expires=" + expires.toUTCString();
    }
  };

  return {
    get(): T | null {
      const value = decodeURIComponent(
        document.cookie.replace(
          new RegExp(
            "(?:(?:^|.*;)\\s*" +
              encodeURIComponent(name).replace(/[-.+*]/g, "\\$&") +
              "\\s*\\=\\s*([^;]*).*$)|^.*$"
          ),
          "$1"
        )
      );

      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    },
    set(value: T): boolean {
      if (/^(?:expires|max-age|path|domain|secure)$/i.test(name)) {
        return false;
      }
      document.cookie =
        encodeURIComponent(name) +
        "=" +
        encodeURIComponent(JSON.stringify(value)) +
        genExpires() +
        (domain ? "; domain=" + domain : "") +
        (path ? "; path=" + path : "") +
        (secure ? "; secure" : "");
      return true;
    },
    clear() {
      document.cookie =
        encodeURIComponent(name) +
        "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" +
        (domain ? "; domain=" + domain : "") +
        (path ? "; path=" + path : "");
    }
  };
}
