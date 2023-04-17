import { uuid4 } from "../misc";

describe("test misc -> uuid4", () => {
  it("generator uuid4", () => {
    expect(uuid4()).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{8}/);
  });
});
