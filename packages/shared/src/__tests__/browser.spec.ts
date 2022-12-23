import * as P from "../browser";

beforeAll(() => {
  document.title = "test element";

  document.body.innerHTML = `
  <div id="app">
    <div class="a">
      <ul class="c cc ccc">
        <li class="d dd ddd"></li>
        <li class="e ee eee"></li>
      </ul>
      <div class="f"></div>
      <div class="g"></div>
    </div>
    <div class="b"> test text </div>
  </div>`;
});

describe("test browser env", () => {
  it("test getReferrer", () => {
    expect(P.getReferrer()).toBe("");
  });

  it("test getTimezoneOffset", () => {
    const offset = new Date().getTimezoneOffset();

    expect(P.getTimezoneOffset()).toBe(offset);
  });

  it("test getScreenWidth", () => {
    expect(P.getScreenWidth()).toBe(0);
  });

  it("test getScreenHeight", () => {
    expect(P.getScreenHeight()).toBe(0);
  });

  it("test getViewportWidth", () => {
    expect(P.getViewportWidth()).toBe(1024);
  });

  it("test getViewportHeight", () => {
    expect(P.getViewportHeight()).toBe(768);
  });

  it("test getUrl", () => {
    expect(P.getUrl()).toBe("http://localhost:8000/index.html");
  });

  it("test getPathName", () => {
    expect(P.getPathName()).toBe("/index.html");
  });

  it("test getTitle", () => {
    expect(P.getTitle()).toBe("test element");
  });
});

describe("test element", () => {
  it("test getElementId", () => {
    const el = document.getElementById("app")!;
    expect(P.getElementId(el)).toBe("app");
  });

  it("test getElementTagName", () => {
    const el = document.querySelector(".a")!;
    expect(P.getElementTagName(el)).toBe("div");
  });

  it("test getElementContent", () => {
    const el = document.querySelector(".b")!;

    expect(P.getElementContent(el)).toBe("test text");

    expect(P.getElementContent(el, false)).toBe(" test text ");
  });

  it("test getElementClassName", () => {
    const el = document.querySelector(".c")!;
    expect(P.getElementClassName(el)).toBe("c cc ccc");
  });

  it("test getCurrentElementSelector", () => {
    const el = document.querySelector(".e")!;

    expect(P.getCurrentElementSelector(el)).toBe("li:nth-of-type(2)");
    // stop by class
    expect(P.getCurrentElementSelector(el, ["ee"])).toBe("li.e.ee.eee");
    // stop by id
    const hasIdEl = document.querySelector("#app")!;
    expect(P.getCurrentElementSelector(hasIdEl, [], true)).toBe("#app");
    // not stop by id
    expect(P.getCurrentElementSelector(hasIdEl, [], false)).toBe("div:nth-of-type(1)");
    // test null
    // @ts-ignore
    expect(P.getCurrentElementSelector(document.querySelector(".unknown"))).toBe("");
    // test object
    // @ts-ignore
    expect(P.getCurrentElementSelector({ a: 1 })).toBe("");
    // test body
    expect(P.getCurrentElementSelector(document.body)).toBe("body");

    // test not parent element
    const notParent = document.createElement("div");

    expect(P.getCurrentElementSelector(notParent)).toBe("div");

    notParent.className = "notParent hasClass";

    expect(P.getCurrentElementSelector(notParent)).toBe("div.notParent.hasClass");

    notParent.setAttribute("id", "hasId");

    expect(P.getCurrentElementSelector(notParent)).toBe("#hasId");
  });

  it("test getElementSelector", () => {
    const el = document.querySelector(".e")!;

    const selector = P.getElementSelector(el);

    expect(selector).toBe("#app > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(2)");

    expect(document.querySelector(selector) === el).toBe(true);

    expect(P.getElementSelector(el, ["a"])).toBe("div.a > ul:nth-of-type(1) > li:nth-of-type(2)");

    expect(P.getElementSelector(el, [], false)).toBe(
      "body > div:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(2)"
    );
  });

  it("test getElementPath", () => {
    const el = document.querySelector(".e")!;

    expect(P.getElementPath(el)).toBe("#app > div > ul > li");

    expect(P.getElementPath(el, ["c"])).toBe("ul.c.cc.ccc > li");

    expect(P.getElementPath(el, [], false)).toBe("body > div > div > ul > li");

    expect(P.getElementPath(document.body, [], false)).toBe("body");
  });
});
