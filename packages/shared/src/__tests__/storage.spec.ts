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
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("test cookie options expires Number", () => {
    let store: { value: string; maxAge: number; setAt: number } | null = null;

    Object.defineProperty(document, "cookie", {
      get() {
        if (!store) return "";
        const elapsed = (Date.now() - store.setAt) / 1000;
        if (store.maxAge > 0 && elapsed >= store.maxAge) return "";
        return `test=${store.value}`;
      },
      set(value: string) {
        const m = value.match(/^test=([^;]+)(?:;\s*max-age=(\d+))?/);
        if (m) {
          store = { value: m[1], maxAge: m[2] ? Number(m[2]) : 0, setAt: Date.now() };
        }
      },
      configurable: true
    });

    const cookie = createCookie("test", { expires: 1 });
    expect(cookie.set({ a: 1 })).toBe(true);
    expect(cookie.get()).toEqual({ a: 1 });

    jest.advanceTimersByTime(2000 * 1000);

    expect(cookie.get()).toBe(null);

    delete (document as any).cookie;
  });

  it("test cookie options Date", () => {
    const cookie = createCookie("test", { expires: new Date(Date.now() + 1) });
    expect(cookie.set({ a: 1 })).toBe(true);

    jest.advanceTimersByTime(2000);

    expect(cookie.get()).toBe(null);
  });

  it("test cookie options String", async () => {
    const cookie = createCookie("test", { expires: new Date(Date.now() + 1).toUTCString() });
    expect(cookie.set({ a: 1 })).toBe(true);

    jest.advanceTimersByTime(2000);

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
