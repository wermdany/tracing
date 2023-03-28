import * as modules from "..";

describe("test shared output modules", () => {
  it("should shared output modules", () => {
    expect(Object.keys(modules)).toMatchSnapshot();
  });
});
