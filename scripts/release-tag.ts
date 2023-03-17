import { Octokit } from "octokit";
import changelog from "conventional-changelog";
import prettier from "prettier";

import { args, getLocalEnv, rootJoin } from "./utils";
import rootPkg from "../package.json";
import chalk from "chalk";

const inputName = args.n || args.name;
const inputTag = args.t || args.tag;
const inputDraft = args.d || args.draft;
const isWorkflows = args.wf || args.workflows;

main();

async function main() {
  const tokens = isWorkflows ? { GITHUB_TOKEN: process.env.GITHUB_TOKEN } : await getLocalEnv();

  if (!tokens.GITHUB_TOKEN) {
    throw new Error("Create github release must need 'GITHUB_TOKEN'");
  }

  if (!inputTag) {
    throw new Error("You must input tag");
  }

  const owner = rootPkg.author.split(" ")[0] || "wermdany";
  const repo = rootPkg.name;
  const tag = inputTag.replace("refs/tags/", "");
  const name = inputName || tag;
  const body = await genChangelog();
  const draft = inputDraft || false;
  const prerelease = /\d-[a-z]/.test(tag);

  const github = new Octokit({
    auth: tokens.GITHUB_TOKEN
  });

  try {
    await github.request("POST /repos/{owner}/{repo}/releases", {
      owner,
      repo,
      tag_name: tag,
      name,
      body,
      draft,
      prerelease
    });
  } catch (error) {
    console.log(chalk.red(error.message));
    process.exit(1);
  }
}

function genChangelog(): Promise<string> {
  return new Promise(resolve => {
    const readable = changelog({
      preset: "angular",
      releaseCount: 2
    });

    const chunks: string[] = [];

    readable.setEncoding("utf-8");

    readable.on("data", async chunk => {
      chunks.push(chunk);
    });

    readable.on("end", async () => {
      const options = await prettier.resolveConfig(rootJoin(".prettierrc"));
      const result = prettier.format(chunks.join(""), { parser: "markdown", ...options });
      console.log(chunks);
      resolve(result);
    });
    readable.on("error", err => {
      throw err;
    });
  });
}
