/**
 * Synchronizes canonical root src/ and web/ into apps/fcv588-electron-p30/
 * while preserving Electron-specific desktop settings transfer modules.
 */
import {lstat, mkdir, readdir, readFile, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ELECTRON_DIR = path.join(DEFAULT_ROOT, "apps", "fcv588-electron-p30");
const PRESERVED_WEB_FILES = Object.freeze([
  "desktop-settings-core.mjs",
  "desktop-settings.mjs",
]);
const ALLOWED_EXT = Object.freeze({
  src: new Set([".mjs", ".js"]),
  web: new Set([".html", ".mjs", ".js", ".css", ".svg"]),
});
const MAX_BYTES = 4_000_000;

async function copyValidatedTree(sourceBase, destBase, allowedExts) {
  const copied = [];
  async function walk(relDir) {
    const fromDir = relDir ? path.join(sourceBase, relDir) : sourceBase;
    const toDir = relDir ? path.join(destBase, relDir) : destBase;
    await mkdir(toDir, {recursive: true});
    const entries = await readdir(fromDir, {withFileTypes: true});
    for (const entry of entries) {
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      const fromFull = path.join(fromDir, entry.name);
      const toFull = path.join(toDir, entry.name);
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) {
        throw new Error(`Forbidden hidden or symlink asset during sync: ${relPath}`);
      }
      if (entry.isDirectory()) {
        await walk(relPath);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!entry.isFile() || !allowedExts.has(ext)) {
        throw new Error(`Forbidden runtime file extension during sync: ${relPath}`);
      }
      const st = await lstat(fromFull);
      if (st.isSymbolicLink() || st.size > MAX_BYTES) {
        throw new Error(`Oversize or symlink asset during sync: ${relPath}`);
      }
      const data = await readFile(fromFull);
      await writeFile(toFull, data);
      copied.push(relPath);
    }
  }
  await walk("");
  return copied.sort();
}

function ensureDesktopSettingsScriptTag(indexHtml) {
  if (/\/web\/desktop-settings\.mjs\b/.test(indexHtml)) {
    return indexHtml;
  }
  const appScriptPattern = /(<script\b[^>]*src=["']\/web\/app\.mjs["'][^>]*><\/script>)/i;
  if (appScriptPattern.test(indexHtml)) {
    return indexHtml.replace(
      appScriptPattern,
      "$1\n  <script type=\"module\" src=\"/web/desktop-settings.mjs\"></script>",
    );
  }
  return indexHtml.replace(
    /<\/head>/i,
    "  <script type=\"module\" src=\"/web/desktop-settings.mjs\"></script>\n</head>",
  );
}

export async function syncFcv588Electron({
  rootDir = DEFAULT_ROOT,
  electronDir = DEFAULT_ELECTRON_DIR,
} = {}) {
  const electronSrcDir = path.join(electronDir, "src");
  const electronWebDir = path.join(electronDir, "web");

  // Read preserved Electron-specific web modules before replacing web/
  const preservedContents = new Map();
  for (const fileName of PRESERVED_WEB_FILES) {
    const filePath = path.join(electronWebDir, fileName);
    const bytes = await readFile(filePath);
    preservedContents.set(fileName, bytes);
  }

  // Replace apps/fcv588-electron-p30/src with canonical root src/
  await rm(electronSrcDir, {recursive: true, force: true});
  const srcFiles = await copyValidatedTree(
    path.join(rootDir, "src"),
    electronSrcDir,
    ALLOWED_EXT.src,
  );

  // Replace apps/fcv588-electron-p30/web with canonical root web/ + preserved desktop files
  await rm(electronWebDir, {recursive: true, force: true});
  const webFiles = await copyValidatedTree(
    path.join(rootDir, "web"),
    electronWebDir,
    ALLOWED_EXT.web,
  );

  for (const [fileName, bytes] of preservedContents.entries()) {
    await writeFile(path.join(electronWebDir, fileName), bytes);
    if (!webFiles.includes(fileName)) webFiles.push(fileName);
  }

  // Ensure Electron web/index.html loads /web/desktop-settings.mjs cleanly
  const indexHtmlPath = path.join(electronWebDir, "index.html");
  const rawIndexHtml = await readFile(indexHtmlPath, "utf8");
  const syncedIndexHtml = ensureDesktopSettingsScriptTag(rawIndexHtml);
  if (syncedIndexHtml !== rawIndexHtml) {
    await writeFile(indexHtmlPath, syncedIndexHtml, "utf8");
  }

  webFiles.sort();
  return {
    status: "ELECTRON_RUNTIME_SYNCED",
    srcFiles: srcFiles.length,
    webFiles: webFiles.length,
    preservedDesktopFiles: [...PRESERVED_WEB_FILES],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await syncFcv588Electron();
  console.log(JSON.stringify(result));
}
