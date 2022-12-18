/**
 * mock global console
 * @param methods
 * @returns
 */
function createMockConsole<T extends keyof Console>(methods: T[]) {
  const methodsFns = methods.reduce((pre, item) => {
    const mock = jest.fn();
    return { ...pre, ...{ [item]: mock } };
  }, {} as Record<T, jest.Mock<any, any>>);

  return {
    ...methodsFns,
    clearMock() {
      for (const key in methodsFns) {
        methodsFns[key].mockClear();
      }
    },
    runMock() {
      methods.forEach(item => {
        console[item] = methodsFns[item];
      });
    }
  };
}

const mockConsoleMethods: Array<keyof Console> = ["info", "error", "warn"];

const mockConsole = createMockConsole(mockConsoleMethods);

beforeAll(() => {
  mockConsole.runMock();
});

afterAll(() => {
  mockConsole.clearMock();
});

function genLoggerPrefix(module?: string) {
  return module ? `[${__NAME__}/${module}]` : `[${__NAME__}]`;
}

const expectExtendConsole = mockConsoleMethods.reduce((pre, method) => {
  return { ...pre, ...genExpectHaveFun(method) };
}, {} as jest.ExpectExtendMap);

function genExpectHaveFun(method: keyof Console) {
  const funName =
    "toHaveConsole" +
    method.replace(/^([a-z])/, (_, f: string) => {
      return f.toUpperCase();
    });

  return {
    [funName](received: undefined, module?: string, msg?: string) {
      const receivedOtherMsg = mockConsole[method].mock.lastCall?.slice() || [];
      const prefix = genLoggerPrefix(module);

      if (receivedOtherMsg.join(" ") === prefix + " " + msg) {
        return {
          pass: true,
          message: () => ""
        };
      }

      return {
        pass: false,
        message: () =>
          `toHaveConsoleInfo:\n\n` +
          `Expected: ${receivedOtherMsg.join(" ")}\n` +
          `Received: ${prefix + " " + msg}`
      };
    }
  };
}

expect.extend(expectExtendConsole);
