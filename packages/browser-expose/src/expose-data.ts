import {
  getElementTagName,
  getElementClassName,
  getElementSelector,
  getElementPath,
  getElementId,
  getViewportWidth,
  getViewportHeight
} from "@tracing/shared";

import { DefaultExposeAttribute } from "./constants";

function extractExposeData(element: HTMLElement, attribute: string): Record<string, any> {
  const data: Record<string, any> = {};
  const prefix = `${attribute}-data-`;

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (attr.name.startsWith(prefix)) {
      const key = attr.name.slice(prefix.length);
      if (key) data[key] = attr.value;
    }
  }

  const jsonRaw = element.getAttribute(`${attribute}-data`);
  if (jsonRaw) {
    try {
      Object.assign(data, JSON.parse(jsonRaw));
    } catch {
      __DEV__ &&
        console.warn(`[tracing:browser-expose] Failed to parse "${attribute}-data" JSON on element`, {
          tagName: getElementTagName(element),
          id: element.id,
          className: getElementClassName(element),
          selector: getElementSelector(element),
          rawValue: jsonRaw
        });
    }
  }

  return data;
}

export function defaultGenRecord(
  entry: IntersectionObserverEntry,
  element: HTMLElement,
  attribute: string = DefaultExposeAttribute
): Record<string, any> {
  return {
    exposeLabel: element.getAttribute(attribute) || "",
    exposeData: extractExposeData(element, attribute),
    elementTagName: getElementTagName(element),
    elementClassName: getElementClassName(element),
    elementSelector: getElementSelector(element),
    elementPath: getElementPath(element),
    elementId: getElementId(element),
    intersectionRatio: Math.round(entry.intersectionRatio * 100) / 100,
    timestamp: Date.now(),
    viewportWidth: getViewportWidth(),
    viewportHeight: getViewportHeight()
  };
}
