function runCode(code: string) {
  return new Function(code)();
}

export function isSupportSymbol() {
  try {
    runCode("'use strict'; var a = Symbol('b');");
    return true;
  } catch (_e) {
    return false;
  }
}
