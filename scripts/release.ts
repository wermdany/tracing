/**
 * 此文件提供生产自动化
 */
import semver from "semver";
import execa from "execa";
import fs from "fs-extra";
import minimist from "minimist";
import chalk from "chalk";
import { prompt } from "enquirer";

import rootPkg from "../package.json";
import { targets, rootJoin } from "./utils";

const curVer = rootPkg.version;
const args = minimist(process.argv.slice(2));

const inputVersion = args._[0];

const isSkipBuild = args.skipBuild || args.sb;
const isSkipTest = args.skipTest || args.st;

const bumps = ["patch", "minor", "major", "prerelease-alpha", "prerelease-beta", "prerelease-rc"];

const bumpChoices = bumps.map(key => {
  // @ts-ignore
  const ver = semver.inc(curVer, ...key.split("-"));
  return {
    name: ver,
    message: `${key} -> ${chalk.underline(ver)}`,
    value: ver
  };
});

const run = (bin: string, args: readonly string[], options?: execa.Options) =>
  execa(bin, args, { stdio: "inherit", ...options });

const step = (msg: string) => console.log(chalk.cyanBright(msg));

release(targets).catch(error => {
  // reset file version
  updatePackageVersion(targets, curVer);
  console.error(error);
});

async function release(targets: string[]) {
  // get release version
  const version = await getVersion();
  // confirm again
  const { Y } = await prompt<{ Y: boolean }>({
    message: `Releasing v${version}. Confirm?`,
    type: "toggle",
    name: "Y"
  });

  if (!Y) {
    return;
  }

  const startTime = Date.now();

  // unit test
  step("\nRunning tests...");
  if (!isSkipTest) {
    await run("pnpm", ["run", "test:unit"]);
  } else {
    console.log(chalk.yellow("Skipped tests"));
  }

  // build
  step("\nBuilding all packages...");
  if (!isSkipBuild) {
    await buildTargets();
  } else {
    console.log(chalk.yellow("Skipped build"));
  }

  // update version
  step("\nUpdating version...");
  await updatePackageVersion(targets, version);

  // generate CHANGELOG.md
  step("\nGenerating changelog...");
  await run("pnpm", ["run", "changelog"]);

  // push commit to github
  await commitCode(version);

  // publish to npm
  for (const target of targets) {
    await publishPackage(target, version);
  }

  // push tag to github
  await createTag(version);

  const releaseTime = (Date.now() - startTime) / 1000;

  console.log(chalk.greenBright(`Release Successful!!! v${version} (${releaseTime}s)`));
}

/**
 * get release version
 */
async function getVersion() {
  let useVersion: string;
  if (!inputVersion) {
    const { version } = await prompt<{ version: string }>({
      message: `Select release type (current ${chalk.cyan(curVer)})`,
      name: "version",
      type: "select",
      choices: bumpChoices.concat({ name: "custom", message: "custom", value: "custom" })
    });
    if (version === "custom") {
      const { customInput } = await prompt<{ customInput: string }>({
        message: "Input custom version",
        type: "input",
        name: "customInput",
        initial: curVer,
        validate: (value: string) => {
          if (!semver.valid(value)) {
            return `invalid target version: ${value}`;
          }
          return true;
        }
      });
      useVersion = customInput;
    } else {
      useVersion = version;
    }
  } else {
    useVersion = inputVersion;
  }

  if (!semver.valid(useVersion)) {
    console.log(chalk.red(`invalid target version: ${chalk.underline(useVersion)}`));
    process.exit(1);
  }

  return useVersion;
}

async function buildTargets() {
  await run("pnpm", ["run", "build", "", "--release"]);
}

async function updatePackageVersion(targets: string[], version: string) {
  // monorepo version
  await modifyVersion(rootJoin("package.json"), "version", version, targets);
  // packages version
  for (const target of targets) {
    await modifyVersion(rootJoin("packages", target, "package.json"), "version", version, targets);
  }

  await run("pnpm", ["run", "setup"]);
}

async function modifyVersion(path: string, key: string, value: string, targets: string[]) {
  const pkg = await fs.readJson(path);
  const old = pkg[key];
  pkg[key] = value;
  console.log(chalk.yellow(`${path} ${key} ${old} -> ${value}`));

  await modifyDepsVersion(path, "dependencies", value, targets, pkg);
  await modifyDepsVersion(path, "devDependencies", value, targets, pkg);

  await fs.writeFile(path, JSON.stringify(pkg, null, 2) + "\n");
}

async function modifyDepsVersion(path: string, key: string, value: string, targets: string[], pkg: any) {
  if (key in pkg && Object.keys(pkg[key]).length) {
    for (const target of targets) {
      const childrenName = `@${rootPkg.name}/${target}`;
      if (childrenName in pkg[key]) {
        const old = pkg[key][childrenName];

        if (old === "workspace:*") continue;

        pkg[key][childrenName] = value;
        console.log(chalk.yellow(`${path} ${key} ${childrenName} ${old} -> ${value}`));
      }
    }
  }
}

async function publishPackage(target: string, version: string) {
  const targetRoot = rootJoin("packages", target);

  let releaseTag: string | null = null;

  if (args.tag) {
    releaseTag = args.tag;
  } else if (version.includes("alpha")) {
    releaseTag = "alpha";
  } else if (version.includes("beta")) {
    releaseTag = "beta";
  } else if (version.includes("rc")) {
    releaseTag = "rc";
  }
  step(`Publishing ${target}...`);

  try {
    await run(
      "pnpm",
      [
        "publish",
        ...(releaseTag ? ["--tag", releaseTag] : []),
        "--access",
        "public",
        "--publish-branch",
        "master"
      ],
      {
        cwd: targetRoot
      }
    );

    console.log(chalk.green(`Successfully published ${target}@v${version}`));
  } catch (error) {
    if (error.stderr.match(/previously published/)) {
      console.log(chalk.red(`Skipping already published: ${target}`));
    } else {
      throw error;
    }
  }
}

async function commitCode(version: string) {
  // check change code commit
  const { stdout } = await run("git", ["diff"], { stdio: "pipe" });
  if (stdout) {
    step("\nCommitting release code...");
    await run("git", ["add", "-A"]);
    await run("git", ["commit", "-m", `release: v${version}`]);
    await run("git", ["push"]);
  } else {
    console.log(chalk.yellow("No changes to commit."));
  }
}

async function createTag(version: string) {
  step("\nCommitting git tag...");
  await run("git", ["tag", `v${version}`]);
  await run("git", ["push", "origin", `refs/tags/v${version}`]);
}
