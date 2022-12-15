/**
 * 编码数据
 * @param data - 要编码的数据
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
 * 解码数据
 * @param data - 要解码的数据
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
