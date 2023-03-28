import type { TracingPlugin, Logger, TracingCore } from "@tracing/core";

import {
  getElementTagName,
  getAttributeNames,
  isElement,
  getElementClassName,
  getElementSelector,
  getElementPath
} from "@tracing/shared";

export interface BrowserClickPluginConfig {
  document: HTMLElement;
  watchElement: Array<keyof HTMLElementTagNameMap>;
  watchAttrs: string[];
  watchLevel: number;
  genRecord: (target: HTMLElement) => Record<string, any>;
}

export function BrowserClickPlugin(inputConfig?: Partial<BrowserClickPluginConfig>): TracingPlugin {
  const config: BrowserClickPluginConfig = {
    document: document.body,
    watchElement: ["button", "a", "input", "textarea"],
    watchAttrs: ["auto-watch-browser-click"],
    watchLevel: 1,
    genRecord: defaultGenRecord,
    ...inputConfig
  };

  let core: TracingCore;

  const elementIsWatch = (element: HTMLElement, level: number): HTMLElement | undefined => {
    const tagName = getElementTagName(element) as keyof HTMLElementTagNameMap;

    const attrs = getAttributeNames(element);

    if (config.watchElement.includes(tagName) || config.watchAttrs.some(attr => attrs.includes(attr))) {
      return element;
    }
    if (level > 0) {
      return elementIsWatch(element.parentElement!, --level);
    }
  };

  const watch = (logger: Logger) => {
    const dom = config.document;

    if (!dom || !isElement(dom)) {
      __DEV__ && logger.error(`watch document is not Element`);
      return;
    }

    dom.addEventListener("click", watchFun);
  };

  const watchFun = (event: MouseEvent) => {
    const element = event.target as HTMLElement;

    const watchEl = elementIsWatch(element, config.watchLevel);

    if (!watchEl) {
      return;
    }

    const record = config.genRecord(watchEl);

    core.report(BrowserClickEvent, record);
  };

  const unWatch = () => {
    config.document.removeEventListener("click", watchFun);
  };

  return {
    name: "tracing:browser-click",
    init(ctx) {
      core = ctx;
      watch(this.logger);
    },
    destroy() {
      unWatch();
    }
  };
}

export function defaultGenRecord(target: HTMLElement) {
  const tagName = getElementTagName(target);

  const globalRecord = {
    elementTagName: tagName,
    elementClassName: getElementClassName(target),
    elementSelector: getElementSelector(target),
    elementPath: getElementPath(target)
  };

  if (tagName == "a") {
    return { href: (target as HTMLAnchorElement).href, ...globalRecord };
  }
  return globalRecord;
}

export const BrowserClickEvent = "browser-click";
