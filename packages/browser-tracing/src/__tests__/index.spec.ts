import * as modules from "..";

describe("test browser-tracing output modules", () => {
  it("should browser-tracing output modules", () => {
    expect(Object.keys(modules)).toMatchSnapshot();
  });
});
