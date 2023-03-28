import { validatorBuild, SenderError, parseIgnore } from "../base";

describe("test browser-sender -> base", () => {
  it("should call object to validatorBuild", () => {
    expect(validatorBuild({})).toBe(false);
  });

  it("should not call undefined validatorBuild", () => {
    expect(validatorBuild(undefined)).toBe(true);
  });

  it("should output SenderError", () => {
    expect(SenderError).toMatchSnapshot();
  });
});

describe("test browser-sender -> parseIgnore", () => {
  it("should input array", () => {
    const f = parseIgnore([1, 2]);

    expect(f(1)).toBe(true);
    expect(f(4)).toBe(false);
  });

  it("should input function", () => {
    const f = parseIgnore((e: number) => [1, 2].includes(e));

    expect(f(1)).toBe(true);
    expect(f(4)).toBe(false);
  });
});
