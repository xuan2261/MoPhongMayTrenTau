/**
 * Syncs canonical root src/ and web/ into apps/fcv588-electron-p30/ and builds
 * the clean offline Electron application bundle with SHA-256 runtime manifest.
 * Enforces strict security gates: zero symlinks, allowed extensions only,
 * zero files > 4 MB, and zero restricted OEM PDF/JPG files.
 */
import {createHash} from "node:crypto";
import {lstat, mkdir, readdir, readFile, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {syncFcv588Electron} from "../../../tools/sync_fcv588_electron.mjs";

const stage = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = path.resolve(stage, "..", "..");
const target = path.join(stage, "bundle");

const ALLOWED = Object.freeze({
  web: new Set([".html", ".mjs", ".js", ".css", ".svg"]),
  src: new Set([".mjs", ".js"]),
});
const FORBIDDEN_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".zip", ".exe", ".dll"]);
const MAX_FILE_BYTES = 4_000_000;

const hash = data => createHash("sha256").update(data).digest("hex");

export async function buildElectronBundle({
  rootDir = project,
  stageDir = stage,
  bundleDir = target,
} = {}) {
  await syncFcv588Electron({rootDir, electronDir: stageDir});

  const hashes = {};
  let totalBytes = 0;

  for (const tree of ["src", "web"]) {
    const basedir = path.join(stageDir, tree);
    async function visit(at) {
      const files = await readdir(at, {withFileTypes: true});
      for (const entry of files) {
        const full = path.join(at, entry.name);
        const rel = path.relative(stageDir, full).replaceAll(path.sep, "/");
        if (entry.name.startsWith(".") || entry.isSymbolicLink()) {
          throw new Error("symlink or hidden asset denied: " + rel);
        }
        if (entry.isDirectory()) {
          await visit(full);
          continue;
        }
        if (!entry.isFile()) {
          throw new Error("unknown asset type: " + rel);
        }
        const ext = path.extname(full).toLowerCase();
        if (FORBIDDEN_EXT.has(ext) || !ALLOWED[tree].has(ext)) {
          throw new Error("unexpected or restricted runtime asset type: " + rel);
        }
        const bytes = await readFile(full);
        if (bytes.length > MAX_FILE_BYTES) {
          throw new Error("oversize source: " + rel);
        }
        hashes[rel] = hash(bytes);
        totalBytes += bytes.length;
      }
    }
    await visit(basedir);
  }

  const stagePkg = JSON.parse(await readFile(path.join(stageDir, "package.json"), "utf8"));
  const runtimePkg = {
    name: stagePkg.name || "fcv588-standalone-simulator",
    version: stagePkg.version || "1.0.0",
    private: true,
    license: stagePkg.license || "MIT",
    author: stagePkg.author || "MoPhongMayTrenTau",
    description: stagePkg.description || "FURUNO FCV-588 — Mô phỏng Máy Đo Sâu Dò Cá Độc Lập",
    main: "desktop/main.cjs",
  };

  const sortedWebSrcPaths = Object.keys(hashes).sort();
  const objects = [
    ...sortedWebSrcPaths,
    "desktop/main.cjs",
  ];

  await rm(bundleDir, {recursive: true, force: true});
  await mkdir(bundleDir, {recursive: true});

  for (const rel of objects) {
    const from = path.join(stageDir, rel);
    const to = path.join(bundleDir, rel);
    if ((await lstat(from)).isSymbolicLink()) {
      throw new Error("symlink denied: " + rel);
    }
    const bytes = await readFile(from);
    if (bytes.length > MAX_FILE_BYTES) {
      throw new Error("oversize bundle file: " + rel);
    }
    if (rel === "desktop/main.cjs") {
      hashes[rel] = hash(bytes);
      totalBytes += bytes.length;
    }
    await mkdir(path.dirname(to), {recursive: true});
    await writeFile(to, bytes, {flag: "wx"});
  }

  const pkgBytes = Buffer.from(JSON.stringify(runtimePkg, null, 2) + "\n", "utf8");
  await writeFile(path.join(bundleDir, "package.json"), pkgBytes, {flag: "wx"});
  hashes["package.json"] = hash(pkgBytes);
  totalBytes += pkgBytes.length;

  const manifest = {
    schema: "FCV588_ELECTRON_RUNTIME_MANIFEST_V1",
    version: runtimePkg.version,
    fileCount: Object.keys(hashes).length,
    webSrcFiles: sortedWebSrcPaths.length,
    totalBytes,
    forbiddenOEMFilesPacked: 0,
    files: Object.fromEntries(Object.keys(hashes).sort().map(k => [k, hashes[k]])),
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n", "utf8");
  const manifestFile = path.join(bundleDir, "runtime-manifest.json");
  await writeFile(manifestFile, manifestBytes, {flag: "wx"});

  return {
    status: "BUNDLE_ALLOWLIST_PASS",
    webSrcFiles: sortedWebSrcPaths.length,
    packageFiles: Object.keys(hashes).length,
    manifestPath: "bundle/runtime-manifest.json",
    manifestSHA256: hash(manifestBytes),
    forbiddenOEMFilesPacked: 0,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const summary = await buildElectronBundle();
  console.log(JSON.stringify(summary));
}
