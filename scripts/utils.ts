import { join } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

import fs from "fs-extra";
import chalk from "chalk";
import minimist from "minimist";
import { config } from "dotenv";

/** 项目根目录 */
export const root = fileURLToPath(new URL("..", import.meta.url));

export const args = minimist(process.argv.slice(2));

export const envFilePath = "~/.env.token";

export const globalExtensionsFile = "globalExtensions.ts";

export async function getLocalEnv(): Promise<Record<string, any>> {
  return (
    config({
      path: envFilePath
    }).parsed || {}
  );
}

/**
 * 生成基于项目根目录的路径
 * @param args 路径
 */
export function rootJoin(...args: string[]) {
  return join(root, ...args);
}

export function error(msg: string) {
  console.log();
  console.error(`  ${chalk.bgRed.white(" ERROR ")} ${chalk.red(msg)}`);
  console.log();
}

export function toParseCase(name: string) {
  const word = name.replace(/-([a-z])/g, (_, letter: string) => {
    return letter.toUpperCase();
  });
  return word[0].toUpperCase() + word.substring(1);
}

export function removePreBuild(target: string, sub?: string) {
  if (sub) {
    fs.removeSync(rootJoin("packages", target, "dist", sub));
  } else {
    fs.removeSync(rootJoin("packages", target, "dist"));
  }
}

function genTargets() {
  const dirs = fs.readdirSync(rootJoin("packages"));
  if (!dirs.length) {
    error("No packages build!");
    process.exit(1);
  }

  return dirs.filter(dir => {
    if (!fs.statSync(rootJoin("packages", dir)).isDirectory()) {
      return false;
    }

    const pkg = fs.readJsonSync(rootJoin("packages", dir, "package.json"));
    // 如果是私有的或者不存在打包配置则不在可选打包范围内
    if (pkg.private && !pkg.buildOptions) {
      return false;
    }
    return true;
  });
}

export const targets = genTargets();

export function canIBuildTargets(inputTargets: string[]) {
  const ret: string[] = [];
  inputTargets.forEach(target => {
    if (targets.includes(target)) {
      ret.push(target);
    }
  });

  if (ret.length) {
    return ret;
  }
  error(`Target ${chalk.underline(inputTargets)} not found!`);
  process.exit(1);
}

export async function getDeclareModuleLine(filePath: string): Promise<number> {
  return new Promise(resolve => {
    const reg = /declare module (('.+')|(".+"))/;
    const rs = fs.createReadStream(filePath, { start: 0, end: Infinity });
    const rl = readline.createInterface({ input: rs });
    let line = 0;

    rl.on("line", lineString => {
      line++;

      if (reg.test(lineString)) {
        resolve(line);
        rl.close();
      }
    });
    rl.on("close", () => {
      resolve(0);
    });
  });
}
