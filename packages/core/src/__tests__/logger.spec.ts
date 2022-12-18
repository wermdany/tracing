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
    const closeLogger = createLogger("", { isLogger: false });
    // not console
    expect(closeLogger.info("", "3", "4")).toHaveConsoleInfo(moduleStr, "1 2");
    expect(closeLogger.warn("", "3", "4")).toHaveConsoleInfo(moduleStr, "1 2");
    expect(closeLogger.error("", "3", "4")).toHaveConsoleInfo(moduleStr, "1 2");
  });

  it("throw error", () => {
    expect(() => {
      logger.throwError("has a Error");
    }).toThrowErrorMatchingSnapshot();
  });
});
