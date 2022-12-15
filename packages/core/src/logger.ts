export interface LoggerConfig {
  isLogger: boolean;
}

export interface Logger {
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
  throwError: (base: Error | string) => never;
}

export function createLogger<N extends string>(name: N, options?: Partial<LoggerConfig>): Logger {
  const { isLogger = true } = options || {};

  const bold = (msg: string) => {
    return ["%c" + msg, "font-weight:bold;"];
  };

  const genPrefix = () => {
    const prefixString = name ? "[".concat(__NAME__, "/", name, "]") : "[".concat(__NAME__, "]");
    return bold(prefixString);
  };

  return {
    warn(...args: any[]) {
      isLogger && console.warn(...genPrefix(), ...args);
    },
    info(...args: any[]) {
      isLogger && console.info(...genPrefix(), ...args);
    },
    error(...args: any[]) {
      isLogger && console.error(...genPrefix(), ...args);
    },
    throwError(base: Error | string): never {
      if (!(base instanceof Error)) {
        base = new Error(base);
        Object.defineProperty(base, "name", {
          value: "".concat(titleToUpperCase(__NAME__), titleToUpperCase(name), "Error")
        });
      }
      throw base;
    }
  };
}

function titleToUpperCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
