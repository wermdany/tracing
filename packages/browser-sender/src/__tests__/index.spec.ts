import * as modules from "..";

describe("test browser-sender output modules", () => {
  it("should browser-sender output modules", () => {
    expect(Object.keys(modules)).toMatchSnapshot();
  });
});
