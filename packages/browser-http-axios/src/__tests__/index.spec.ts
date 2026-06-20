import * as modules from "..";

describe("test browser-http-axios output modules", () => {
  it("should browser-http-axios output modules", () => {
    expect(Object.keys(modules)).toMatchSnapshot();
  });
});
