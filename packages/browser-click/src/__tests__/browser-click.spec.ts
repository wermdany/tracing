import { TracingCore } from "@tracing/core";

import { BrowserClickPlugin, defaultGenRecord } from "../browser-click";

import * as modules from "..";

function createTestWrapper() {
  const wrapper = document.createElement("div");
  const div = document.createElement("div");
  const button = document.createElement("button");
  const span = document.createElement("span");
  button.appendChild(span);
  wrapper.appendChild(div);
  wrapper.appendChild(button);

  return { wrapper, div, button, span };
}

describe("browser-click-plugin", () => {
  let all: ReturnType<typeof createTestWrapper>;

  let tc: TracingCore;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    all = createTestWrapper();

    tc = new TracingCore({
      plugins: [
        BrowserClickPlugin({
          document: all.wrapper
        })
      ],
      isLogger: false
    });

    jest.spyOn(tc, "report");
    jest.spyOn(all.wrapper, "addEventListener");
    jest.spyOn(all.wrapper, "removeEventListener");

    tc.init();
  });

  it("should addEventListener to wrapper", () => {
    expect(all.wrapper.addEventListener).toBeCalledTimes(1);
  });

  it("should watch button", () => {
    all.button.click();
    expect(tc.report).toBeCalled();
  });

  it("should not watch div", () => {
    all.div.click();
    expect(tc.report).not.toBeCalled();
  });

  it("should watch div by level", () => {
    all.span.click();
    expect(tc.report).toBeCalled();
  });

  it("should watch div by attribute", () => {
    all.div.setAttribute("auto-watch-browser-click", "true");
    all.div.click();
    expect(tc.report).toBeCalled();
  });

  it("should removeEventListener to wrapper", async () => {
    await tc.destroy();
    expect(all.wrapper.removeEventListener).toBeCalledTimes(1);
  });

  it("should browser-click output modules", () => {
    expect(modules).toMatchSnapshot();
  });
});

describe("browser-click -> defaultGenRecord", () => {
  it("should use anchor", () => {
    const anchor = document.createElement("a");
    anchor.href = "https://baidu.com/";
    anchor.className = "a";

    expect(defaultGenRecord(anchor)).toEqual({
      elementClassName: "a",
      elementPath: "a.a",
      elementSelector: "a.a",
      elementTagName: "a",
      href: "https://baidu.com/"
    });
  });

  it("should use div", () => {
    const div = document.createElement("div");

    div.className = "a";

    expect(defaultGenRecord(div)).toEqual({
      elementClassName: "a",
      elementPath: "div.a",
      elementSelector: "div.a",
      elementTagName: "div"
    });
  });
});
