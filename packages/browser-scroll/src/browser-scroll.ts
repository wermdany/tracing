import type { TracingPlugin, TracingCore } from "@tracing/core";

import {
  getViewportHeight,
  isElement,
  getElementTagName,
  getElementClassName,
  getElementSelector,
  getElementPath
} from "@tracing/shared";

export interface ScrollElementInfo {
  elementTagName: string;
  elementClassName: string;
  elementSelector: string;
  elementPath: string;
  maxScrollDepth: number;
  maxScrollDepthPercent: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface ScrollData {
  totalDwellTime: number;
  scrollSegments: number;
  maxScrollDepth: number;
  maxScrollDepthPercent: number;
  pageHeight: number;
  viewportHeight: number;
  elements: ScrollElementInfo[];
}

export interface BrowserScrollPluginConfig {
  document: HTMLElement | Document;
  debounceMs: number;
  trackScrollDepth: boolean;
  genRecord: (data: ScrollData) => Record<string, any>;
}

function getScrollTopFor(target: Element | Document): number {
  if (target instanceof Document) {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }
  return target.scrollTop;
}

function getScrollHeightFor(target: Element | Document): number {
  if (target instanceof Document) {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );
  }
  return target.scrollHeight;
}

function getClientHeightFor(target: Element | Document): number {
  if (target instanceof Document) {
    return getViewportHeight();
  }
  return target.clientHeight;
}

function computeDepthPercentFor(target: Element | Document, scrollTop: number): number {
  const scrollHeight = getScrollHeightFor(target);
  const clientHeight = getClientHeightFor(target);
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  if (maxScroll <= 0) return 100;
  return Math.min(100, Math.round((scrollTop / maxScroll) * 100));
}

export function BrowserScrollPlugin(inputConfig?: Partial<BrowserScrollPluginConfig>): TracingPlugin {
  const config: BrowserScrollPluginConfig = {
    document: typeof document !== "undefined" ? document : (undefined as unknown as HTMLElement),
    debounceMs: 300,
    trackScrollDepth: true,
    genRecord: defaultGenRecord,
    ...inputConfig
  };

  let core: TracingCore;
  let isWatching = false;

  let isScrolling = false;
  let scrollStartTime = 0;
  let totalDwellTime = 0;
  let scrollSegments = 0;
  let maxScrollDepth = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  let documentScrolled = false;
  let scrolledElements: Map<Element, number> = new Map();

  const isInScope = (target: EventTarget | null): boolean => {
    if (!target) return false;
    if (config.document instanceof Document) return true;
    if (target instanceof Element) {
      return config.document === target || (config.document as HTMLElement).contains(target);
    }
    return false;
  };

  const getPageHeight = (): number => {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );
  };

  const computeScrollData = (): ScrollData => {
    const pageHeight = getPageHeight();
    const viewportHeight = getViewportHeight();

    const elements: ScrollElementInfo[] = [];

    if (documentScrolled) {
      elements.push({
        elementTagName: "document",
        elementClassName: "",
        elementSelector: "document",
        elementPath: "document",
        maxScrollDepth: maxScrollDepth,
        maxScrollDepthPercent: computeDepthPercentFor(document, maxScrollDepth),
        scrollHeight: pageHeight,
        clientHeight: viewportHeight
      });
    }

    scrolledElements.forEach((depth, el) => {
      elements.push({
        elementTagName: getElementTagName(el),
        elementClassName: getElementClassName(el),
        elementSelector: getElementSelector(el),
        elementPath: getElementPath(el),
        maxScrollDepth: depth,
        maxScrollDepthPercent: computeDepthPercentFor(el, depth),
        scrollHeight: getScrollHeightFor(el),
        clientHeight: getClientHeightFor(el)
      });
    });

    let overallMaxDepth = 0;
    let overallMaxDepthPercent = 100;

    if (elements.length > 0) {
      let maxEntry = elements[0];
      for (const entry of elements) {
        if (entry.maxScrollDepth > maxEntry.maxScrollDepth) {
          maxEntry = entry;
        }
      }
      overallMaxDepth = maxEntry.maxScrollDepth;
      overallMaxDepthPercent = maxEntry.maxScrollDepthPercent;
    }

    return {
      totalDwellTime,
      scrollSegments,
      maxScrollDepth: overallMaxDepth,
      maxScrollDepthPercent: overallMaxDepthPercent,
      pageHeight,
      viewportHeight,
      elements
    };
  };

  const reportScroll = () => {
    if (totalDwellTime <= 0 && scrollSegments <= 0) return;
    const data = computeScrollData();
    const record = config.genRecord(data);
    core.report(BrowserScrollEvent, record);
  };

  const isDocumentTarget = (target: EventTarget | null): target is Document => {
    return target === document || target instanceof Document;
  };

  const onScrollEnd = () => {
    if (!isScrolling) return;

    const now = Date.now();
    const dwellTime = now - scrollStartTime;
    totalDwellTime += dwellTime;
    scrollSegments += 1;

    if (config.trackScrollDepth) {
      const currentScrollTop = getScrollTopFor(document);
      if (currentScrollTop > maxScrollDepth) {
        maxScrollDepth = currentScrollTop;
      }
    }

    isScrolling = false;
    scrollStartTime = 0;

    reportScroll();

    scrolledElements = new Map();
    documentScrolled = false;
  };

  const onScroll = (event: Event) => {
    const { target } = event;

    if (!isInScope(target)) return;

    if (config.trackScrollDepth) {
      if (isDocumentTarget(target)) {
        documentScrolled = true;
        const currentScrollTop = getScrollTopFor(document);
        if (currentScrollTop > maxScrollDepth) {
          maxScrollDepth = currentScrollTop;
        }
      } else if (isElement(target)) {
        const el = target as Element;
        const currentScrollTop = getScrollTopFor(el);
        const prevDepth = scrolledElements.get(el) || 0;
        if (currentScrollTop > prevDepth) {
          scrolledElements.set(el, currentScrollTop);
        }
      }
    }

    if (!isScrolling) {
      isScrolling = true;
      scrollStartTime = Date.now();
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      onScrollEnd();
      debounceTimer = null;
    }, config.debounceMs);
  };

  const startWatch = () => {
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
  };

  const stopWatch = () => {
    document.removeEventListener("scroll", onScroll, { capture: true });
  };

  const flushRemaining = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (isScrolling) {
      const dwellTime = Date.now() - scrollStartTime;
      totalDwellTime += dwellTime;
      scrollSegments += 1;
      isScrolling = false;
      scrollStartTime = 0;
    }
    reportScroll();
    scrolledElements = new Map();
    documentScrolled = false;
  };

  return {
    name: "tracing:browser-scroll",
    prepare(ctx) {
      core = ctx;
      if (!isWatching) {
        startWatch();
        isWatching = true;
      }
    },
    destroy() {
      if (isWatching) {
        flushRemaining();
        stopWatch();
        isWatching = false;
        totalDwellTime = 0;
        scrollSegments = 0;
        maxScrollDepth = 0;
        scrolledElements = new Map();
        documentScrolled = false;
      }
    }
  };
}

export function defaultGenRecord(data: ScrollData): Record<string, any> {
  return {
    totalDwellTime: data.totalDwellTime,
    scrollSegments: data.scrollSegments,
    maxScrollDepth: data.maxScrollDepth,
    maxScrollDepthPercent: data.maxScrollDepthPercent,
    pageHeight: data.pageHeight,
    viewportHeight: data.viewportHeight,
    elements: data.elements
  };
}

export const BrowserScrollEvent = "browser-scroll";
