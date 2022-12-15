import { createCookie, createLocalStorage, createSessionStorage } from "../storage";

describe("test cookie", () => {
  const cookie = createCookie("test");

  it("test cookie set", () => {
    expect(cookie.set({ a: 1 })).toBe(true);
  });

  it("test cookie get", () => {
    expect(cookie.get()).toEqual({ a: 1 });
  });

  it("test cookie clear", () => {
    cookie.clear();
    expect(cookie.get()).toBe(null);
  });

  it("test cookie try catch", () => {
    const cookie = createCookie("expires");
    expect(cookie.set({ a: 1 })).toBe(false);
  });
});

describe("test cookie options", () => {
  it("test cookie options expires Number", async () => {
    const cookie = createCookie("test", { expires: 1 });
    expect(cookie.set({ a: 1 })).toBe(true);

    await new Promise(r => setTimeout(r, 1001));

    expect(cookie.get()).toBe(null);
  });

  it("test cookie options Date", async () => {
    const cookie = createCookie("test", { expires: new Date(Date.now() + 1) });
    expect(cookie.set({ a: 1 })).toBe(true);

    await new Promise(r => setTimeout(r, 500));

    expect(cookie.get()).toBe(null);
  });

  it("test cookie options String", async () => {
    const cookie = createCookie("test", { expires: new Date(Date.now() + 1).toUTCString() });
    expect(cookie.set({ a: 1 })).toBe(true);

    await new Promise(r => setTimeout(r, 500));

    expect(cookie.get()).toBe(null);
  });
});

describe("test sessionStorage", () => {
  const ss = createSessionStorage("test");

  it("test sessionStorage set", () => {
    expect(ss.set({ a: 1 })).toBe(true);
  });

  it("test sessionStorage get", () => {
    expect(ss.get()).toEqual({ a: 1 });
  });

  it("test sessionStorage max size", () => {
    expect(ss.set("123".repeat(5e6))).toBe(false);
  });

  it("test sessionStorage clear", () => {
    ss.clear();
    expect(ss.get()).toBe(null);
  });
});

describe("test localStorage", () => {
  const sl = createLocalStorage("test");

  it("test localStorage set", () => {
    expect(sl.set({ a: 1 })).toBe(true);
  });

  it("test localStorage get", () => {
    expect(sl.get()).toEqual({ a: 1 });
  });

  it("test localStorage max size", () => {
    // @ts-ignore
    expect(sl.set("123".repeat(5e6))).toBe(false);
  });

  it("test localStorage clear", () => {
    sl.clear();
    expect(sl.get()).toBe(null);
  });
});
