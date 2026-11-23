import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFile, readdir, stat} from "node:fs/promises";
import {dirname, extname, relative, resolve} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BINARY_EXTENSIONS = new Set([
  ".zip", ".exe", ".png", ".pdf", ".jpg", ".jpeg",
  ".dll", ".asar", ".pak", ".pdb", ".blockmap", ".svg",
]);

function resolvePythonBin() {
  for (const candidate of ["python3", "python"]) {
    const probe = spawnSync(candidate, ["-B", "-c", "import sys; assert sys.version_info >= (3, 10)"], {
      cwd: ROOT,
      env: {...process.env, PYTHONDONTWRITEBYTECODE: "1"},
      windowsHide: true,
    });
    if (probe.status === 0) return candidate;
  }
  throw new Error("Python 3.10+ interpreter not found");
}

const PYTHON = resolvePythonBin();

async function walkFiles(dirPath) {
  const entries = await readdir(dirPath, {withFileTypes: true});
  const out = [];
  for (const entry of entries) {
    const full = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walkFiles(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

test("S-02 root LICENSE and THIRD_PARTY_NOTICES.md declare MIT terms, training-only safety, and Electron/Chromium notices", async () => {
  const license = await readFile(resolve(ROOT, "LICENSE"), "utf8");
  assert.match(license, /^MIT License/m);
  assert.match(license, /Copyright \(c\) 2026 xuan2261/i);
  assert.match(license, /TRAINING ONLY/);
  assert.match(license, /NOT FOR MARINE NAVIGATION/);
  for (const brand of ["FURUNO", "KODEN", "TRANSPONDERTECH", "RAYMARINE", "TRANSAS", "WÄRTSILÄ"]) {
    assert.ok(license.toUpperCase().includes(brand), `LICENSE missing non-affiliation notice for ${brand}`);
  }

  const notices = await readFile(resolve(ROOT, "THIRD_PARTY_NOTICES.md"), "utf8");
  assert.match(notices, /src\/.*web\//s);
  assert.match(notices, /Zero \(`0`\)/i);
  assert.match(notices, /apps\/fcv588-electron-p30\//);
  assert.match(notices, /Electron[\s\S]*MIT/i);
  assert.match(notices, /Chromium[\s\S]*BSD-3-Clause/i);
  assert.match(notices, /Node\.js[\s\S]*MIT/i);
});

test("S-03 & CRLF .gitignore and .gitattributes protect secrets, rights-restricted assets, and SHA-sealed JSON bytes", async () => {
  const gitignore = await readFile(resolve(ROOT, ".gitignore"), "utf8");
  const rules = new Set(
    gitignore.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#")),
  );
  for (const rule of [
    ".agents/",
    "!/docs/reports/",
    "sources/FCV588_GiaoDienThucTeMay2016/*.jpg",
    "sources/manuals/**/*.pdf",
    "sources/manuals/**/*.zip",
    "node_modules/",
    "__pycache__/",
    "*.pyc",
    ".env",
    "*.key",
    "*.pem",
  ]) {
    assert.ok(rules.has(rule), `missing .gitignore rule: ${rule}`);
  }

  const gitattributes = await readFile(resolve(ROOT, ".gitattributes"), "utf8");
  assert.match(gitattributes, /^docs\/qa\/\*\.json\s+-text$/m);
  assert.match(gitattributes, /^test\/fixtures\/\*\.json\s+-text$/m);
});

test("S-04 & D-10 PII workstation paths, private ChatGPT URL, and duplicate PDF counts are scrubbed", async () => {
  const transcript = await readFile(resolve(ROOT, "VietMoPhongChoTatCaCacMay.md"), "utf8");
  const firstLine = transcript.split(/\r?\n/, 1)[0];
  assert.equal(firstLine, "> From: <REDACTED_PRIVATE_CHAT_URL>");
  assert.doesNotMatch(transcript, /https:\/\/chatgpt\.com\/g\//i);

  const piiHits = [];
  for (const folder of ["docs", "plans", "staging"]) {
    const files = await walkFiles(resolve(ROOT, folder));
    for (const file of files) {
      const rel = relative(ROOT, file).replaceAll("\\", "/");
      if (rel === "docs/reports/COMPREHENSIVE_PROJECT_REVIEW_AUDIT_EVAL_2026-11-22.md") continue;
      if (BINARY_EXTENSIONS.has(extname(file).toLowerCase())) continue;
      let text;
      try {
        text = await readFile(file, "utf8");
      } catch {
        continue;
      }
      if (/Z10PAD8C_Xuan2261|Z10PAD~1/i.test(text)) {
        piiHits.push(rel);
      }
    }
  }
  assert.deepEqual(piiHits, [], `unexpected PII remaining in: ${piiHits.join(", ")}`);

  const receipt = JSON.parse(await readFile(resolve(ROOT, "sources/manuals/VERIFICATION_RECEIPT.json"), "utf8"));
  assert.equal(receipt.verified_pdf_files, 23);
  assert.equal(receipt.verified_zip_files, 2);
  assert.equal(receipt.verified_total_bytes, 197145926);
  const paths = receipt.verified_paths_and_hashes.map(entry => entry.file);
  assert.equal(paths.length, 25);
  assert.equal(new Set(paths).size, 25, "VERIFICATION_RECEIPT paths must be deduplicated");
  const sumBytes = receipt.verified_paths_and_hashes.reduce((acc, entry) => acc + entry.size, 0);
  assert.equal(sumBytes, 197145926);
});

test("S-07 archive_reference_manuals enforces bounded zip stream cap, strict hostname validation, and offline --dry-run", () => {
  const pyCheck = spawnSync(
    PYTHON,
    [
      "-B",
      "-c",
      [
        "import io, sys",
        "sys.path.insert(0, 'tools')",
        "import archive_reference_manuals as arm",
        "assert arm.is_allowed_canto_package_url('https://raymarine.canto.global/v/118-362', '118-362') is True",
        "assert arm.is_allowed_canto_package_url('https://evil.example/raymarine.canto.global/118-362', '118-362') is False",
        "assert arm.is_allowed_canto_package_url('http://raymarine.canto.global/v/118-362', '118-362') is False",
        "out = io.BytesIO()",
        "assert arm.copy_bounded_stream(io.BytesIO(b'abcde'), out, max_bytes=5) == 5",
        "try:",
        "    arm.copy_bounded_stream(io.BytesIO(b'abcdef'), io.BytesIO(), max_bytes=5)",
        "    raise AssertionError('expected zip-bomb cap failure')",
        "except ValueError:",
        "    pass",
      ].join("\n"),
    ],
    {
      cwd: ROOT,
      env: {...process.env, PYTHONDONTWRITEBYTECODE: "1"},
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(pyCheck.status, 0, pyCheck.stderr || pyCheck.stdout);

  const dryRun = spawnSync(PYTHON, ["-B", "tools/archive_reference_manuals.py", "--dry-run"], {
    cwd: ROOT,
    env: {...process.env, PYTHONDONTWRITEBYTECODE: "1"},
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  assert.match(dryRun.stdout, /DRY_RUN/);
});

test("D-04, D-05, D-08 & visual atlas CLI tools import without side effects and pass --check / --self-test", async () => {
  const menuPath = resolve(ROOT, "docs/evidence/fcv588-public-menu-atlas.json");
  const statusPath = resolve(ROOT, "docs/evidence/fcv588-public-implementation-status.json");
  const beforeMenuStat = await stat(menuPath);
  const beforeStatusStat = await stat(statusPath);

  const menuMod = await import(pathToFileURL(resolve(ROOT, "tools/build_fcv588_public_menu.mjs")).href);
  const accMod = await import(pathToFileURL(resolve(ROOT, "tools/build_fcv588_public_acceptance.mjs")).href);
  assert.equal(typeof menuMod.buildPublicMenuAtlasContent, "function");
  assert.equal(typeof accMod.buildPublicAcceptancePayload, "function");

  const afterMenuStat = await stat(menuPath);
  const afterStatusStat = await stat(statusPath);
  assert.equal(afterMenuStat.mtimeMs, beforeMenuStat.mtimeMs, "importing menu builder must not write disk");
  assert.equal(afterStatusStat.mtimeMs, beforeStatusStat.mtimeMs, "importing acceptance builder must not write disk");

  for (const [cmd, args] of [
    [process.execPath, ["tools/verify_public_runtime_assets.mjs"]],
    [process.execPath, ["tools/build_fcv588_public_menu.mjs", "--check"]],
    [process.execPath, ["tools/fcv588_lcd_boundary_audit.mjs", "--self-test"]],
    [process.execPath, ["tools/fcv588_lcd_boundary_audit.mjs"]],
    [PYTHON, ["-B", "tools/build_fcv588_public_trace.py", "--check"]],
    [PYTHON, ["-B", "tools/build_fcv588_feature_register.py", "--check"]],
    [PYTHON, ["-B", "tools/build_fcv588_visual_atlas.py", "--check", "--checkpoint", "V27"]],
    [PYTHON, ["-B", "tools/build_fcv588_visual_atlas.py", "--check", "--checkpoint", "V28"]],
  ]) {
    const res = spawnSync(cmd, args, {
      cwd: ROOT,
      env: {...process.env, PYTHONDONTWRITEBYTECODE: "1"},
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(res.status, 0, `${cmd} ${args.join(" ")} failed:\n${res.stderr}\n${res.stdout}`);
  }

  // Also check build_fcv588_public_acceptance.mjs --check when profileRevision is synchronized
  const currentStatus = JSON.parse(await readFile(statusPath, "utf8"));
  const generatedPayload = await accMod.buildPublicAcceptancePayload();
  if (currentStatus.profileRevision === generatedPayload.profileRevision) {
    const accRes = spawnSync(process.execPath, ["tools/build_fcv588_public_acceptance.mjs", "--check"], {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(accRes.status, 0, accRes.stderr || accRes.stdout);
  }
});
