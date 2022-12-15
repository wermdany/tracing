/**
 * mock global console
 * @param methods
 * @returns
 */
function createMockConsole<T extends keyof Console>(methods: T[]) {
  const methodsFns = methods.reduce((pre, item) => {
    const mock = jest.fn();
    return Object.assign(pre, { [item]: mock });
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
  return module ? `%c[${__NAME__}/${module}]` : `%c[${__NAME__}]`;
}

const expectExtendConsole = mockConsoleMethods.reduce((pre, method) => {
  return Object.assign(pre, genExpectHaveFun(method));
}, {} as jest.ExpectExtendMap);

function genExpectHaveFun(method: keyof Console) {
  const funName =
    "toHaveConsole" +
    method.replace(/^([a-z])/, (_, f: string) => {
      return f.toUpperCase();
    });

  return {
    [funName](received: undefined, module?: string, msg?: string) {
      const receivedPrefix = mockConsole[method].mock.lastCall?.[0] || "";
      const receivedOtherMsg = mockConsole[method].mock.lastCall?.slice(2) || [];
      const prefix = genLoggerPrefix(module);
      receivedOtherMsg.unshift(prefix);
      if (receivedOtherMsg.join(" ") === receivedPrefix + " " + msg) {
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
          `Received: ${receivedPrefix + " " + msg}`
      };
    }
  };
}

expect.extend(expectExtendConsole);
