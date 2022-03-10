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
const end = (msg: string) => console.log(chalk.greenBright(msg));

release(targets);

async function release(targets: string[]) {
  // 获取需要生产的版本
  const version = await getVersion();
  // 二次确认
  const { Y } = await prompt<{ Y: boolean }>({
    message: `是否确认本次生产? v${version},${targets.join(",")}`,
    type: "toggle",
    name: "Y"
  });

  if (!Y) {
    return;
  }

  // 代码测试
  step("\n开始运行单元测试...");
  if (!isSkipTest) {
    await run("pnpm", ["run", "test:unit"]);
  } else {
    console.log(chalk.yellow("跳过单元测试"));
  }
  end("\n单元测试结束");

  // 打包
  step("\n开始打包...");
  if (!isSkipBuild) {
    await buildTargets();
  } else {
    console.log(chalk.yellow("跳过打包"));
  }
  end("\n打包结束");

  // 修改关联版本
  step("\n更新版本号...");
  await updatePackageVersion(targets, version);
  end("\n更新版本号结束");

  // 生成 CHANGELOG.md
  step("\n生成修改日志文件...");
  await run("pnpm", ["run", "changelog"]);
  end("\n生成修改日志文件完成");

  // 提交提交代码
  await commitCode(version);

  // 发布推送代码至仓库
  await createTag(version);

  // 发布 NPM
  // await publishPackages();
  console.log(chalk.greenBright(`发布生产:v${version}成功！`));
}

/**
 * get release version
 */
async function getVersion() {
  let useVersion: string;
  if (!inputVersion) {
    const { version } = await prompt<{ version: string }>({
      message: `请选择生产版本 (当前 ${chalk.cyan(curVer)})`,
      name: "version",
      type: "select",
      choices: bumpChoices.concat({ name: "custom", message: "custom", value: "custom" })
    });
    if (version === "custom") {
      const { customInput } = await prompt<{ customInput: string }>({
        message: "请手动输入版本号",
        type: "input",
        name: "customInput",
        initial: curVer,
        validate: (value: string) => {
          if (!semver.valid(value)) {
            return `版本号无效: ${value}`;
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
    console.log(chalk.red(`版本号无效: ${chalk.underline(useVersion)}`));
    process.exit(1);
  }

  return useVersion;
}

async function buildTargets() {
  await run("pnpm", ["run", "build", "--", "--release"]);
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
        pkg[key][childrenName] = value;
        console.log(chalk.yellow(`${path} ${key} ${childrenName} ${old} -> ${value}`));
      }
    }
  }
}

// async function publishPackages(targets: string[], version: string) {}

async function commitCode(version: string) {
  // 检测是否进行了代码改变
  const { stdout } = await run("git", ["diff"], { stdio: "pipe" });
  if (stdout) {
    step("\n提交修改内容...");
    await run("git", ["add", "-A"]);
    await run("git", ["commit", "-m", `release: v${version}`]);
    await run("git", ["push"]);
  } else {
    console.log(chalk.yellow(`当前没有需要提交的代码！`));
  }
  end("提交修改内容结束");
}

async function createTag(version: string) {
  step("\n创建Tag并提交...");
  await run("git", ["tag", `v${version}`]);
  await run("git", ["push", "origin", `refs/tags/v${version}`]);
  end("创建Tag并提交完成");
}
