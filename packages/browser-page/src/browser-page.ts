import type { TracingPlugin, TracingCore } from "@tracing/core";

import {
  getElementTagName,
  getElementClassName,
  getElementSelector,
  getElementContent,
  getAttributeNames,
  isElement,
  getPathName,
  getReferrer,
  getUrl,
  getTitle
} from "@tracing/shared";

export interface PageEnterData {
  path: string;
  referrer: string;
  title: string;
  url: string;
  timestamp: number;
}

export interface ExitElementInfo {
  tagName: string;
  className: string;
  selector: string;
  innerText: string;
  href?: string;
}

export interface PageExitData {
  path: string;
  title: string;
  dwellTime: number;
  exitPath: string;
  exitElement: ExitElementInfo | null;
  timestamp: number;
}

export interface BrowserPageConfig {
  document: HTMLElement | Document;
  watchElement: Array<keyof HTMLElementTagNameMap>;
  watchAttrs: string[];
  watchLevel: number;
  sendUrl: string;
  genPageEnterRecord: (data: PageEnterData) => Record<string, any>;
  genPageExitRecord: (data: PageExitData) => Record<string, any>;
}

export function defaultGenPageEnterRecord(data: PageEnterData): Record<string, any> {
  return {
    path: data.path,
    referrer: data.referrer,
    title: data.title,
    url: data.url,
    timestamp: data.timestamp
  };
}

export function defaultGenPageExitRecord(data: PageExitData): Record<string, any> {
  return {
    path: data.path,
    title: data.title,
    dwellTime: data.dwellTime,
    exitPath: data.exitPath,
    exitElement: data.exitElement,
    timestamp: data.timestamp
  };
}

export function BrowserPagePlugin(inputConfig?: Partial<BrowserPageConfig>): TracingPlugin {
  const config: BrowserPageConfig = {
    document: (typeof document !== "undefined" ? document : undefined) as unknown as Document,
    watchElement: ["a", "button"],
    watchAttrs: ["auto-watch-browser-page"],
    watchLevel: 1,
    sendUrl: "",
    genPageEnterRecord: defaultGenPageEnterRecord,
    genPageExitRecord: defaultGenPageExitRecord,
    ...inputConfig
  };

  let core: TracingCore;
  let isWatching = false;

  let entryTime = 0;
  let entryPath = "";
  let entryReferrer = "";
  let lastExitElement: ExitElementInfo | null = null;
  let hasExited = false;
  let historyChangeHandled = false;

  let originalPushState: typeof history.pushState;
  let originalReplaceState: typeof history.replaceState;

  const elementIsWatch = (element: HTMLElement, level: number): HTMLElement | undefined => {
    const tagName = getElementTagName(element) as keyof HTMLElementTagNameMap;
    const attrs = getAttributeNames(element);

    if (config.watchElement.includes(tagName) || config.watchAttrs.some(attr => attrs.includes(attr))) {
      return element;
    }
    if (level > 0 && element.parentElement) {
      return elementIsWatch(element.parentElement, --level);
    }
  };

  const buildExitElement = (element: HTMLElement): ExitElementInfo => {
    const info: ExitElementInfo = {
      tagName: getElementTagName(element),
      className: getElementClassName(element),
      selector: getElementSelector(element),
      innerText: getElementContent(element)
    };
    if (info.tagName === "a") {
      info.href = (element as HTMLAnchorElement).href;
    }
    return info;
  };

  const reportEnter = () => {
    entryTime = performance.now();
    entryPath = getPathName();
    entryReferrer = lastExitElement?.href || getReferrer();
    hasExited = false;
    historyChangeHandled = false;

    const data: PageEnterData = {
      path: entryPath,
      referrer: entryReferrer,
      title: getTitle(),
      url: getUrl(),
      timestamp: Date.now()
    };

    core.report(BrowserPageEnterEvent, config.genPageEnterRecord(data));
  };

  const reportExit = (exitPath: string) => {
    if (hasExited) return;

    const dwellTime = Math.round(performance.now() - entryTime);

    const data: PageExitData = {
      path: entryPath,
      title: getTitle(),
      dwellTime,
      exitPath,
      exitElement: lastExitElement,
      timestamp: Date.now()
    };

    core.report(BrowserPageExitEvent, config.genPageExitRecord(data));
    lastExitElement = null;
    hasExited = true;
  };

  const handleHistoryChange = () => {
    const newPath = getPathName();

    if (newPath !== entryPath) {
      reportExit(newPath);
      entryPath = newPath;
      entryTime = performance.now();
      entryReferrer = "";
      hasExited = false;
      historyChangeHandled = true;
    }
  };

  const onClick = (event: Event) => {
    const target = event.target;

    if (!target || !isElement(target)) {
      return;
    }

    const element = target as HTMLElement;
    const watchEl = elementIsWatch(element, config.watchLevel);

    if (!watchEl) {
      return;
    }

    lastExitElement = buildExitElement(watchEl);
  };

  const onBeforeUnload = () => {
    if (!config.sendUrl) return;

    const dwellTime = Math.round(performance.now() - entryTime);

    const data: PageExitData = {
      path: entryPath,
      title: getTitle(),
      dwellTime,
      exitPath: "",
      exitElement: lastExitElement,
      timestamp: Date.now()
    };

    const payload = JSON.stringify(config.genPageExitRecord(data));
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(config.sendUrl, blob);
  };

  const startWatch = () => {
    const dom = config.document;

    if (!dom) {
      __DEV__ && console.error("[tracing:browser-page] document is not available");
      return;
    }

    dom.addEventListener("click", onClick, { capture: true });

    originalPushState = history.pushState;
    originalReplaceState = history.replaceState;

    history.pushState = function (...args: Parameters<typeof originalPushState>) {
      const result = originalPushState.apply(this, args);
      handleHistoryChange();
      return result;
    };

    history.replaceState = function (...args: Parameters<typeof originalReplaceState>) {
      const result = originalReplaceState.apply(this, args);
      handleHistoryChange();
      return result;
    };

    window.addEventListener("popstate", handleHistoryChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    reportEnter();
  };

  const stopWatch = () => {
    const dom = config.document;
    if (dom) {
      dom.removeEventListener("click", onClick, { capture: true });
    }

    window.removeEventListener("popstate", handleHistoryChange);
    window.removeEventListener("beforeunload", onBeforeUnload);

    if (originalPushState) {
      history.pushState = originalPushState;
    }
    if (originalReplaceState) {
      history.replaceState = originalReplaceState;
    }
  };

  return {
    name: "tracing:browser-page",
    setup(ctx) {
      core = ctx;
      if (!isWatching) {
        startWatch();
        isWatching = true;
      }
    },
    destroy() {
      if (isWatching) {
        if (!historyChangeHandled) {
          reportExit(getPathName());
        }

        stopWatch();
        isWatching = false;
        entryTime = 0;
        entryPath = "";
        entryReferrer = "";
        lastExitElement = null;
      }
    }
  };
}

export const BrowserPageEnterEvent = "page-enter";
export const BrowserPageExitEvent = "page-exit";
