import type { FunctionPlugins, TrackerPlugin } from "../plugin";
import type { TrackerCore } from "../core";
import type { TrackerCoreConfig } from "../config";

import { mergeConfig, PluginDriver } from "../plugin";
import { createLogger } from "../logger";

const logger = createLogger("core");

const ctx = {} as TrackerCore;

const coreConfig = {} as TrackerCoreConfig;

describe("test PluginDriver utils", () => {
  it("test mergeConfig", () => {
    const defaults = { a: { b: { c: 2 }, d: [1, 2] }, e: 1 };
    // 必须重建一个新的不能直接添加属性
    expect(mergeConfig(defaults, {})).not.toBe(defaults);
    // 忽略合并上的虚值
    expect(mergeConfig(defaults, { d: null })).toEqual(defaults);
    //忽略原本的虚值
    expect(mergeConfig({ f: undefined }, defaults)).toEqual(defaults);
    // 复杂的合并策略
    expect(mergeConfig(defaults, { a: { b: { c: 3 }, d: 2 }, e: null })).toEqual({
      a: { b: { c: 3 }, d: [1, 2, 2] },
      e: 1
    });
  });
});

describe("test PluginDriver inside Api", () => {
  const { getSortedValidatePlugins, runHookSync, runHook } = PluginDriver([], {}, logger);

  it("runHook success", () => {
    expect(
      runHook("beforeDestroy", [ctx], {
        name: "test",
        beforeDestroy: async () => {
          await Promise.resolve();
          return true;
        }
      })
    ).resolves.toBe(true);
  });

  it("runHook error", () => {
    expect(
      runHook("beforeDestroy", [ctx], {
        name: "test",
        beforeDestroy: () => {
          return Promise.reject("error");
        }
      })
    ).rejects.toThrowError("error");
  });

  it("runHookSync success", () => {
    const record = runHookSync("build", ["test", { a: 1 }], {
      name: "test",
      build: (event, record) => ({ event, record })
    });

    expect(record).toEqual({ event: "test", record: { a: 1 } });
  });

  it("runHookSync error", () => {
    expect(() =>
      runHookSync("build", ["test", { a: 1 }], {
        name: "test",
        build: {
          handler: () => {
            // @ts-ignore
            record;
            return { a: 1 };
          }
        }
      })
    ).toThrowErrorMatchingSnapshot();
  });

  it("getSortedValidatePlugins", () => {
    const sorted = getSortedValidatePlugins("init", [
      {
        name: "1",
        init: {
          order: "post",
          handler: () => ({})
        }
      },
      {
        name: "2",
        init: () => ({})
      },
      {
        name: "3",
        init: {
          order: "pre",
          handler: () => ({})
        }
      },
      {
        name: "4",
        init: {
          handler: () => ({})
        }
      }
    ]);

    expect(sorted.map(item => item.name).join("->")).toBe("3->2->4->1");

    expect(() =>
      getSortedValidatePlugins("build", [
        {
          name: "test",
          // @ts-ignore
          build: 1
        }
      ])
    ).toThrowErrorMatchingSnapshot();
  });
});

describe("test PluginDriver core", () => {
  it("init & prototype", () => {
    const pd = PluginDriver(
      [
        {
          name: "testPlugin",
          setup() {
            this.logger.info(this.meta.version);
          }
        }
      ],
      {},
      logger
    );

    expect(pd.hookSequentialSync("setup", [coreConfig])).toHaveConsoleInfo("testPlugin", __VERSION__);
  });

  it("hookParallel Api", () => {
    const flat = [false, false];

    const plugins = genPlugins(
      "beforeDestroy",
      flat.map((_, index) => async () => {
        await Promise.resolve();
        flat[index] = true;
      })
    );
    const pd = PluginDriver(plugins, {}, logger);

    pd.hookParallel("beforeDestroy", [ctx]).then(() => {
      expect(flat).toEqual([true, true]);
    });
  });

  it("hookSequentialSync Api", () => {
    const flat: number[] = [];
    const resolve = [1, 2, 3, 4];
    const plugins = genPlugins(
      "setup",
      resolve.map(item => () => {
        flat.push(item);
      })
    );
    const pd = PluginDriver(plugins, {}, logger);
    pd.hookSequentialSync("setup", [coreConfig]);

    expect(flat).toEqual(resolve);
  });

  it("hookBail Api", () => {
    let flat = -1;
    const resolve = [1, 2, 3, 4];
    const plugins = genPlugins(
      "beforeSend",
      resolve.map(item => () => {
        flat = item;
        return item !== 3;
      })
    );
    const pd = PluginDriver(plugins, {}, logger);
    pd.hookBail("beforeSend", ["test", {}]);

    expect(flat).toEqual(3);
  });

  it("hookChainMergeSync Api", () => {
    const resolve = [1, 2, 3, 4];
    const plugins = genPlugins(
      "build",
      resolve.map(item => () => {
        return {
          value: item
        };
      })
    );
    const pd = PluginDriver(plugins, {}, logger);
    expect(pd.hookChainMergeSync("build", ["test", {}], {})).toEqual({ value: 4 });
  });
});

function genPlugins(hook: keyof FunctionPlugins, handlers: Array<(...args: any[]) => any>): TrackerPlugin[] {
  return handlers.map((handler, index) => ({
    name: "test" + index,
    [hook]: handler
  }));
}
