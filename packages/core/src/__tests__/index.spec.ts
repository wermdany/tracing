import * as modules from "..";

describe("test core output modules", () => {
  it("should core output modules", () => {
    expect(Object.keys(modules)).toMatchSnapshot();
  });
});
