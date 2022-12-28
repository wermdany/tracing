import type { TrackerPlugin, Logger, TrackerCore } from "@tracker/core";

import {
  getElementTagName,
  getAttributeNames,
  isElement,
  getElementClassName,
  getElementSelector,
  getElementPath
} from "@tracker/shared";

export interface WebClickPluginConfig {
  document: HTMLElement;
  watchElement: Array<keyof HTMLElementTagNameMap>;
  watchAttrs: string[];
  watchLevel: number;
  genRecord: (target: HTMLElement) => Record<string, any>;
}

export function WebClickPlugin(inputConfig?: Partial<WebClickPluginConfig>): TrackerPlugin {
  const config: WebClickPluginConfig = {
    document: document.body,
    watchElement: ["button", "a", "input", "textarea"],
    watchAttrs: ["auto-watch-web-click"],
    watchLevel: 1,
    genRecord: defaultGenRecord,
    ...inputConfig
  };

  let core: TrackerCore;

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

    core.report(EventName, record);
  };

  const unWatch = () => {
    config.document.removeEventListener("click", watchFun);
  };

  return {
    name: "web-click",
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

export const EventName = "web-click";
