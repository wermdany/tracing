import path from "path";
import ts from "rollup-plugin-typescript2";
import replace from "@rollup/plugin-replace";
import json from "@rollup/plugin-json";

if (!process.env.TARGET) {
  throw new Error("TARGET package must be specified via --environment flag.");
}

const isBuildTypes = !!process.env.TYPES;
const isSourceMap = !!process.env.SOURCE_MAP;

const target = process.env.TARGET;

const packagePath = path.resolve(__dirname, "packages");
const packageDir = path.resolve(packagePath, target);
const resolve = p => path.resolve(packageDir, p);
const pkg = require(resolve("package.json"));

const packageOptions = pkg.buildOptions || {};

const name = packageOptions.filename || path.basename(packageDir);

const outputConfigs = {
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

const defaultFormats = ["esm-bundler", "cjs"];
const packageFormats = packageOptions.formats || defaultFormats;

const packageBuildConfigs = packageFormats.map(format => createConfig(format, outputConfigs[format]));

packageFormats.forEach(format => {
  if (format == "cjs") {
    packageBuildConfigs.push(createProductionConfig(format));
  }

  if (/^(global|esm-browser)/.test(format)) {
    packageBuildConfigs.push(createMinifiedConfig(format));
  }
});

export default packageBuildConfigs;

function createConfig(format, output, plugins = []) {
  if (!output) {
    console.log(require("chalk").yellow(`invalid format: "${format}"`));
    process.exit(1);
  }

  const isProduction = /\.prod\.js$/.test(output.file);
  const isBundlerESMBuild = /esm-bundler/.test(format);
  const isBrowserESMBuild = /esm-browser/.test(format);
  const isGlobalBuild = /\.global\.(prod\.)?js$/.test(output.file);

  output.sourcemap = isSourceMap;
  output.externalLiveBindings = false;

  if (isGlobalBuild) {
    output.name = packageOptions.name;
  }

  let external = [];

  if (isBrowserESMBuild || isGlobalBuild) {
    external = [];
  } else {
    external = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})];
  }

  const enterFile = resolve("src/index.ts");

  const nodePlugins =
    format === "cjs" && Object.keys(pkg.devDependencies || {}).length
      ? [
          require("@rollup/plugin-commonjs")({
            sourceMap: false,
            ignore: []
          }),
          ...(format === "cjs" ? [] : [require("rollup-plugin-polyfill-node")()]),
          require("@rollup/plugin-node-resolve").nodeResolve()
        ]
      : [];

  return {
    input: enterFile,
    external,
    output: { banner: createBanner(), ...output },
    plugins: [
      json({
        namedExports: false
      }),
      createTSPlugin(),
      createReplacePlugin(isBundlerESMBuild, isBrowserESMBuild, isProduction),
      ...nodePlugins,
      ...plugins
    ]
  };
}

function createTSPlugin() {
  return ts({
    check: process.env.NODE_ENV === "production",
    tsconfig: path.resolve(__dirname, "tsconfig.json"),
    cacheRoot: path.resolve(__dirname, "node_modules/.rts2_cache"),
    tsconfigOverride: {
      compilerOptions: {
        declaration: isBuildTypes,
        declarationMap: isBuildTypes
      }
    },
    exclude: ["**/__tests__"]
  });
}

function createReplacePlugin(isBundlerESMBuild, isBrowserESMBuild, isProduction) {
  const replacements = {
    __VERSION__: `"${pkg.version}"`,
    __TEST__: false,
    __DEV__: isBundlerESMBuild ? `(process.env.NODE_ENV !== 'production')` : JSON.stringify(!isProduction),
    __ESM_BUNDLER__: isBundlerESMBuild,
    __ESM_BROWSER__: isBrowserESMBuild
  };
  return replace({
    // @ts-ignore
    values: replacements,
    preventAssignment: true
  });
}

function createBanner() {
  const gitHash = require("execa").sync("git", ["rev-parse", "HEAD"]).stdout.substring(0, 7);
  return `/*!
 * ${pkg.name} v${pkg.version}
 * (c) ${new Date().getFullYear()} ${pkg.author}
 * @license ${pkg.license}
 * gitHash ${gitHash}
 */\n`;
}

function createProductionConfig(format) {
  return createConfig(format, {
    file: resolve(`dist/${name}.${format}.prod.js`),
    format: outputConfigs[format].format
  });
}

function createMinifiedConfig(format) {
  const { terser } = require("rollup-plugin-terser");
  return createConfig(
    format,
    {
      file: outputConfigs[format].file.replace(/\.js$/, ".prod.js"),
      format: outputConfigs[format].format
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
