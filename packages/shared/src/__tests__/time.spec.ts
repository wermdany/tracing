import { browserPerformanceTimer, timestamp, localTime } from "../time";

const FakeNow = 1680000002000;

const FakePerNow = 2345; // ms

jest.spyOn(performance, "now").mockReturnValue(FakePerNow);

beforeEach(() => {
  jest.useFakeTimers({
    now: FakeNow
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("test time -> browserPerformanceTimer", () => {
  it("should browserPerformanceTimer export apis", () => {
    expect(Object.keys(browserPerformanceTimer()!)).toStrictEqual(["now", "timeOrigin"]);
  });

  it("should browserPerformanceTimer timeOrigin", () => {
    expect(browserPerformanceTimer()?.timeOrigin).toBe(FakeNow - FakePerNow);
  });
});

describe("test time -> timestamp", () => {
  it("should timestamp return millisecond", () => {
    expect(timestamp()).toBe(FakePerNow);
  });
});

describe("test time -> localTime", () => {
  it("should localTime return millisecond", () => {
    expect(localTime()).toBe(FakeNow);
  });
});
