import { createStore } from "../store";
import { createLogger } from "../logger";

const bFun = () => 2;

const logger = createLogger("core");

describe("test store", () => {
  const store = createStore("test", { a: 1 }, logger);

  it("initStore", () => {
    expect(store.get()).toEqual({ a: 1 });
  });

  it("add profile to store", () => {
    store.set("b", 1);
    expect(store.get()).toEqual({ a: 1, b: 1 });
    expect(store.set("b", bFun)).toHaveConsoleWarn(
      "core",
      "store:test You are trying to overwrite an existing property: b"
    );
    expect(store.get()).toEqual({ a: 1, b: 2 });
  });

  it("getOrigin profile to store", () => {
    expect(store.getOrigin()).toEqual({ a: 1, b: bFun });
  });

  it("remove profile to store", () => {
    store.remove("b");
    expect(store.get()).toEqual({ a: 1 });
  });

  it("clearGlobal profile to store", () => {
    store.clear();
    expect(store.get()).toEqual({});
  });
});
