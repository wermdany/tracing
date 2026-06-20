/**
 * 提供便捷的获取页面常用属性方法
 */

import { isElement } from "./is";

/********************************* BOM ***********************************/

/**
 * 获取来源页
 */
export function getReferrer() {
  return document.referrer;
}

/**
 * 获取时区偏移值
 */
export function getTimezoneOffset() {
  return new Date().getTimezoneOffset();
}

/**
 * 获取用户代理字符串
 */
export function getUserAgent() {
  return navigator.userAgent || "";
}

/**
 * 获取操作系统名称
 */
export function getOsName() {
  const ua = navigator.userAgent || "";
  if (ua.indexOf("Windows") !== -1) return "Windows";
  if (ua.indexOf("Mac OS X") !== -1) return "macOS";
  if (ua.indexOf("Linux") !== -1) return "Linux";
  if (ua.indexOf("Android") !== -1) return "Android";
  if (ua.indexOf("iOS") !== -1 || ua.indexOf("iPhone") !== -1 || ua.indexOf("iPad") !== -1) return "iOS";
  if (ua.indexOf("CrOS") !== -1) return "ChromeOS";
  return "Unknown";
}

/**
 * 获取浏览器名称和版本
 */
export function getBrowserInfo() {
  const ua = navigator.userAgent || "";
  let name = "Unknown";
  let version = "";

  // Edge 必须单独优先检测（新版 Edge 的 UA 中 Edg/ 出现在 Chrome/ 之后）
  const edgeMatch = ua.match(/(Edge|Edg)\/([\d.]+)/);
  if (edgeMatch) {
    name = "Edge";
    version = edgeMatch[2];
  } else {
    const match = ua.match(/(Chrome|Firefox|Safari|Opera)\/([\d.]+)/);
    if (match) {
      name = match[1];
      version = match[2];
    } else if (ua.indexOf("MSIE") !== -1 || ua.indexOf("Trident") !== -1) {
      name = "IE";
      const v = ua.match(/(?:MSIE |rv:)([\d.]+)/);
      version = v ? v[1] : "";
    }
  }

  return name + (version ? ` ${version}` : "");
}

/**
 * 获取网络类型（effectiveType）
 */
export function getNetworkType() {
  const conn = (navigator as any).connection;
  if (conn && conn.effectiveType) {
    return conn.effectiveType as string;
  }
  return "";
}

/**
 * 获取设备内存（GB）
 */
export function getDeviceMemory() {
  const mem = (navigator as any).deviceMemory;
  return mem != null ? (mem as number) : 0;
}

/**
 * 获取 CPU 逻辑核数
 */
export function getHardwareConcurrency() {
  return navigator.hardwareConcurrency || 0;
}

/**
 * 获取显示屏幕分辨率宽度
 */
export function getScreenWidth() {
  return window.screen.width;
}

/**
 * 获取显示屏幕分辨率高度
 */
export function getScreenHeight() {
  return window.screen.height;
}

/**
 * 获取当前页面的 DOM 视窗宽度
 */
export function getViewportWidth() {
  return window.innerWidth;
}

/**
 * 获取当前页面的 DOM 视窗高度
 */
export function getViewportHeight() {
  return window.innerHeight;
}

/**
 * 获取当前页面的 URL
 */
export function getUrl() {
  return location.href;
}

/**
 * 获取当前页面的 URL 名称
 */
export function getPathName() {
  return location.pathname;
}

/**
 * 获取当前页面的标题
 */
export function getTitle() {
  return document.title;
}

/********************************* DOM ***********************************/

/**
 * 获取当前元素的选择器
 *
 * @param el - 元素
 * @param stopClass - 停止向上查询的 class 名列表
 * @param stopById - 是否在碰到 id 时 停止向上查找
 * @param isPath - 是否在获取路径中使用
 *
 */
export function getCurrentElementSelector(
  el: Element,
  stopClass: string[] = [],
  stopById = true,
  isPath = false
): string {
  if (!el || !isElement(el)) {
    return "";
  }

  if (el === document.body) {
    return "body";
  }

  const { parentElement } = el;
  const tagName = getElementTagName(el);
  const tagId = getElementId(el);
  const classList = getElementClassList(el);

  /**
   * 此时，有三种情况
   * 1. 此元素从 dom 中删除
   * 2. 此元素为 html
   * 3. 此元素为自定义元素，并未关联父子元素
   */
  if (!parentElement) {
    if (tagId) {
      return `#${tagId}`;
    }
    if (classList.length) {
      return `${tagName}.${classList.join(".")}`;
    }
    return tagName;
  }

  if (tagId && stopById) {
    return `#${tagId}`;
  }

  if (stopClass.length && classList.some(v => stopClass.includes(v))) {
    return `${tagName}.${classList.join(".")}`;
  }

  if (isPath) {
    return tagName;
  }

  const fellow = Array.from(parentElement?.children || []) as unknown as Element[];

  const curTags: Element[] = fellow.filter(item => getElementTagName(item) == tagName);

  const index = Array.prototype.indexOf.call(curTags, el);

  return `${tagName}:nth-of-type(${index + 1})`;
}

/**
 * 获取指定元素在 DOM 树的唯一选择器
 *
 * @param el - 元素
 * @param stopClass - 停止向上查询的class名列表
 * @param stopById - 是否在碰到 id 时 停止向上查找
 *
 */
export function getElementSelector(el: Element, stopClass: string[] = [], stopById = true) {
  if (!el || !isElement(el)) {
    return "";
  }

  const selectorArr: string[] = [];

  while (el) {
    const currentSelector = getCurrentElementSelector(el, stopClass, stopById);
    if (
      (stopById && getElementId(el)) ||
      el === document.body ||
      stopClass.some(value => el.classList.contains(value)) ||
      !el.parentElement
    ) {
      selectorArr.unshift(currentSelector);
      return selectorArr.join(" > ");
    } else {
      selectorArr.unshift(currentSelector);
      el = el.parentElement;
    }
  }

  return selectorArr.join(" > ");
}
/**
 * 获取指定元素在 DOM 树中的路径
 *
 * @param el - 元素
 * @param stopClass - 停止向上查询的class名列表
 * @param stopById - 是否在碰到 id 时 停止向上查找
 *
 */
export function getElementPath(el: Element, stopClass: string[] = [], stopById = true) {
  if (!el || !isElement(el)) {
    return "";
  }
  const pathArr: string[] = [];

  while (el) {
    const currentPath = getCurrentElementSelector(el, stopClass, stopById, true);
    if (
      (stopById && getElementId(el)) ||
      el === document.body ||
      stopClass.some(value => el.classList.contains(value)) ||
      !el.parentElement
    ) {
      pathArr.unshift(currentPath);
      return pathArr.join(" > ");
    } else {
      pathArr.unshift(currentPath);
      el = el.parentElement;
    }
  }
  return pathArr.join(" > ");
}

/**
 * 获取一个 DOM 元素的类名
 *
 * @param el - 元素
 *
 */
export function getElementClassName(el: Element) {
  return el.className;
}

/**
 * 获取一个 DOM 元素的主体文本内容
 *
 * @param el - 元素
 * @param isTrim - 是否去除前后空格
 *
 */
export function getElementContent(el: Element, isTrim = true) {
  return (isTrim ? el.textContent?.trim() : el.textContent) || "";
}

/**
 * 获取一个 DOM 元素的标签名
 *
 * @param el - 元素
 * @param isLowerCase - 是否小写
 *
 */
export function getElementTagName(el: Element, isLowerCase = true) {
  return isLowerCase ? el.tagName.toLowerCase() : el.tagName;
}

export function getElementId(el: Element) {
  return el.getAttribute("id") || "";
}

/**
 * 获取一个 DOM 元素的类名数组
 * @param el - 元素
 *
 */
export function getElementClassList(el: Element): string[] {
  return Array.from(el.classList);
}

/**
 * 获取一个 DOM 元素的属性名列表
 * @param el - 元素
 */
export function getAttributeNames(el: Element) {
  return Array.from(el.getAttributeNames());
}
