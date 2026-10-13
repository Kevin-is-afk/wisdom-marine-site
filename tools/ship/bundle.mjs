// Bundles ../../src/ship.src.js (+ three.js, tree-shaken) into ../../js/ship.js. Run: npm run bundle
import { build } from "esbuild"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const r = await build({
  entryPoints: [path.resolve(here, "../../src/ship.src.js")], outfile: path.resolve(here, "../../js/ship.js"),
  nodePaths: [path.resolve(here, "node_modules")], bundle: true, minify: true, format: "iife", target: "es2020", legalComments: "none", metafile: true,
});
const out = Object.values(r.metafile.outputs)[0].bytes;
console.log("js/ship.js", Math.round(out / 1024) + " KB");
