/**
 * 此文件提供 rollup 打包
 */

import minimist from "minimist";
import path from "path";
import fs from "fs-extra";
import execa from "execa";
import chalk from "chalk";
import {
  targets,
  rootJoin,
  removePreBuild,
  canIBuildTargets,
  globalExtensionsFile,
  getDeclareModuleLine
} from "./utils";

const args = minimist(process.argv.slice(2));

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
    await fs.remove(path.resolve(__dirname, "../node_modules/.rts2_cache"));
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
  await execa(
    "rollup",
    [
      "-c",
      "--environment",
      [
        `NODE_ENV:${env}`,
        `TARGET:${target}`,
        isBuildTypes ? `TYPES:true` : ``,
        isProdOnly ? `PROD_ONLY:true` : ``,
        isSourceMap ? `SOURCE_MAP:true` : ``
      ]
        .filter(Boolean)
        .join(",")
    ],
    {
      stdio: "inherit"
    }
  );
  // build types
  if (isBuildTypes && pkg.types) {
    console.log();
    console.log(chalk.bold(chalk.yellow(`Rolling up type definitions for ${target}...`)));
    const { Extractor, ExtractorConfig } = await import("@microsoft/api-extractor");

    const extractorConfig = ExtractorConfig.loadFileAndPrepare(resolve("api-extractor.json"));
    const extractorResult = Extractor.invoke(extractorConfig, {
      localBuild: true,
      showVerboseMessages: true
    });
    if (extractorResult.succeeded) {
      const types = resolve("types");
      const DTSPath = resolve(pkg.types);

      if (await fs.pathExists(types)) {
        // add custom types
        const customTypePaths = await fs.readdir(types);
        const typesFile = await fs.readFile(DTSPath, "utf8");

        const customTypes = await Promise.all(
          customTypePaths
            .filter(file => /\.d\.ts$/.test(file))
            .map(file => {
              return fs.readFile(resolve("types", file), "utf8");
            })
        );

        await fs.writeFile(DTSPath, typesFile + "\n" + customTypes.join("\n"));
      }
      // add declare module
      const globalExtensionsFilePath = resolve("src", globalExtensionsFile);
      if (await fs.pathExists(globalExtensionsFilePath)) {
        const line = await getDeclareModuleLine(globalExtensionsFilePath);

        await execa("tail", ["-n", `+${line}`, globalExtensionsFilePath, ">>", DTSPath], {
          stdio: "inherit",
          shell: true
        });
      }
      console.log(chalk.bold(chalk.green(`API Extractor completed ${target} successfully.`)));
    } else {
      console.error(
        `API Extractor completed with ${extractorResult.errorCount} errors` +
          ` and ${extractorResult.warningCount} warnings`
      );
      process.exit(1);
    }
    // remove types cache
    removePreBuild(target, "packages");
  }
}
