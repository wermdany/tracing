import { isElement } from "./is";

/**
 * 获取当前元素的选择器
 * @param el - 元素
 */
export function getCurrentSelector(el: HTMLElement, stopClass: string[] = []): string {
  if (!el || !isElement(el)) {
    return "";
  }

  if (el === document.body) {
    return "body";
  }

  const { parentElement } = el;
  const tagName = getDomTagName(el);
  const classList = Array.from(el.classList);
  /**
   * 此时，有三种情况
   * 1. 此元素从 dom 中删除
   * 2. 此元素为 html
   * 3. 此元素为自定义元素，并未关联父子元素
   */
  if (!parentElement) {
    if (classList.length) {
      return `${tagName}.${classList.join(".")}`;
    }
    return tagName;
  }

  if (stopClass.length && classList.some(v => stopClass.includes(v))) {
    return `${tagName}.${classList.join(".")}`;
  }

  const index = Array.prototype.indexOf.call(parentElement?.children, el);
  return `${tagName}:nth-of-type(${index + 1})`;
}

/**
 * 根据一个元素获取在 document 中的唯一选择器，
 * 默认在碰到 body 时，就会停止向上查找
 * @param el - 元素
 * @param stopClass - 停止向上查找的 className
 *
 */
export function getDomSelector(el: HTMLElement, stopClass: string[] = []): string {
  if (!el || !isElement(el)) {
    return "";
  }

  const selectorArr: string[] = [];

  while (el) {
    const currentSelector = getCurrentSelector(el, stopClass);
    if (el === document.body || stopClass.some(value => el.classList.contains(value)) || !el.parentElement) {
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
 * 获取元素在 dom 树中的路径
 * @param el - 元素
 * @param stopClass - 停止查找的 className
 * @returns
 */
export function getDomPath(el: HTMLElement, stopClass: string[] = []): string {
  if (!el || !isElement(el)) {
    return "";
  }
  const pathArr: string[] = [];

  while (el) {
    if (el === document.body || stopClass.some(value => el.classList.contains(value)) || !el.parentElement) {
      pathArr.unshift(getDomTagName(el, true));
      return pathArr.join(" > ");
    } else {
      pathArr.unshift(getDomTagName(el, true));
      el = el.parentElement;
    }
  }
  return pathArr.join(" > ");
}

/**
 * 获取元素的主题内容
 * @param el - 元素
 * @returns 元素的主题内容
 */
export function getDomContent(el: HTMLElement): string {
  return el.textContent || "";
}

/**
 * 获取元素的类名
 * @export
 * @param el - 元素
 * @returns 类名
 */
export function getDomClassName(el: HTMLElement): string {
  return el.className;
}

/**
 * 获取元素的标签名
 * @param el - 元素
 * @param isLowerCase - 是否小写
 * @returns 元素的标签名
 */
export function getDomTagName(el: HTMLElement, isLowerCase = true): string {
  return isLowerCase ? el.tagName.toLowerCase() : el.tagName;
}
