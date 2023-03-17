import chalk from "chalk";
import { watch } from "rollup";

import { targets, canIBuildTargets, removePreBuild, args } from "./utils";
import { createRollupConfigs } from "./rollup";
import { generateDTS } from "./dts";

const inputTargets = args._;

const buildType = args.buildType || args.t;

const map = new Map<string, string>();

if (!inputTargets.length) {
  run(targets);
} else {
  run(canIBuildTargets(inputTargets));
}

async function run(targets: string[]) {
  // remove old build
  targets.forEach(target => removePreBuild(target));

  console.log(chalk.green(`Now watch targets: ${targets.join(" ")}\n`));

  const rollupConfigs = targets
    .map(target =>
      createRollupConfigs(target, {
        watch: {},
        prodOnly: false,
        sourcemap: false,
        buildType: true,
        nodeEnv: "development"
      })
    )
    .flat();

  const watcher = watch(rollupConfigs);

  watcher.on("change", (id, change) => {
    console.log(chalk.greenBright(`\n${change.event}: ${id}`));
  });

  watcher.on("event", async event => {
    if (event.code == "BUNDLE_START") {
      console.log();
    }
    if (event.code == "BUNDLE_END") {
      console.log(
        chalk.cyan(
          `${chalk.bold(event.input)} → ${chalk.bold(event.output[0])} in ${chalk.green(
            event.duration + " ms"
          )}`
        )
      );
      if (buildType) {
        let target: string;
        if (map.has(event.input as string)) {
          target = map.get(event.input as string);
        } else {
          target = inputPathToTarget(event.input as string);

          map.set(event.input as string, target);

          if (!targets.includes(target)) {
            console.log(chalk.redBright(`parse invalid target '${target}'`));
            return;
          }
        }

        await generateDTS(target, false);
      }
    }

    if (event.code == "ERROR") {
      console.error(chalk.redBright(`\n${event.error}`));
    }
  });
}

function inputPathToTarget(path: string) {
  const resolve = /\/packages\/(.*)\/src\/index\.ts$/.exec(path);

  return resolve[1];
}
