/**
 * 在多数浏览器中，使用 btoa() 对 Unicode 字符串进行编码都会触发 InvalidCharacterError 异常
 * 因此需要提前进行转移
 * {@link https://developer.mozilla.org/zh-CN/docs/Glossary/Base64}
 * @param data - 要加密的数据
 * @returns
 */
export function encrypt(data: string): string {
  return btoa(
    encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(Number("0x" + p1));
    })
  );
}

/**
 * 提供一个回转的方法
 * @param data - 要解密的数据
 * @returns
 */
export function decrypt(data: string): string {
  return decodeURIComponent(
    atob(data)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );
}
