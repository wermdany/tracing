/**
 * 此文件提供 rollup 打包
 */

import type { OutputOptions } from "rollup";

import path from "node:path";
import fs from "fs-extra";
import chalk from "chalk";
import { rollup } from "rollup";

import { targets, rootJoin, removePreBuild, canIBuildTargets, args } from "./utils";
import { generateDTS } from "./dts";
import { createRollupConfigs } from "./rollup";

const inputTargets = args._;

const isRelease = args.release;
const isSourceMap = args.s || args.sourcemap;
const isBuildTypes = args.t || args.types || isRelease;
const isDevOnly = args.devOnly || args.d;
const isProdOnly = !isDevOnly && (args.prodOnly || args.p);

run();

async function run() {
  if (isRelease) {
    // remove build cache for release builds to avoid outdated enum values
    await fs.remove(rootJoin("node_modules/.rts2_cache"));
  }
  if (!inputTargets.length) {
    await buildAll(targets);
  } else {
    await buildAll(canIBuildTargets(inputTargets));
  }
  // remove temp
  fs.remove(rootJoin("temp"));
  // remove dist
  fs.remove(rootJoin("dist"));
}

async function buildAll(targets: string[]) {
  await runParallel(require("os").cpus().length, targets, build);
}

async function runParallel(maxConcurrency: number, source: string[], iteratorFn: (...arg: any) => any) {
  const ret = [];
  const executing = [];
  for (const item of source) {
    const p = Promise.resolve().then(() => iteratorFn(item, source));
    ret.push(p);

    if (maxConcurrency <= source.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

async function build(target: string) {
  // generate file path by current target
  const resolve = (...p: string[]) => path.resolve(rootJoin("packages", target), ...p);

  // current build package.json
  const pkg = fs.readJsonSync(resolve("package.json"));

  if ((isRelease || !targets.length) && pkg.private) {
    return;
  }
  // delete pre build files
  removePreBuild(target);

  const env = (pkg.buildOptions && pkg.buildOptions.env) || (isDevOnly ? "development" : "production");

  // build code
  const rollupOptions = createRollupConfigs(target, {
    nodeEnv: env,
    sourcemap: isSourceMap,
    prodOnly: isProdOnly,
    buildType: isBuildTypes
  });
  try {
    for (const options of rollupOptions) {
      const inputFile = options.input;
      const output = options.output as OutputOptions;

      console.log(chalk.cyan(`\n ${chalk.bold(inputFile)} → ${chalk.bold(output.file)}...`));

      const start = Date.now();

      const bundle = await rollup(options);

      await bundle.write(output);
      await bundle.close();

      console.log(chalk.green(`created ${chalk.bold(output.file)} in ${chalk.bold(Date.now() - start)}ms`));
    }
  } catch (error) {
    console.error(error);
  }

  // build types
  if (isBuildTypes && pkg.types) {
    await generateDTS(target);
  }
}
