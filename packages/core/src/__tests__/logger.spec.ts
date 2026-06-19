import { createLogger } from "../logger";

const moduleStr = "core";

const logger = createLogger(moduleStr);

describe("test logger", () => {
  it("info", () => {
    expect(logger.info("1", "2")).toHaveConsoleInfo(moduleStr, "1 2");
    expect(logger.info("1", "2")).toHaveConsoleInfo(moduleStr, "1 2");
  });

  it("warn", () => {
    expect(logger.warn("1", "2")).toHaveConsoleWarn(moduleStr, "1 2");
    expect(logger.warn("1", "2")).toHaveConsoleWarn(moduleStr, "1 2");
  });

  it("error", () => {
    expect(logger.error("1", "2")).toHaveConsoleError(moduleStr, "1 2");
    expect(logger.error("1", "2")).toHaveConsoleError(moduleStr, "1 2");
  });
  it("config => isLogger = false", () => {
    const closeLogger = createLogger("", false);
    const infoCalls = (console.info as jest.Mock).mock.calls.length;
    const warnCalls = (console.warn as jest.Mock).mock.calls.length;
    const errorCalls = (console.error as jest.Mock).mock.calls.length;

    closeLogger.info("test", "3", "4");
    expect(console.info).toHaveBeenCalledTimes(infoCalls);

    closeLogger.warn("test", "3", "4");
    expect(console.warn).toHaveBeenCalledTimes(warnCalls);

    closeLogger.error("test", "3", "4");
    expect(console.error).toHaveBeenCalledTimes(errorCalls);
  });

  it("throw error", () => {
    expect(() => {
      logger.throwError("has a Error");
    }).toThrowErrorMatchingSnapshot();
  });
});
