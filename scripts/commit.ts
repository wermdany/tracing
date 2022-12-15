import { join } from "node:path";

import chalk from "chalk";

console.log(chalk.underline(join("aaa", "t.gif")));

console.log(join("aaa/", "t.gif"));
