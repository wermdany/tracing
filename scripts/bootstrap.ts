/**
 * 此文件提供快速创建子应用
 */

import { readdirSync, outputFileSync } from "fs-extra";
import { rootJoin, error, success, info } from "./utils";
import { prompt } from "enquirer";
import chalk from "chalk";
import { description, name } from "../package.json";
import { join } from "path";

interface PromptResult {
  name: string;
  description: string;
  confirm: boolean;
}

prompt<PromptResult>([
  {
    name: "name",
    type: "input",
    required: true,
    message: "请输入子应用名称:",
    format: (name) => name.trim(),
    validate: (name) => {
      const nameRE = /^[a-zA-Z\\-]+$/;
      if (!nameRE.test(name)) {
        return error(`子应用名称必须符合 ${nameRE} 匹配！`);
      }
      if (readdirSync(rootJoin("/packages")).includes(name)) {
        return error("名称与已有应用名重复！");
      }
      return true;
    }
  },
  {
    name: "description",
    type: "input",
    message: "请输入子应用描述:",
    format: (name) => name.trim(),
    initial: description
  },
  {
    name: "confirm",
    type: "toggle",
    message: "是否确认创建？"
  }
])
  .then((res) => {
    if (res.confirm) {
      genChildrenApp(res);
    }
  })
  .catch((err) => {
    console.log(chalk.red(err));
  });

function step(msg: string) {
  console.log(info(msg));
}

function genChildrenApp(obj: PromptResult) {
  const prefix = name.split("/")[0] + "/" || "@tracker/";
  const appPath = rootJoin("packages", obj.name);
  // 创建目录和必要文件
  outputFileSync(join(appPath, "src", "index.ts"), "");
  // 创建 package.json
  // 创建 api-extractor.json
  outputFileSync(join(appPath, "api-extractor.json"), genApiExtractorTemplate());
  // 创建 README.md
  outputFileSync(join(appPath, "README.md"), `# ${prefix + obj.name}\n`);
  // 创建 index.js
  outputFileSync(join(appPath, "index.js"), genIndexTemplate(obj));
}

function genIndexTemplate(obj: PromptResult) {
  return `"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./dist/${obj.name}.cjs.prod.js");
} else {
  module.exports = require("./dist/${obj.name}.cjs.js");
}\n`;
}

function genApiExtractorTemplate() {
  return `{
  "extends": "../../api-extractor.json",
  "mainEntryPointFilePath": "./dist/packages/<unscopedPackageName>/src/index.d.ts",
  "dtsRollup": {
    "publicTrimmedFilePath": "./dist/<unscopedPackageName>.d.ts"
  }
}\n`;
}
