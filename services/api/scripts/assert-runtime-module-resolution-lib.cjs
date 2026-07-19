/**
 * Shared scanner for unresolved `@/` runtime aliases in emitted API JS.
 * CommonJS so Jest and the .mjs CLI both consume one implementation.
 */
const { readdirSync, readFileSync, statSync, existsSync } = require("node:fs");
const { join, relative } = require("node:path");

/** Match require("@/..."), require.resolve("@/..."), import("@/...") */
const UNRESOLVED_ALIAS_RE =
  /(?:require\.resolve|require|import)\(\s*(['"])@\/[^'"]*\1\s*\)/g;

function shouldScan(filePath) {
  const parts = filePath.split(/[/\\]/);
  if (parts.includes("__tests__")) return false;
  if (filePath.endsWith(".test.js") || filePath.endsWith(".spec.js")) return false;
  if (filePath.endsWith(".js.map")) return false;
  return filePath.endsWith(".js");
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (shouldScan(full)) out.push(full);
  }
  return out;
}

/**
 * @param {string} root
 * @returns {{ file: string, count: number }[]}
 */
function findUnresolvedRuntimeAliases(root) {
  const files = walk(root).sort((a, b) => a.localeCompare(b));
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const matches = stripped.match(UNRESOLVED_ALIAS_RE);
    if (matches && matches.length > 0) {
      hits.push({
        file: relative(root, file) || file,
        count: matches.length,
      });
    }
  }
  return hits;
}

module.exports = {
  findUnresolvedRuntimeAliases,
  UNRESOLVED_ALIAS_RE,
};
