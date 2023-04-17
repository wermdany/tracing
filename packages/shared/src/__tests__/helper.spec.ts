import { qs, noop, omit, pick, hasOwn, transProfile, choice, pickParse, formatNumber } from "../helper";

describe("test stared helper -> qs", () => {
  it("should return url query", () => {
    expect(qs({ a: 1, b: 2 })).toBe("a=1&b=2");
  });

  it("should return url query and prefix", () => {
    expect(qs({ a: 1, b: 2 }, "?")).toBe("?a=1&b=2");
  });
});

describe("test stared helper -> noop", () => {
  it("should not return", () => {
    expect(noop()).toBe(undefined);
  });
});

describe("test stared helper -> omit", () => {
  it("should omit normal key", () => {
    expect(omit({ a: 1, b: 2 }, ["b"])).toEqual({ a: 1 });
  });

  it("should omit prototype key", () => {
    expect(omit(Object.create({ a: 1, b: 2 }), ["b"])).toEqual({});
  });
});

describe("test stared helper -> pick", () => {
  it("should pick normal key", () => {
    expect(pick({ a: 1, b: 2 }, ["a"])).toEqual({ a: 1 });
  });

  it("should pick prototype key", () => {
    expect(pick(Object.create({ a: 1, b: 2 }), ["a"])).toEqual({});
  });
});

describe("test stared helper -> hasOwn", () => {
  it("should hasOwn normal key", () => {
    expect(hasOwn({ a: 1, b: 2 }, "a")).toBe(true);
  });

  it("should pick prototype key", () => {
    expect(hasOwn(Object.create({ a: 1 }), "a")).toBe(false);
  });
});

describe("test stared helper -> transProfile", () => {
  it("should transform function", () => {
    expect(transProfile({ a: 1, b: 2, c: () => 3 })).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe("test stared helper -> choice", () => {
  it("should excludes use array", () => {
    expect(choice(["1", "2"])("1")).toBe(true);
  });

  it("should excludes use function", () => {
    expect(choice(arg => !["1", "2"].includes(arg))("1")).toBe(false);
  });

  it("should excludes use regexp", () => {
    expect(choice(/^on/)("onClick")).toBe(true);
  });
});

describe("test stared helper -> pickParse", () => {
  it("should add one number", () => {
    expect(pickParse({ a: 1, b: 2 }, ["a"], v => v + 1)).toEqual({ a: 2, b: 2 });
  });

  it("should omit params", () => {
    expect(pickParse({ a: 1, b: 2 }, ["a"], v => v + 1, ["b"])).toEqual({ a: 2 });
  });
});

describe("test stared helper -> formatNumber", () => {
  it("should return three decimal", () => {
    expect(formatNumber(1.222222, 3)).toBe(1.222);
  });

  it("should not rounding-off method", () => {
    expect(formatNumber(1.222222, 2)).toBe(1.22);
    expect(formatNumber(1.224, 2)).toBe(1.22);
    expect(formatNumber(1.225, 2)).toBe(1.22);
    expect(formatNumber(1.229, 2)).toBe(1.22);
  });
});
