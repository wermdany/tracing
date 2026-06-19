import { TracingCore } from "@tracing/core";
import {
  BrowserPagePlugin,
  defaultGenPageEnterRecord,
  defaultGenPageExitRecord,
  BrowserPageEnterEvent,
  BrowserPageExitEvent
} from "../browser-page";

import * as modules from "..";

function triggerClick(target: HTMLElement) {
  target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("browser-page-plugin", () => {
  let tc: TracingCore;

  beforeEach(() => {
    tc = new TracingCore({
      plugins: [BrowserPagePlugin()]
    });

    jest.spyOn(tc, "report");
    jest.spyOn(document, "addEventListener");
    jest.spyOn(document, "removeEventListener");
    jest.spyOn(window, "addEventListener");
    jest.spyOn(window, "removeEventListener");

    tc.init();
  });

  afterEach(async () => {
    await tc.destroy();
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  it("should report page_enter on init", () => {
    expect(tc.report).toHaveBeenCalledWith(BrowserPageEnterEvent, expect.any(Object));
  });

  it("should report page_enter with expected fields", () => {
    const record = (tc.report as jest.Mock).mock.calls[0][1];
    expect(record).toMatchObject({
      path: expect.any(String),
      referrer: expect.any(String),
      title: expect.any(String),
      url: expect.any(String),
      timestamp: expect.any(Number)
    });
  });

  it("should register click listener with capture on init", () => {
    expect(document.addEventListener).toHaveBeenCalledWith("click", expect.any(Function), { capture: true });
  });

  it("should monitor history.pushState via monkey-patch", () => {
    const newUrl = window.location.pathname + "/other";
    history.pushState({}, "", newUrl);

    expect(tc.report).toHaveBeenCalledWith(BrowserPageExitEvent, expect.any(Object));
  });

  it("should report page_exit on history change without spurious page_enter", () => {
    const newPath = window.location.pathname + "/other";

    history.pushState({}, "", newPath);

    const enterCalls = (tc.report as jest.Mock).mock.calls.filter(
      (call: any[]) => call[0] === BrowserPageEnterEvent
    );
    const exitCalls = (tc.report as jest.Mock).mock.calls.filter(
      (call: any[]) => call[0] === BrowserPageExitEvent
    );

    expect(exitCalls.length).toBe(1);
    expect(enterCalls.length).toBe(1);
  });

  it("should register popstate listener on window", () => {
    expect(window.addEventListener).toHaveBeenCalledWith("popstate", expect.any(Function));
  });

  it("should store click element info on watched element click", () => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.textContent = "Go";
    document.body.appendChild(btn);

    triggerClick(btn);

    history.pushState({}, "", window.location.pathname + "/next");

    const exitCall = (tc.report as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === BrowserPageExitEvent
    );
    expect(exitCall).toBeDefined();
    expect(exitCall[1].exitElement).toMatchObject({
      tagName: "button",
      className: "nav-btn",
      innerText: "Go"
    });
  });

  it("should store a tag href in exit element", () => {
    const link = document.createElement("a");
    link.href = "https://example.com";
    link.textContent = "External";
    document.body.appendChild(link);

    triggerClick(link);

    history.pushState({}, "", window.location.pathname + "/next");

    const exitCall = (tc.report as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === BrowserPageExitEvent
    );
    expect(exitCall).toBeDefined();
    expect(exitCall[1].exitElement).toMatchObject({
      tagName: "a",
      href: expect.stringContaining("example.com"),
      innerText: "External"
    });
  });

  it("should not report exit when history changes to same path", () => {
    const callsBefore = (tc.report as jest.Mock).mock.calls.length;

    history.pushState({}, "", window.location.pathname);

    expect((tc.report as jest.Mock).mock.calls.length).toBe(callsBefore);
  });

  it("should match watchAttrs config", () => {
    tc.destroy();

    const attrTc = new TracingCore({
      plugins: [
        BrowserPagePlugin({
          watchElement: [],
          watchAttrs: ["data-track-page"]
        })
      ]
    });

    jest.spyOn(attrTc, "report");
    attrTc.init();

    const span = document.createElement("span");
    span.setAttribute("data-track-page", "true");
    document.body.appendChild(span);

    triggerClick(span);

    history.pushState({}, "", window.location.pathname + "/tracked");

    const exitCall = (attrTc.report as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === BrowserPageExitEvent
    );
    expect(exitCall).toBeDefined();
    expect(exitCall[1].exitElement.tagName).toBe("span");

    attrTc.destroy();
  });

  it("should traverse parent elements according to watchLevel", () => {
    tc.destroy();

    const levelTc = new TracingCore({
      plugins: [
        BrowserPagePlugin({
          watchElement: ["a"],
          watchLevel: 2
        })
      ]
    });

    jest.spyOn(levelTc, "report");
    levelTc.init();

    const link = document.createElement("a");
    link.href = window.location.origin + "/deep";
    link.textContent = "Deep Link";
    const span = document.createElement("span");
    span.textContent = "Click me";
    link.appendChild(span);
    document.body.appendChild(link);

    triggerClick(span);

    history.pushState({}, "", "/deep");

    const exitCall = (levelTc.report as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === BrowserPageExitEvent
    );
    expect(exitCall).toBeDefined();

    levelTc.destroy();
  });

  it("should not report page exit when no path change occurs", () => {
    triggerClick(document.createElement("button"));

    const enterCount = (tc.report as jest.Mock).mock.calls.filter(
      (call: any[]) => call[0] === BrowserPageEnterEvent
    ).length;
    const exitCount = (tc.report as jest.Mock).mock.calls.filter(
      (call: any[]) => call[0] === BrowserPageExitEvent
    ).length;

    expect(enterCount).toBe(1);
    expect(exitCount).toBe(0);
  });

  it("should remove listeners on destroy", async () => {
    await tc.destroy();

    expect(document.removeEventListener).toHaveBeenCalledWith("click", expect.any(Function), {
      capture: true
    });
    expect(window.removeEventListener).toHaveBeenCalledWith("popstate", expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("should not duplicate init", () => {
    tc.init();
    expect(document.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("should use custom genPageEnterRecord", () => {
    tc.destroy();

    const customTc = new TracingCore({
      plugins: [
        BrowserPagePlugin({
          genPageEnterRecord(data) {
            return { custom: "enter", path: data.path };
          }
        })
      ]
    });

    jest.spyOn(customTc, "report");
    customTc.init();

    expect(customTc.report).toHaveBeenCalledWith(BrowserPageEnterEvent, {
      custom: "enter",
      path: expect.any(String)
    });

    customTc.destroy();
  });

  it("should use custom genPageExitRecord on history change", () => {
    tc.destroy();

    const customTc = new TracingCore({
      plugins: [
        BrowserPagePlugin({
          genPageExitRecord(data) {
            return { custom: "exit", dwellTime: data.dwellTime };
          }
        })
      ]
    });

    jest.spyOn(customTc, "report");
    customTc.init();

    history.pushState({}, "", window.location.pathname + "/custom-exit");

    const exitCall = (customTc.report as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === BrowserPageExitEvent
    );
    expect(exitCall).toBeDefined();
    expect(exitCall[1]).toMatchObject({
      custom: "exit",
      dwellTime: expect.any(Number)
    });

    customTc.destroy();
  });

  it("should report exit on destroy when no navigation occurred", async () => {
    const freshTc = new TracingCore({
      plugins: [BrowserPagePlugin()]
    });
    jest.spyOn(freshTc, "report");
    freshTc.init();

    await freshTc.destroy();

    expect(freshTc.report).toHaveBeenCalledWith(
      BrowserPageExitEvent,
      expect.objectContaining({
        path: expect.any(String),
        dwellTime: expect.any(Number)
      })
    );
  });

  it("should restore original history methods after destroy", async () => {
    const pushStateBefore = history.pushState;

    const restoreTc = new TracingCore({
      plugins: [BrowserPagePlugin()]
    });
    restoreTc.init();

    await restoreTc.destroy();

    expect(history.pushState).toBe(pushStateBefore);
  });

  it("should browser-page output modules", () => {
    expect(modules).toMatchSnapshot();
  });
});

describe("browser-page -> defaultGenRecords", () => {
  it("should format page enter data correctly", () => {
    const data = {
      path: "/home",
      referrer: "https://example.com",
      title: "Home",
      url: "https://mysite.com/home",
      timestamp: 1600000000000
    };

    expect(defaultGenPageEnterRecord(data)).toEqual({
      path: "/home",
      referrer: "https://example.com",
      title: "Home",
      url: "https://mysite.com/home",
      timestamp: 1600000000000
    });
  });

  it("should format page exit data correctly", () => {
    const data = {
      path: "/home",
      title: "Home",
      dwellTime: 5000,
      exitPath: "/about",
      exitElement: {
        tagName: "a",
        className: "nav-link",
        selector: "a.nav-link",
        innerText: "About",
        href: "https://mysite.com/about"
      },
      timestamp: 1600000005000
    };

    expect(defaultGenPageExitRecord(data)).toEqual({
      path: "/home",
      title: "Home",
      dwellTime: 5000,
      exitPath: "/about",
      exitElement: {
        tagName: "a",
        className: "nav-link",
        selector: "a.nav-link",
        innerText: "About",
        href: "https://mysite.com/about"
      },
      timestamp: 1600000005000
    });
  });

  it("should handle null exit element", () => {
    const data = {
      path: "/",
      title: "Index",
      dwellTime: 100,
      exitPath: "",
      exitElement: null,
      timestamp: 1600000000000
    };

    expect(defaultGenPageExitRecord(data)).toEqual({
      path: "/",
      title: "Index",
      dwellTime: 100,
      exitPath: "",
      exitElement: null,
      timestamp: 1600000000000
    });
  });
});

describe("browser-page -> beforeunload", () => {
  let sendBeaconMock: jest.Mock;

  beforeEach(() => {
    sendBeaconMock = jest.fn();
    Object.defineProperty(navigator, "sendBeacon", {
      value: sendBeaconMock,
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should not call sendBeacon when sendUrl is not configured", () => {
    const tc = new TracingCore({
      plugins: [BrowserPagePlugin()]
    });

    tc.init();

    window.dispatchEvent(new Event("beforeunload"));

    expect(sendBeaconMock).not.toHaveBeenCalled();

    tc.destroy();
  });

  it("should call sendBeacon when sendUrl is configured", () => {
    const tc = new TracingCore({
      plugins: [BrowserPagePlugin({ sendUrl: "/api/tracing" })]
    });

    tc.init();

    window.dispatchEvent(new Event("beforeunload"));

    expect(sendBeaconMock).toHaveBeenCalledWith("/api/tracing", expect.any(Blob));

    tc.destroy();
  });
});
