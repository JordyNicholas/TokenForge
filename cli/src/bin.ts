import { runCli } from "./cli";

const code = await runCli(process.argv.slice(2));
process.exitCode = code;
