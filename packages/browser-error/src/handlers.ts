import type { TracingCore } from "@tracing/core";
import { isElement, getElementTagName, getUrl } from "@tracing/shared";

import type { BrowserErrorConfig } from "./browser-error";
import { BrowserErrorEvent } from "./browser-error";
import type { StackFrame, CauseFrame } from "./stack";
import { parseStack, parseCauseChain, createStackFromErrorEvent } from "./stack";

export type ErrorSource = "uncaught_error" | "unhandled_rejection" | "resource_error" | "console_error";

export interface ErrorReportData {
  source: ErrorSource;
  type: string;
  message: string;
  stack: string;
  frames: StackFrame[];
  causes: CauseFrame[];
  reasonType: string;
  reasonValue: string;
  resource: {
    tagName: string;
    src: string;
    outerHTML: string;
  };
}

function matchPatterns(value: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some(pattern => {
    if (typeof pattern === "string") {
      return value.includes(pattern);
    }
    return pattern.test(value);
  });
}

function getTopFrameFilename(frames: { filename: string }[]): string {
  for (const frame of frames) {
    if (frame.filename) return frame.filename;
  }
  return "";
}

function shouldFilter(data: ErrorReportData, config: BrowserErrorConfig): boolean {
  if (config.ignoreErrors.length > 0 && matchPatterns(data.message || data.type || "", config.ignoreErrors)) {
    return true;
  }

  if (config.denyUrls.length > 0 || config.allowUrls.length > 0) {
    const topUrl = getTopFrameFilename(data.frames) || getUrl();

    if (config.denyUrls.length > 0 && matchPatterns(topUrl, config.denyUrls)) {
      return true;
    }

    if (config.allowUrls.length > 0 && !matchPatterns(topUrl, config.allowUrls)) {
      return true;
    }
  }

  return false;
}

function buildReportData(
  source: ErrorSource,
  extra: {
    type?: string;
    message?: string;
    stack?: string;
    frames?: StackFrame[];
    causes?: CauseFrame[];
    reasonType?: string;
    reasonValue?: string;
    resource?: { tagName: string; src: string; outerHTML: string };
  }
): ErrorReportData {
  return {
    source,
    type: extra.type || "Error",
    message: extra.message || "",
    stack: extra.stack || "",
    frames: extra.frames || [],
    causes: extra.causes || [],
    reasonType: extra.reasonType || "",
    reasonValue: extra.reasonValue || "",
    resource: extra.resource || { tagName: "", src: "", outerHTML: "" }
  };
}

function normalizeReason(reason: unknown): {
  type: string;
  message: string;
  error: Error | null;
} {
  if (reason instanceof Error) {
    return {
      type: "error",
      message: reason.message,
      error: reason
    };
  }

  if (typeof reason === "string") {
    return {
      type: "string",
      message: reason,
      error: null
    };
  }

  if (reason === null || reason === undefined) {
    return {
      type: typeof reason === "undefined" ? "undefined" : "null",
      message: "Promise rejected with no reason",
      error: null
    };
  }

  if (typeof reason === "number" || typeof reason === "boolean") {
    return {
      type: typeof reason,
      message: String(reason),
      error: null
    };
  }

  try {
    return {
      type: "object",
      message: JSON.stringify(reason),
      error: null
    };
  } catch {
    return {
      type: "object",
      message: String(reason),
      error: null
    };
  }
}

export function createOnerrorHandler(core: TracingCore, config: BrowserErrorConfig): { cleanup: () => void } {
  const handler = (event: Event) => {
    if (!(event instanceof ErrorEvent)) return;

    const errorEvent = event as ErrorEvent;
    const error = errorEvent.error as Error | null;
    const message = errorEvent.message;
    const filename = errorEvent.filename || "unknown";
    const lineno = errorEvent.lineno || 0;
    const colno = errorEvent.colno || 0;

    let type = "Error";
    let stack = "";
    let frames: StackFrame[] = [];
    let causes: CauseFrame[] = [];

    if (error instanceof Error) {
      type = error.name;
      stack = error.stack || "";
      frames = parseStack(stack, config.stackTraceLimit);
      causes = parseCauseChain(error, config.linkedErrorsLimit);
    } else {
      stack = createStackFromErrorEvent(message, filename, lineno, colno);
      frames = parseStack(stack, config.stackTraceLimit);
    }

    const data = buildReportData("uncaught_error", { type, message, stack, frames, causes });

    if (shouldFilter(data, config)) return;

    core.report(BrowserErrorEvent, data);
  };

  window.addEventListener("error", handler);

  return {
    cleanup: () => {
      window.removeEventListener("error", handler);
    }
  };
}

export function createUnhandledRejectionHandler(
  core: TracingCore,
  config: BrowserErrorConfig
): { cleanup: () => void } {
  const handler = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const normalized = normalizeReason(reason);

    const message = normalized.message;
    const error = normalized.error;

    let type = "UnhandledRejection";
    let stack = "";
    let frames: StackFrame[] = [];
    let causes: CauseFrame[] = [];

    if (error) {
      type = error.name;
      stack = error.stack || "";
      frames = parseStack(stack, config.stackTraceLimit);
      causes = parseCauseChain(error, config.linkedErrorsLimit);
    } else {
      const syntheticError = new Error();
      stack = syntheticError.stack || "";
      frames = parseStack(stack, config.stackTraceLimit);
    }

    const data = buildReportData("unhandled_rejection", {
      type,
      message,
      stack,
      frames,
      causes,
      reasonType: normalized.type,
      reasonValue: message
    });

    if (shouldFilter(data, config)) return;

    core.report(BrowserErrorEvent, data);
  };

  window.addEventListener("unhandledrejection", handler);

  return {
    cleanup: () => {
      window.removeEventListener("unhandledrejection", handler);
    }
  };
}

export function createResourceErrorHandler(
  core: TracingCore,
  config: BrowserErrorConfig
): { cleanup: () => void } {
  const handler = (event: Event) => {
    if (event instanceof ErrorEvent) return;

    const target = event.target;
    if (!target || !isElement(target)) return;

    const el = target as HTMLElement;
    const tagName = getElementTagName(el).toLowerCase();

    if (!config.resourceWatchTags.includes(tagName)) return;

    const src =
      (el as HTMLImageElement).src ||
      (el as HTMLScriptElement).src ||
      (el as HTMLLinkElement).href ||
      (el as HTMLVideoElement).src ||
      (el as HTMLAudioElement).src ||
      (el as HTMLIFrameElement).src ||
      "";

    const outerHTML = el.outerHTML || "";

    const data = buildReportData("resource_error", {
      type: "ResourceError",
      message: `Failed to load resource: ${src || tagName}`,
      resource: { tagName, src, outerHTML }
    });

    if (shouldFilter(data, config)) return;

    core.report(BrowserErrorEvent, data);
  };

  window.addEventListener("error", handler, true);

  return {
    cleanup: () => {
      window.removeEventListener("error", handler, true);
    }
  };
}

export function createConsoleErrorHandler(
  core: TracingCore,
  config: BrowserErrorConfig
): { cleanup: () => void } {
  const originalConsoleError = console.error;

  const handler = (...args: unknown[]) => {
    originalConsoleError.apply(console, args);

    const firstArg = args[0];

    let message = "";
    let type = "ConsoleError";
    let stack = "";
    let frames: StackFrame[] = [];
    let causes: CauseFrame[] = [];

    if (firstArg instanceof Error) {
      type = firstArg.name;
      message = firstArg.message;
      stack = firstArg.stack || "";
      frames = parseStack(stack, config.stackTraceLimit);
      causes = parseCauseChain(firstArg, config.linkedErrorsLimit);
    } else {
      try {
        message =
          args.length === 1
            ? typeof firstArg === "string"
              ? firstArg
              : JSON.stringify(firstArg)
            : args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      } catch {
        message = String(firstArg);
      }

      const syntheticError = new Error();
      stack = syntheticError.stack || "";
      frames = parseStack(stack, config.stackTraceLimit);
    }

    const data = buildReportData("console_error", { type, message, stack, frames, causes });

    if (shouldFilter(data, config)) return;

    core.report(BrowserErrorEvent, data);
  };

  console.error = handler as (...args: unknown[]) => void;

  return {
    cleanup: () => {
      console.error = originalConsoleError;
    }
  };
}
