import path from "node:path";

import chalk from "chalk";
import fs from "fs-extra";
import execa from "execa";

import { root, globalExtensionsFile, getDeclareModuleLine, removePreBuild } from "./utils";
import { createRequire } from "node:module";

const require = createRequire(root);

export async function generateDTS(target: string, isRemove = true) {
  const start = Date.now();
  const resolve = (...args: string[]) => path.resolve(root, "packages", target, ...args);

  console.log(chalk.bold(chalk.yellow(`\nRolling up type definitions for ${target}...`)));

  const pkg = require(resolve("package.json"));

  const { Extractor, ExtractorConfig } = await import("@microsoft/api-extractor");

  const extractorConfig = ExtractorConfig.loadFileAndPrepare(resolve("api-extractor.json"));

  const extractorResult = Extractor.invoke(extractorConfig, {
    localBuild: true,
    showVerboseMessages: true
    // showDiagnostics: true // debug
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
    console.log(
      chalk.bold(chalk.green(`API Extractor completed ${target} successfully in ${Date.now() - start}ms`))
    );
  } else {
    console.error(
      `API Extractor completed with ${extractorResult.errorCount} errors` +
        ` and ${extractorResult.warningCount} warnings`
    );
    process.exit(1);
  }
  // remove types cache
  isRemove && removePreBuild(target, "packages");
  // remove test-utils cache
  isRemove && removePreBuild(target, "test-utils");
}
