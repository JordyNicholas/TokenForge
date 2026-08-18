import * as esBuild from "esbuild";

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/index.ts"],
  outfile: "dist/extension.js",
  bundle: true,
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  sourcemap: true,
  logLevel: "info"
};

if (watch) {
  const context = await esBuild.context(options);
  await context.watch();
} else {
  await esBuild.build(options);
}
