import { encrypt, decrypt } from "../encrypt";

describe("test encrypt and decrypt string", () => {
  it("encrypt to decrypt", () => {
    const testString = "测试😁😁😂测试*！@#￥%……&*（）——+}{“：？》《~QWE";
    expect(decrypt(encrypt(testString))).toEqual(testString);
  });
});
