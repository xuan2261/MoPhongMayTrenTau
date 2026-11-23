/**
 * Zero-dependency ESM static bundler for FURUNO FCV-588 standalone HTML.
 * Compiles web/index.html, web/styles.css, web/favicon.svg, and all reachable
 * ES modules in web/** and src/** into a single offline file:// HTML document
 * using native <script type="importmap"> + Base64 data: module URLs.
 */
import {createHash} from "node:crypto";
import {lstat, mkdir, readdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT_REL = "dist/FCV-588-Standalone.html";
const SPECIFIER_PREFIX = "fcv://";
const MAX_ASSET_BYTES = 4_000_000;

const ALLOWED_RUNTIME_EXT = Object.freeze({
  web: new Set([".html", ".mjs", ".js", ".css", ".svg"]),
  src: new Set([".mjs", ".js"]),
});

const REGEX_PRECEDING_KEYWORDS = new Set([
  "return", "throw", "case", "typeof", "void", "delete",
  "in", "instanceof", "new", "yield", "await", "of", "else", "do",
]);

function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

function toPosix(p) {
  return p.replaceAll("\\", "/");
}

async function verifyRuntimeTree(rootDir) {
  for (const [tree, allowedExts] of Object.entries(ALLOWED_RUNTIME_EXT)) {
    const baseDir = path.join(rootDir, tree);
    async function walk(dir) {
      const entries = await readdir(dir, {withFileTypes: true});
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = toPosix(path.relative(rootDir, full));
        if (entry.name.startsWith(".") || entry.isSymbolicLink()) {
          throw new Error(`Forbidden hidden or symlink asset: ${rel}`);
        }
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (!entry.isFile() || !allowedExts.has(ext)) {
          throw new Error(`Forbidden runtime asset type: ${rel}`);
        }
        const st = await lstat(full);
        if (st.isSymbolicLink() || st.size > MAX_ASSET_BYTES) {
          throw new Error(`Oversize or symlink runtime asset: ${rel}`);
        }
      }
    }
    await walk(baseDir);
  }
}

function canStartRegex(prevToken) {
  if (!prevToken) return true;
  if (prevToken.type === "punct") {
    return prevToken.value !== ")" &&
      prevToken.value !== "]" &&
      prevToken.value !== "}" &&
      prevToken.value !== "++" &&
      prevToken.value !== "--";
  }
  if (prevToken.type === "ident") {
    return REGEX_PRECEDING_KEYWORDS.has(prevToken.value);
  }
  return false;
}

function scanTemplateSegment(source, startIndex) {
  let i = startIndex;
  const len = source.length;
  while (i < len) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "`") {
      return {end: i + 1, hasExpr: false};
    }
    if (ch === "$" && source[i + 1] === "{") {
      return {end: i + 2, hasExpr: true};
    }
    i += 1;
  }
  throw new SyntaxError("Unterminated template literal");
}

/**
 * Lexical scanner for ES module source code.
 * Accurately skips comments, regex literals, strings, and nested template literals
 * so import/export specifiers are extracted with exact character offsets.
 */
export function tokenizeModule(source) {
  const tokens = [];
  const templateBraceStack = [];
  let braceDepth = 0;
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
      i += 1;
      continue;
    }

    // Line comment
    if (ch === "/" && source[i + 1] === "/") {
      i += 2;
      while (i < len && source[i] !== "\n" && source[i] !== "\r") i += 1;
      continue;
    }

    // Block comment
    if (ch === "/" && source[i + 1] === "*") {
      const endComment = source.indexOf("*/", i + 2);
      if (endComment === -1) throw new SyntaxError("Unterminated block comment");
      i = endComment + 2;
      continue;
    }

    // String literal
    if (ch === "\"" || ch === "'") {
      const quote = ch;
      const start = i;
      i += 1;
      let rawContent = "";
      while (i < len && source[i] !== quote) {
        if (source[i] === "\\") {
          const esc = source[i + 1];
          if (esc === undefined) throw new SyntaxError("Unterminated string escape");
          rawContent += esc;
          i += 2;
          continue;
        }
        rawContent += source[i];
        i += 1;
      }
      if (i >= len) throw new SyntaxError("Unterminated string literal");
      i += 1;
      tokens.push({type: "string", value: rawContent, start, end: i});
      continue;
    }

    // Template literal head
    if (ch === "`") {
      const seg = scanTemplateSegment(source, i + 1);
      i = seg.end;
      if (seg.hasExpr) {
        templateBraceStack.push(braceDepth);
        tokens.push({type: "punct", value: "${", start: seg.end - 2, end: seg.end});
      } else {
        tokens.push({type: "template", value: "``", start: i - 1, end: i});
      }
      continue;
    }

    // Braces (including template expression resume)
    if (ch === "{") {
      braceDepth += 1;
      tokens.push({type: "punct", value: "{", start: i, end: i + 1});
      i += 1;
      continue;
    }
    if (ch === "}") {
      if (templateBraceStack.length > 0 && braceDepth === templateBraceStack[templateBraceStack.length - 1]) {
        templateBraceStack.pop();
        const seg = scanTemplateSegment(source, i + 1);
        i = seg.end;
        if (seg.hasExpr) {
          templateBraceStack.push(braceDepth);
          tokens.push({type: "punct", value: "${", start: seg.end - 2, end: seg.end});
        } else {
          tokens.push({type: "template", value: "``", start: i - 1, end: i});
        }
        continue;
      }
      braceDepth = Math.max(0, braceDepth - 1);
      tokens.push({type: "punct", value: "}", start: i, end: i + 1});
      i += 1;
      continue;
    }

    // Regex literal vs division operator
    if (ch === "/") {
      const prev = tokens[tokens.length - 1];
      if (canStartRegex(prev)) {
        const start = i;
        i += 1;
        let inClass = false;
        while (i < len) {
          const rc = source[i];
          if (rc === "\\") {
            i += 2;
            continue;
          }
          if (rc === "[") inClass = true;
          else if (rc === "]") inClass = false;
          else if (rc === "/" && !inClass) {
            i += 1;
            while (i < len && /[a-z]/i.test(source[i])) i += 1;
            break;
          }
          i += 1;
        }
        tokens.push({type: "regex", value: source.slice(start, i), start, end: i});
        continue;
      }
    }

    // Identifiers & keywords
    if (/[A-Za-z_$]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < len && /[A-Za-z0-9_$]/.test(source[i])) i += 1;
      tokens.push({type: "ident", value: source.slice(start, i), start, end: i});
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < len && /[0-9A-Za-z_.]/.test(source[i])) i += 1;
      tokens.push({type: "number", value: source.slice(start, i), start, end: i});
      continue;
    }

    // Multi-char ++ / -- punctuators for regex disambiguation
    if ((ch === "+" && source[i + 1] === "+") || (ch === "-" && source[i + 1] === "-")) {
      tokens.push({type: "punct", value: source.slice(i, i + 2), start: i, end: i + 2});
      i += 2;
      continue;
    }

    tokens.push({type: "punct", value: ch, start: i, end: i + 1});
    i += 1;
  }

  return tokens;
}

function skipBraceBlock(tokens, openIndex) {
  let depth = 0;
  for (let idx = openIndex; idx < tokens.length; idx += 1) {
    if (tokens[idx].type === "punct" && tokens[idx].value === "{") depth += 1;
    else if (tokens[idx].type === "punct" && tokens[idx].value === "}") {
      depth -= 1;
      if (depth === 0) return idx;
    }
  }
  throw new SyntaxError("Unbalanced '{' in import/export clause");
}

/**
 * Extracts all ES module specifier string tokens from a tokenized module.
 */
export function findModuleSpecifiers(source) {
  const tokens = tokenizeModule(source);
  const specifiers = [];

  for (let k = 0; k < tokens.length; k += 1) {
    const tok = tokens[k];
    const prev = tokens[k - 1];
    if (tok.type !== "ident" || (prev?.type === "punct" && prev.value === ".")) continue;

    if (tok.value === "import") {
      const next = tokens[k + 1];
      if (!next) continue;
      // import.meta
      if (next.type === "punct" && next.value === ".") continue;
      // Dynamic import("...")
      if (next.type === "punct" && next.value === "(") {
        const arg = tokens[k + 2];
        if (arg?.type === "string") {
          specifiers.push(arg);
        }
        continue;
      }
      // Side-effect import "..."
      if (next.type === "string") {
        specifiers.push(next);
        continue;
      }
      // Static import <ImportClause> from "..."
      let m = k + 1;
      while (m < tokens.length) {
        const cur = tokens[m];
        if (cur.type === "punct" && cur.value === "{") {
          m = skipBraceBlock(tokens, m) + 1;
          continue;
        }
        if (cur.type === "ident" && cur.value === "from" && tokens[m + 1]?.type === "string") {
          specifiers.push(tokens[m + 1]);
          k = m + 1;
          break;
        }
        if (cur.type === "punct" && cur.value === ";") break;
        m += 1;
      }
      continue;
    }

    if (tok.value === "export") {
      const next = tokens[k + 1];
      if (!next || next.type !== "punct") continue;
      // export * [as ns] from "..."
      if (next.value === "*") {
        let m = k + 2;
        if (tokens[m]?.type === "ident" && tokens[m].value === "as") {
          m += 2;
        }
        if (tokens[m]?.type === "ident" && tokens[m].value === "from" && tokens[m + 1]?.type === "string") {
          specifiers.push(tokens[m + 1]);
          k = m + 1;
        }
        continue;
      }
      // export { ... } from "..."
      if (next.value === "{") {
        const closeIdx = skipBraceBlock(tokens, k + 1);
        const after = tokens[closeIdx + 1];
        if (after?.type === "ident" && after.value === "from" && tokens[closeIdx + 2]?.type === "string") {
          specifiers.push(tokens[closeIdx + 2]);
          k = closeIdx + 2;
        }
      }
    }
  }

  return specifiers;
}

function resolveAssetPath(rootDir, fromRelPath, rawSpec) {
  let targetFull;
  if (rawSpec.startsWith("/")) {
    targetFull = path.resolve(rootDir, "." + rawSpec);
  } else if (rawSpec.startsWith("./") || rawSpec.startsWith("../")) {
    const fromDir = path.dirname(path.join(rootDir, fromRelPath));
    targetFull = path.resolve(fromDir, rawSpec);
  } else {
    throw new Error(`Unsupported bare/external specifier "${rawSpec}" in ${fromRelPath}`);
  }
  const rel = toPosix(path.relative(rootDir, targetFull));
  if (rel.startsWith("../") || path.isAbsolute(rel) || (!rel.startsWith("src/") && !rel.startsWith("web/"))) {
    throw new Error(`Resolved path "${rel}" escapes src/ and web/ from ${fromRelPath}`);
  }
  return {targetFull, rel};
}

function parseHtmlAttributes(tagHtml) {
  const attrs = new Map();
  const attrRegex = /([A-Za-z_:][-A-Za-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match = attrRegex.exec(tagHtml);
  // Skip tag name
  match = attrRegex.exec(tagHtml);
  while (match) {
    const name = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? "";
    attrs.set(name, val);
    match = attrRegex.exec(tagHtml);
  }
  return attrs;
}

async function inlineCssSvgUrls(rootDir, cssRelPath, cssSource) {
  const matches = [...cssSource.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s"']+))\s*\)/g)];
  if (matches.length === 0) return cssSource;
  let result = "";
  let cursor = 0;
  for (const m of matches) {
    const rawUrl = m[1] ?? m[2] ?? m[3] ?? "";
    if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("#")) continue;
    const {targetFull, rel} = resolveAssetPath(rootDir, cssRelPath, rawUrl);
    if (path.extname(rel).toLowerCase() !== ".svg") {
      throw new Error(`Unsupported CSS asset URL "${rawUrl}" in ${cssRelPath}`);
    }
    const svgBytes = await readFile(targetFull);
    const dataUrl = `data:image/svg+xml;base64,${svgBytes.toString("base64")}`;
    result += cssSource.slice(cursor, m.index) + `url("${dataUrl}")`;
    cursor = m.index + m[0].length;
  }
  result += cssSource.slice(cursor);
  return result;
}

/**
 * Builds the standalone single-file HTML bundle in memory and optionally writes to disk.
 */
export async function buildStandaloneHtml({
  rootDir = DEFAULT_ROOT,
  outFile = path.join(rootDir, DEFAULT_OUT_REL),
  write = true,
} = {}) {
  await verifyRuntimeTree(rootDir);

  const indexRel = "web/index.html";
  const indexHtml = await readFile(path.join(rootDir, indexRel), "utf8");

  // Discover module script tags in web/index.html
  const scriptTagRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const entryModules = [];
  for (const m of indexHtml.matchAll(scriptTagRegex)) {
    const openTag = m[0].slice(0, m[0].indexOf(">") + 1);
    const attrs = parseHtmlAttributes(openTag);
    if (attrs.get("type")?.toLowerCase() === "module" && attrs.get("src")) {
      const {rel} = resolveAssetPath(rootDir, indexRel, attrs.get("src"));
      if (!entryModules.includes(rel)) entryModules.push(rel);
    }
  }
  if (entryModules.length === 0) {
    throw new Error("No <script type=\"module\" src=\"...\"> entry points found in web/index.html");
  }

  // Recursively walk & topologically sort reachable ES modules (dependency-first)
  const visited = new Set();
  const ordered = [];
  const rewrittenModules = new Map();

  async function visitModule(modRel) {
    if (visited.has(modRel)) return;
    visited.add(modRel);

    const fullPath = path.join(rootDir, modRel);
    const source = await readFile(fullPath, "utf8");
    if (/\bimport\.meta\b/.test(source)) {
      // Double-check with lexical tokens so comments mentioning import.meta don't false-positive
      const toks = tokenizeModule(source);
      for (let idx = 0; idx < toks.length - 2; idx += 1) {
        if (toks[idx].type === "ident" && toks[idx].value === "import" &&
            toks[idx + 1].type === "punct" && toks[idx + 1].value === "." &&
            toks[idx + 2].type === "ident" && toks[idx + 2].value === "meta") {
          throw new Error(`Unsupported runtime import.meta in ${modRel}`);
        }
      }
    }

    const specTokens = findModuleSpecifiers(source);
    const replacements = [];
    const deps = [];

    for (const specTok of specTokens) {
      const {targetFull, rel: depRel} = resolveAssetPath(rootDir, modRel, specTok.value);
      const st = await lstat(targetFull);
      if (!st.isFile() || st.isSymbolicLink()) {
        throw new Error(`Missing or invalid imported module "${depRel}" from ${modRel}`);
      }
      deps.push(depRel);
      replacements.push({
        start: specTok.start,
        end: specTok.end,
        replacement: JSON.stringify(SPECIFIER_PREFIX + depRel),
      });
    }

    for (const depRel of deps) {
      await visitModule(depRel);
    }

    let outCode = "";
    let lastIdx = 0;
    for (const rep of replacements) {
      outCode += source.slice(lastIdx, rep.start) + rep.replacement;
      lastIdx = rep.end;
    }
    outCode += source.slice(lastIdx);

    rewrittenModules.set(modRel, outCode);
    ordered.push(modRel);
  }

  for (const entryRel of entryModules) {
    await visitModule(entryRel);
  }

  // Verify zero unresolved relative specifiers remain in any bundled module
  const importMap = {imports: {}};
  for (const modRel of ordered) {
    const code = rewrittenModules.get(modRel);
    const checkSpecs = findModuleSpecifiers(code);
    for (const specTok of checkSpecs) {
      if (!specTok.value.startsWith(SPECIFIER_PREFIX)) {
        throw new Error(`Unresolved module specifier "${specTok.value}" remaining in ${modRel}`);
      }
    }
    importMap.imports[SPECIFIER_PREFIX + modRel] =
      `data:text/javascript;charset=utf-8;base64,${Buffer.from(code, "utf8").toString("base64")}`;
  }

  for (const modRel of ordered) {
    const code = rewrittenModules.get(modRel);
    for (const specTok of findModuleSpecifiers(code)) {
      if (!Object.hasOwn(importMap.imports, specTok.value)) {
        throw new Error(`Dangling bare specifier "${specTok.value}" in ${modRel}`);
      }
    }
  }

  // Transform web/index.html: inline favicon(s), stylesheet(s), importmap, and module entrypoints
  let bundledHtml = indexHtml;

  // 1. Inline <link ...> tags (icon & stylesheet)
  const linkMatches = [...bundledHtml.matchAll(/<link\b[^>]*>/gi)];
  for (let idx = linkMatches.length - 1; idx >= 0; idx -= 1) {
    const m = linkMatches[idx];
    const tag = m[0];
    const attrs = parseHtmlAttributes(tag);
    const relAttr = (attrs.get("rel") ?? "").toLowerCase();
    const hrefAttr = attrs.get("href");
    if (!hrefAttr) continue;

    if (relAttr.split(/\s+/).includes("icon")) {
      const {targetFull, rel} = resolveAssetPath(rootDir, indexRel, hrefAttr);
      if (path.extname(rel).toLowerCase() !== ".svg") {
        throw new Error(`Expected SVG icon, got ${rel}`);
      }
      const svgBase64 = (await readFile(targetFull)).toString("base64");
      const newTag = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${svgBase64}">`;
      bundledHtml = bundledHtml.slice(0, m.index) + newTag + bundledHtml.slice(m.index + tag.length);
    } else if (relAttr.split(/\s+/).includes("stylesheet")) {
      const {targetFull, rel} = resolveAssetPath(rootDir, indexRel, hrefAttr);
      const rawCss = await readFile(targetFull, "utf8");
      const inlinedCss = (await inlineCssSvgUrls(rootDir, rel, rawCss))
        .replace(/<\/style/gi, "<\\/style");
      const styleBlock = `<style>\n${inlinedCss}\n</style>`;
      bundledHtml = bundledHtml.slice(0, m.index) + styleBlock + bundledHtml.slice(m.index + tag.length);
    }
  }

  // 2. Replace <script type="module" src="..."> tags and prepend <script type="importmap">
  const importMapJson = JSON.stringify(importMap).replace(/</g, "\\u003c");
  const importMapTag = `<script type="importmap">${importMapJson}</script>`;
  const moduleScriptMatches = [...bundledHtml.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)];
  let firstModuleReplaced = false;
  let rebuiltHtml = "";
  let htmlCursor = 0;

  for (const m of moduleScriptMatches) {
    const fullTag = m[0];
    const openTag = fullTag.slice(0, fullTag.indexOf(">") + 1);
    const attrs = parseHtmlAttributes(openTag);
    if (attrs.get("type")?.toLowerCase() !== "module" || !attrs.get("src")) continue;

    const {rel} = resolveAssetPath(rootDir, indexRel, attrs.get("src"));
    const inlineModuleTag = `<script type="module">import ${JSON.stringify(SPECIFIER_PREFIX + rel)};</script>`;
    const replacement = firstModuleReplaced
      ? inlineModuleTag
      : `${importMapTag}\n  ${inlineModuleTag}`;
    firstModuleReplaced = true;

    rebuiltHtml += bundledHtml.slice(htmlCursor, m.index) + replacement;
    htmlCursor = m.index + fullTag.length;
  }
  rebuiltHtml += bundledHtml.slice(htmlCursor);
  bundledHtml = rebuiltHtml;

  // Final self-contained integrity assertions
  if (ordered.length < 30) {
    throw new Error(`Expected at least 30 bundled modules, got ${ordered.length}`);
  }
  if (!/^<!doctype html>/i.test(bundledHtml.trimStart())) {
    throw new Error("Bundled HTML missing <!doctype html> declaration");
  }
  const importMapPos = bundledHtml.indexOf("<script type=\"importmap\">");
  const firstModPos = bundledHtml.indexOf("<script type=\"module\">");
  if (importMapPos === -1 || firstModPos === -1 || importMapPos > firstModPos) {
    throw new Error("<script type=\"importmap\"> must precede all <script type=\"module\"> tags");
  }
  if (/(?:href|src)\s*=\s*["']\/(?:web|src)\//i.test(bundledHtml)) {
    throw new Error("Uninlined /web/ or /src/ asset URL remaining in standalone HTML");
  }

  const htmlBytes = Buffer.from(bundledHtml, "utf8");
  const digest = sha256Hex(htmlBytes);

  if (write) {
    await mkdir(path.dirname(outFile), {recursive: true});
    await writeFile(outFile, htmlBytes);
  }

  return {
    status: write ? "STANDALONE_HTML_BUILT" : "STANDALONE_HTML_CHECK_PASS",
    output: toPosix(path.relative(rootDir, outFile)),
    modulesBundled: ordered.length,
    moduleOrder: ordered,
    bytes: htmlBytes.length,
    sha256: digest,
    html: bundledHtml,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const isCheck = process.argv.includes("--check");
  const result = await buildStandaloneHtml({write: !isCheck});
  const summary = isCheck
    ? {
        status: result.status,
        modulesBundled: result.modulesBundled,
        bytes: result.bytes,
        sha256: result.sha256,
      }
    : {
        status: result.status,
        output: result.output,
        modulesBundled: result.modulesBundled,
        bytes: result.bytes,
        sha256: result.sha256,
      };
  console.log(JSON.stringify(summary));
}
