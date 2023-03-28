import { compose } from "../middleware/core";

describe("test core -> compose", () => {
  it("should compose zero function", () => {
    const f = compose();
    expect(f(1)).toEqual(1);
  });

  it("should compose one function", () => {
    const f = compose((...args: any[]) => args);
    expect(f(1, 2)).toEqual([1, 2]);
  });

  it("should compose more function", () => {
    const arr: number[] = [];

    const f1 = () => {
      arr.push(1);
    };

    const f2 = () => {
      arr.push(2);
    };

    const f3 = () => {
      arr.push(3);
    };

    const f = compose(f1, f2, f3);
    f();
    expect(arr).toEqual([3, 2, 1]);
  });
});
