/**
 * 此文件提供快速创建子模块
 */

import { readdirSync, outputFile, readJsonSync } from "fs-extra";
import { rootJoin, toParseCase, globalExtensionsFile } from "./utils";
import { prompt } from "enquirer";
import chalk from "chalk";
import rootPkg from "../package.json";
import { join } from "node:path";
import { sync as glob } from "glob";
import execa from "execa";

interface PromptResult {
  name: string;
  description: string;
  confirm: boolean;
  dependencies: Record<string, string>;
  formats: string[];
}

const libOptions = genDependenciesOptions();

const libNames = readdirSync(rootJoin("/packages"));

prompt<PromptResult>(
  [
    {
      name: "name",
      type: "input",
      required: true,
      message: "请输入子模块名称：",
      result: (name: string) => name.trim(),
      validate: (name: string) => {
        const nameRE = /^[a-z]+((-)[a-z]+)*$/;
        if (!nameRE.test(name)) {
          return chalk.redBright(`子模块名称必须符合 ${nameRE} 匹配！`);
        }
        if (libNames.includes(name)) {
          return chalk.redBright("名称与已有应用名重复！");
        }
        return true;
      }
    },
    {
      name: "description",
      type: "input",
      message: "请输入子模块描述：",
      result: (name: string) => name.trim(),
      initial: rootPkg.description
    },
    {
      name: "dependencies",
      type: "multiselect",
      message: "请选择需要依赖的其他子模块：",
      choices: libOptions,
      result(names) {
        return this.map(names);
      },
      format: names => chalk.green(names),
      // @ts-ignore
      pass: !libOptions.length
    },
    {
      name: "formats",
      type: "multiselect",
      message: "请选择需要的打包格式：",
      choices: rootPkg.formats.map(val => ({
        name: val,
        value: val,
        message: val
      })),
      format: names => chalk.green(names)
    },
    {
      name: "confirm",
      type: "toggle",
      message: "是否确认创建？"
    }
  ].filter(cfg => !cfg.pass)
)
  .then(async res => {
    if (res.confirm) {
      await genChildrenApp(res);
      if (res.dependencies && Object.keys(res.dependencies).length > 0) {
        console.log(chalk.blue("\npnpm install --prefer-offline\n"));
        execa("pnpm", ["install", "--prefer-offline"], { stdio: "inherit" });
      }
    }
  })
  .catch(err => {
    console.log(chalk.red(err));
  });

async function genChildrenApp(obj: PromptResult) {
  const childrenName = "@" + rootPkg.name + "/" + obj.name;
  const appPath = rootJoin("packages", obj.name);
  // create dir and required files
  await outputFile(join(appPath, "src", "index.ts"), "");
  // create package.json
  await outputFile(join(appPath, "package.json"), genPackageTemplate(obj, childrenName));
  // create api-extractor.json
  await outputFile(join(appPath, "api-extractor.json"), genApiExtractorTemplate(obj.name));
  // create README.md
  await outputFile(join(appPath, "README.md"), `# ${childrenName}\n`);
  // create index.js
  await outputFile(join(appPath, "index.js"), genIndexTemplate(obj));
  // create global Extensions
  await outputFile(join(appPath, "src", globalExtensionsFile), genGlobalExtensionPrefix());
}

function genIndexTemplate(obj: PromptResult) {
  return `"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/${obj.name}.cjs.prod.js");
} else {
  module.exports = require("./dist/${obj.name}.cjs.js");
}\n`;
}

function genGlobalExtensionPrefix() {
  return `/**
 * api-extractor do not export declare module
 * we will search this file and auto add them to the end of the type file
 */\n`;
}

function genApiExtractorTemplate(name: string) {
  return (
    JSON.stringify(
      {
        extends: "../../api-extractor.json",
        mainEntryPointFilePath: `./dist/packages/${name}/src/index.d.ts`,
        dtsRollup: {
          publicTrimmedFilePath: `./dist/${name}.d.ts`
        },
        // why add this config ? see: https://github.com/microsoft/rushstack/issues/3510
        compiler: {
          overrideTsconfig: {
            compilerOptions: {
              baseUrl: `packages/${name}/dist/`,
              paths: {
                "@tracker/*": ["packages/*/src"]
              }
            },
            include: ["global.d.ts", "packages/*/src/**/*.ts"],
            exclude: ["test-utils/*"]
          }
        }
      },
      null,
      2
    ) + "\n"
  );
}

function genPackageTemplate(obj: PromptResult, childrenName: string) {
  const authName = rootPkg.author.split(" ")[0];
  const pkg = {
    name: childrenName,
    version: rootPkg.version,
    private: false,
    /* 当前子模块是否是一个内部库 */
    lib: true,
    description: obj.description || childrenName,
    main: "index.js",
    module: `dist/${obj.name}.esm-bundler.js`,
    types: `dist/${obj.name}.d.ts`,
    sideEffects: false,
    author: rootPkg.author,
    license: rootPkg.license,
    files: ["dist", "index.js"],
    buildOptions: {
      name: toParseCase(rootPkg.name + "-" + obj.name),
      formats: obj.formats
    },
    repository: {
      type: "git",
      url: `git+https://github.com/${authName}/${rootPkg.name}.git`,
      directory: "packages/" + obj.name
    },
    bugs: {
      url: `https://github.com/${authName}/${rootPkg.name}/issues`
    },
    homepage: `https://github.com/${authName}/${rootPkg.name}/tree/master/packages/${obj.name}#readme`,
    keywords: rootPkg.keywords,
    dependencies: obj.dependencies
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}

function genDependenciesOptions() {
  try {
    const cb = glob(rootJoin("packages/*/package.json"));
    return cb.reduce((pre, cur) => {
      const pkg = readJsonSync(cur);
      if (pkg.lib && !pkg.private) {
        return pre.concat({
          name: pkg.name,
          value: pkg.version,
          message: pkg.name + " -> " + pkg.version
        });
      }
      return pre;
    }, []);
  } catch (err) {
    console.log(chalk.redBright(err));
    process.exit(1);
  }
}
