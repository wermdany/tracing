import type { TracingPlugin, TracingCore } from "@tracing/core";

import { DefaultExposeAttribute } from "./constants";
import { defaultGenRecord } from "./expose-data";

export interface BrowserExposePluginConfig {
  attribute: string;
  threshold: number;
  rootMargin: string;
  once: boolean;
  useMutationObserver: boolean;
  genRecord: (entry: IntersectionObserverEntry, element: HTMLElement) => Record<string, any>;
}

export const defaultConfig: BrowserExposePluginConfig = {
  attribute: DefaultExposeAttribute,
  threshold: 0,
  rootMargin: "0px",
  once: true,
  useMutationObserver: true,
  genRecord: defaultGenRecord
};

export const BrowserExposeEvent = "browser-expose";

export function BrowserExposePlugin(inputConfig?: Partial<BrowserExposePluginConfig>): TracingPlugin {
  const config: BrowserExposePluginConfig = {
    ...defaultConfig,
    ...inputConfig
  };

  const genRecord = inputConfig?.genRecord
    ? config.genRecord
    : (entry: IntersectionObserverEntry, el: HTMLElement) => defaultGenRecord(entry, el, config.attribute);

  let core: TracingCore;
  let isWatching = false;
  let io: IntersectionObserver | null = null;
  let mo: MutationObserver | null = null;
  const observedElements = new Set<Element>();

  const onIntersection = (entries: IntersectionObserverEntry[]): void => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const el = entry.target as HTMLElement;

      try {
        const record = genRecord(entry, el);
        core.report(BrowserExposeEvent, record);
      } catch (error) {
        __DEV__ && console.error("[tracing:browser-expose] genRecord error:", error);
      }

      if (config.once) {
        io?.unobserve(el);
        observedElements.delete(el);
      }
    }
  };

  const observeElement = (el: Element): void => {
    if (!(el instanceof HTMLElement)) return;
    if (!el.hasAttribute(config.attribute)) return;
    if (observedElements.has(el)) return;
    io?.observe(el);
    observedElements.add(el);
  };

  const scanElements = (root: ParentNode = document): void => {
    const elements = Array.from(root.querySelectorAll<HTMLElement>(`[${config.attribute}]`));
    elements.forEach(observeElement);
  };

  const startWatch = (): void => {
    if (typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") {
      __DEV__ &&
        console.warn("[tracing:browser-expose] IntersectionObserver is not supported in this environment");
      return;
    }

    io = new IntersectionObserver(onIntersection, {
      threshold: config.threshold,
      rootMargin: config.rootMargin
    });

    scanElements(document);

    if (config.useMutationObserver && typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type !== "childList") continue;
          const addedNodes = Array.from(mutation.addedNodes);
          for (const node of addedNodes) {
            if (node instanceof Element) {
              if (node.hasAttribute(config.attribute)) {
                observeElement(node);
              }
              scanElements(node);
            }
          }
        }
      });

      mo.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  };

  const stopWatch = (): void => {
    io?.disconnect();
    io = null;
    mo?.disconnect();
    mo = null;
    observedElements.clear();
  };

  return {
    name: "tracing:browser-expose",

    prepare(ctx) {
      core = ctx;
      if (!isWatching) {
        startWatch();
        isWatching = true;
      }
    },

    destroy() {
      if (isWatching) {
        stopWatch();
        isWatching = false;
      }
    }
  };
}
