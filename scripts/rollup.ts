import type { RollupOptions, OutputOptions, Plugin, WatcherOptions } from "rollup";

import path from "node:path";
import { createRequire } from "node:module";

import execa from "execa";

import ts from "rollup-plugin-typescript2";
import replace from "@rollup/plugin-replace";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import polyfillNode from "rollup-plugin-polyfill-node";
import terser from "@rollup/plugin-terser";

import { root, rootJoin, targets } from "./utils";

const require = createRequire(root);

const rootPkg = require(rootJoin("package.json"));

const gitHash = execa.sync("git", ["rev-parse", "HEAD"]).stdout;

export interface RollupConfig {
  nodeEnv: "development" | "production";
  buildType: boolean;
  prodOnly: boolean;
  sourcemap: boolean;
  watch?: WatcherOptions | false;
}

export type BundleFormats = "esm-bundler" | "esm-browser" | "cjs" | "global";

const defaultFormats = ["esm-bundler", "cjs"] as const;

// run in dev
const watchFormats = ["esm-bundler"] as const;

function createOutputConfig(
  name: string,
  resolve: (...args: string[]) => string
): Record<BundleFormats, OutputOptions> {
  return {
    "esm-bundler": {
      file: resolve(`dist/${name}.esm-bundler.js`),
      format: `es`
    },
    "esm-browser": {
      file: resolve(`dist/${name}.esm-browser.js`),
      format: `es`
    },
    cjs: {
      file: resolve(`dist/${name}.cjs.js`),
      format: `cjs`
    },
    global: {
      file: resolve(`dist/${name}.global.js`),
      format: `iife`
    }
  };
}

export function createRollupConfigs(target: string, config: RollupConfig): RollupOptions[] {
  if (!targets.includes(target)) {
    throw new Error(`Invalid ${target}, It must be the following: ${targets.join(" ")}`);
  }

  const { nodeEnv, buildType, prodOnly, sourcemap, watch } = config;

  // relative 'target' path resolve
  const resolve = (...args: string[]) => path.resolve(root, "packages", target, ...args);
  // target package.json
  const pkg = require(resolve("package.json"));

  const packageOptions = pkg.buildOptions || {};

  const filename = packageOptions.filename || target;

  const targetOutputConfigs = createOutputConfig(filename, resolve);

  const packageFormats: BundleFormats[] =
    packageOptions.formats && packageOptions.formats.length ? packageOptions.formats : defaultFormats;

  function createBaseRollupConfig(
    format: BundleFormats,
    output: OutputOptions,
    plugins: Plugin[] = []
  ): RollupOptions {
    if (!output) {
      throw new Error(`invalid format: "${format}"`);
    }

    output.sourcemap = sourcemap;
    output.externalLiveBindings = false;

    const isProduction = /\.prod\.js$/.test(output.file);
    const isBundlerESMBuild = /esm-bundler/.test(format);
    const isBrowserESMBuild = /esm-browser/.test(format);
    const isGlobalBuild = /\.global\.(prod\.)?js$/.test(output.file);

    if (isGlobalBuild) {
      output.name = packageOptions.name;
    }

    let external = [];

    if (isBrowserESMBuild || isGlobalBuild) {
      external = [];
    } else {
      external = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})];
    }

    const nodePlugins =
      format === "cjs" && Object.keys(pkg.devDependencies || {}).length
        ? [
            commonjs({
              sourceMap: false,
              ignore: []
            }),
            ...(format === "cjs" ? [] : [polyfillNode()]),
            nodeResolve()
          ]
        : [];

    return {
      input: resolve("src/index.ts"),
      external,
      output: {
        banner: createBanner(),
        ...output
      },
      plugins: [
        json(),
        ts({
          check: nodeEnv === "production",
          tsconfig: rootJoin("tsconfig.json"),
          cacheRoot: rootJoin("node_modules/.rts2_cache"),
          tsconfigOverride: {
            compilerOptions: {
              declaration: buildType,
              declarationMap: buildType
            }
          },
          exclude: ["**/__tests__"]
        }),
        replace({
          values: {
            __VERSION__: `"${pkg.version}"`,
            __NAME__: `"${rootPkg.name}"`,
            __TEST__: `false`,
            __DEV__: isBundlerESMBuild
              ? `(process.env.NODE_ENV !== 'production')`
              : JSON.stringify(!isProduction),
            __ESM_BUNDLER__: JSON.stringify(isBundlerESMBuild),
            __ESM_BROWSER__: JSON.stringify(isBrowserESMBuild),
            __GLOBAL_BUILD__: JSON.stringify(isGlobalBuild)
          },
          preventAssignment: true
        }),
        ...nodePlugins,
        ...plugins
      ]
    };
  }

  function createBanner() {
    return [
      `/*!`,
      `* ${pkg.name} v${pkg.version}`,
      `* (c) ${new Date().getFullYear()} ${pkg.author}`,
      `* license ${pkg.license}`,
      `* hash ${gitHash}`,
      `*/\n`
    ].join("\n");
  }

  function createProductionConfig(format) {
    return createBaseRollupConfig(format, {
      file: resolve(`dist/${filename}.${format}.prod.js`),
      format: targetOutputConfigs[format].format
    });
  }

  function createMinifiedConfig(format) {
    return createBaseRollupConfig(
      format,
      {
        file: targetOutputConfigs[format].file.replace(/\.js$/, ".prod.js"),
        format: targetOutputConfigs[format].format
      },
      [
        terser({
          module: /^esm/.test(format),
          compress: {
            ecma: 2015,
            pure_getters: true
          },
          safari10: true
        })
      ]
    );
  }

  // watch
  if (watch) {
    return watchFormats.map(format => createBaseRollupConfig(format, targetOutputConfigs[format]));
  }

  const configs = prodOnly
    ? []
    : packageFormats.map(format => createBaseRollupConfig(format, targetOutputConfigs[format]));

  packageFormats.forEach(format => {
    if (format == "cjs") {
      configs.push(createProductionConfig(format));
    }

    if (/^(global|esm-browser)/.test(format)) {
      configs.push(createMinifiedConfig(format));
    }
  });

  return configs;
}
