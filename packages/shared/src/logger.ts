export interface Logger {
  bold(msg: string): string;
  info(...args: any[]): void;
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  debug(...args: any[]): void;
  msg(...args: string[]): string;
}

type LogType = "info" | "warn" | "error";

export interface LoggerOptions {
  prefix: string;
}

interface MethodsOptions {
  prefix?: string;
  type?: LogType;
}

export function createLogger(module?: string, options: Partial<LoggerOptions> = {}): Logger {
  const { prefix = "@tracker" } = options;

  const bold = (word: string) => {
    return `\x1b[1m${word}\x1b[22m`;
  };

  const pre = module ? bold(`[${prefix}/${module}] `) : bold(`[${prefix}] `);

  const methods = (options: MethodsOptions, ...args: string[]) => {
    const { type, prefix = pre } = options;
    if (!type) {
      return [prefix].concat(args).join(" ");
    }
    console[type](prefix, ...args);
  };

  const logger: Logger = {
    bold,
    log(...args) {
      methods({ type: "info" }, ...args);
    },
    info(...args) {
      methods({ type: "info" }, ...args);
    },
    warn(...args) {
      methods({ type: "warn" }, ...args);
    },
    error(...args) {
      methods({ type: "error" }, ...args);
    },
    debug(...args) {
      const debug = "\x1B[45m\x1B[97m DEBUG \x1B[39m\x1B[49m";
      methods({ type: "info", prefix: debug }, ...args);
    },
    msg(...args) {
      return methods({}, ...args)!;
    }
  };

  return logger;
}
