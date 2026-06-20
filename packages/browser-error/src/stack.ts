export interface StackFrame {
  filename: string;
  function: string;
  lineno: number;
  colno: number;
}

export interface CauseFrame {
  name: string;
  message: string;
  stack: string;
}

const CHROME_NAMED_RE = /at\s+([^(]+)\s+\((.+):(\d+):(\d+)\)$/gm;
const CHROME_ANON_RE = /at\s+(.+):(\d+):(\d+)$/gm;
const FIREFOX_LINE_RE = /^(.*)@(.*):(\d+):(\d+)$/gm;

export function parseStack(stack: string, limit = 10): StackFrame[] {
  if (!stack) return [];

  const frames: StackFrame[] = [];

  CHROME_NAMED_RE.lastIndex = 0;
  CHROME_ANON_RE.lastIndex = 0;
  FIREFOX_LINE_RE.lastIndex = 0;

  let match: RegExpExecArray | null;

  while ((match = CHROME_NAMED_RE.exec(stack)) !== null && frames.length < limit) {
    frames.push({
      function: (match[1] || "anonymous").trim(),
      filename: match[2] || "",
      lineno: Number(match[3]) || 0,
      colno: Number(match[4]) || 0
    });
  }

  if (frames.length === 0) {
    while ((match = CHROME_ANON_RE.exec(stack)) !== null && frames.length < limit) {
      frames.push({
        function: "anonymous",
        filename: match[1] || "",
        lineno: Number(match[2]) || 0,
        colno: Number(match[3]) || 0
      });
    }
  }

  if (frames.length === 0) {
    while ((match = FIREFOX_LINE_RE.exec(stack)) !== null && frames.length < limit) {
      frames.push({
        function: (match[1] || "anonymous").trim(),
        filename: match[2] || "",
        lineno: Number(match[3]) || 0,
        colno: Number(match[4]) || 0
      });
    }
  }

  return frames;
}

export function parseCauseChain(error: Error, limit = 5): CauseFrame[] {
  const causes: CauseFrame[] = [];
  let current: unknown = (error as any).cause;

  while (current && causes.length < limit) {
    if (current instanceof Error) {
      causes.push({
        name: current.name,
        message: current.message,
        stack: current.stack || ""
      });
      current = (current as any).cause;
    } else {
      try {
        causes.push({
          name: "Error",
          message: typeof current === "string" ? current : JSON.stringify(current),
          stack: ""
        });
      } catch {
        causes.push({
          name: "Error",
          message: String(current),
          stack: ""
        });
      }
      break;
    }
  }

  return causes;
}

export function createStackFromErrorEvent(
  message: string,
  filename: string,
  lineno: number,
  colno: number
): string {
  return `${message}\n    at (${filename}:${lineno}:${colno})`;
}
