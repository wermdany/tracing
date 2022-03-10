import { join } from "path/posix";
import chalk from "chalk";
/** 项目根目录 */
export const root = join(__dirname, "..");

/**
 * 生成基于项目根目录的路径
 * @param args 路径
 */
export function rootJoin(...args: string[]) {
  return join(root, ...args);
}

export function error(msg: string) {
  return chalk.redBright(msg);
}

export function success(msg: string) {
  return chalk.greenBright(msg);
}

export function info(msg: string) {
  return chalk.cyanBright(msg);
}
