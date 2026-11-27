#!/usr/bin/env node
/**
 * Tiered Opaque-Box E2E Test Runner for KODEN MDC-2060 Marine Radar Simulator.
 * Zero third-party dependencies; supports --list, --tier=1|2|3|4|all, --filter, --json, --help.
 */
import {realpathSync} from "node:fs";
import {readdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SUITE_DIR = path.join(REPO_ROOT, "test", "e2e-mdc2060");
const SUITE_FILE_RE = /^tier([1-4])-[a-z0-9-]+\.mjs$/;
const VALID_TIERS = new Set(["1", "2", "3", "4", "all"]);

const USAGE = `Usage: node tools/run_mdc2060_e2e.mjs [options]

Options:
  --tier=1|2|3|4|all   Select tier to run or list (default: all)
  --list               List discovered E2E tests without executing them
  --filter=<substring> Case-insensitive match on test id, suite, name, or file
  --json               Emit a single JSON document to stdout
  -h, --help           Show this help message and exit 0
`;

export function parseArgs(argv = []) {
  const opts = {
    tier: "all",
    list: false,
    json: false,
    filter: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg === "--list") {
      opts.list = true;
    } else if (arg === "--json") {
      opts.json = true;
    } else if (arg.startsWith("--tier=")) {
      const val = arg.slice("--tier=".length);
      if (!VALID_TIERS.has(val)) {
        throw new Error(`Invalid --tier value: "${val}" (expected 1|2|3|4|all)`);
      }
      opts.tier = val;
    } else if (arg === "--tier") {
      const val = argv[++i];
      if (!val || !VALID_TIERS.has(val)) {
        throw new Error(`Invalid --tier value: "${val ?? ""}" (expected 1|2|3|4|all)`);
      }
      opts.tier = val;
    } else if (arg.startsWith("--filter=")) {
      const val = arg.slice("--filter=".length);
      if (!val.trim()) {
        throw new Error("Empty --filter value is not allowed");
      }
      opts.filter = val;
    } else if (arg === "--filter") {
      const val = argv[++i];
      if (!val || !val.trim()) {
        throw new Error("Empty --filter value is not allowed");
      }
      if (val.startsWith("-")) {
        throw new Error(`Missing value for --filter before flag "${val}" (use --filter=<value> for values starting with "-")`);
      }
      opts.filter = val;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
  }
  return opts;
}

export async function discoverTests({suiteDir = DEFAULT_SUITE_DIR} = {}) {
  const entries = await readdir(suiteDir, {withFileTypes: true});
  const suiteFiles = entries
    .filter(e => e.isFile() && SUITE_FILE_RE.test(e.name))
    .map(e => {
      const match = e.name.match(SUITE_FILE_RE);
      return {
        file: e.name,
        absPath: path.join(suiteDir, e.name),
        filenameTier: Number(match[1]),
      };
    })
    .sort((a, b) => {
      if (a.filenameTier !== b.filenameTier) return a.filenameTier - b.filenameTier;
      return a.file < b.file ? -1 : a.file > b.file ? 1 : 0;
    });

  const allTests = [];
  const seenIds = new Set();

  for (const item of suiteFiles) {
    const mod = await import(pathToFileURL(item.absPath).href);
    if (mod.TIER !== item.filenameTier) {
      throw new Error(
        `Suite ${item.file} exports TIER=${String(mod.TIER)}, expected ${item.filenameTier}`,
      );
    }
    if (typeof mod.SUITE !== "string" || !mod.SUITE.trim()) {
      throw new Error(`Suite ${item.file} must export a non-empty string SUITE`);
    }
    if (!Array.isArray(mod.TESTS) || mod.TESTS.length === 0) {
      throw new Error(`Suite ${item.file} must export a non-empty array TESTS`);
    }

    for (let idx = 0; idx < mod.TESTS.length; idx++) {
      const t = mod.TESTS[idx];
      if (!t || typeof t !== "object") {
        throw new Error(`Suite ${item.file} TESTS[${idx}] must be an object`);
      }
      if (typeof t.id !== "string" || !t.id.trim()) {
        throw new Error(`Suite ${item.file} TESTS[${idx}] missing valid string id`);
      }
      if (seenIds.has(t.id)) {
        throw new Error(`Duplicate E2E test id "${t.id}" found in ${item.file}`);
      }
      seenIds.add(t.id);
      if (typeof t.name !== "string" || !t.name.trim()) {
        throw new Error(`Suite ${item.file} test ${t.id} missing valid string name`);
      }
      if (typeof t.run !== "function") {
        throw new Error(`Suite ${item.file} test ${t.id} missing function run(ctx)`);
      }
      allTests.push({
        id: t.id,
        tier: mod.TIER,
        suite: mod.SUITE,
        file: item.file,
        name: t.name,
        features: Array.isArray(t.features) ? [...t.features] : [],
        timeoutMs: Number.isInteger(t.timeoutMs) && t.timeoutMs > 0 ? t.timeoutMs : (mod.TIER <= 2 ? 15000 : 35000),
        run: t.run,
      });
    }
  }

  return allTests;
}

function filterTests(tests, {tier = "all", filter = null} = {}) {
  let out = tests;
  if (tier !== "all") {
    const numTier = Number(tier);
    out = out.filter(t => t.tier === numTier);
  }
  if (filter) {
    const needle = filter.toLowerCase();
    out = out.filter(t =>
      t.id.toLowerCase().includes(needle) ||
      t.suite.toLowerCase().includes(needle) ||
      t.name.toLowerCase().includes(needle) ||
      t.file.toLowerCase().includes(needle),
    );
  }
  return out;
}

function computeTierCounts(tests) {
  const counts = {"1": 0, "2": 0, "3": 0, "4": 0};
  for (const t of tests) {
    const key = String(t.tier);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

async function runWithTimeout(fn, ctx, timeoutMs) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Test ${ctx.id} timed out after ${timeoutMs}ms`);
      err.code = "E2E_TIMEOUT";
      reject(err);
    }, timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(() => fn(ctx)), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export async function runE2eSuite({
  suiteDir = DEFAULT_SUITE_DIR,
  tier = "all",
  filter = null,
  discoveredTests = null,
} = {}) {
  const discovered = Array.isArray(discoveredTests) ? discoveredTests : await discoverTests({suiteDir});
  const selected = filterTests(discovered, {tier, filter});
  const tierCounts = computeTierCounts(selected);
  const tiersSummary = {
    "1": {total: 0, passed: 0, failed: 0, durationMs: 0},
    "2": {total: 0, passed: 0, failed: 0, durationMs: 0},
    "3": {total: 0, passed: 0, failed: 0, durationMs: 0},
    "4": {total: 0, passed: 0, failed: 0, durationMs: 0},
  };
  const results = [];
  const suiteStart = Date.now();

  for (const testCase of selected) {
    const t0 = Date.now();
    const ctx = Object.freeze({
      id: testCase.id,
      tier: testCase.tier,
      suite: testCase.suite,
      file: testCase.file,
      repoRoot: REPO_ROOT,
    });
    let status = "PASS";
    let errorCode = null;
    let errorMessage = null;
    try {
      await runWithTimeout(testCase.run, ctx, testCase.timeoutMs);
    } catch (err) {
      status = "FAIL";
      errorCode = err && typeof err === "object" && "code" in err && err.code ? String(err.code) : "E2E_ASSERTION_FAILED";
      errorMessage = err instanceof Error ? err.message : String(err);
    }
    const durationMs = Date.now() - t0;
    const tierBucket = tiersSummary[String(testCase.tier)];
    tierBucket.total += 1;
    tierBucket.durationMs += durationMs;
    if (status === "PASS") tierBucket.passed += 1;
    else tierBucket.failed += 1;

    results.push({
      id: testCase.id,
      tier: testCase.tier,
      suite: testCase.suite,
      file: testCase.file,
      name: testCase.name,
      features: testCase.features,
      status,
      durationMs,
      errorCode,
      error: errorMessage,
    });
  }

  const total = results.length;
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = total - passed;
  const durationMs = Date.now() - suiteStart;

  return {
    mode: "run",
    tier,
    filter,
    total,
    passed,
    failed,
    durationMs,
    tierCounts,
    tiers: tiersSummary,
    results,
  };
}

export async function runCli(argv = process.argv.slice(2), {
  suiteDir = DEFAULT_SUITE_DIR,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n\n${USAGE}`);
    return 1;
  }

  if (opts.help) {
    stdout.write(USAGE);
    return 0;
  }

  let discovered;
  try {
    discovered = await discoverTests({suiteDir});
  } catch (err) {
    stderr.write(`Suite discovery failed: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }

  if (opts.list) {
    const selected = filterTests(discovered, {tier: opts.tier, filter: opts.filter});
    const tierCounts = computeTierCounts(selected);
    const payload = {
      mode: "list",
      tier: opts.tier,
      filter: opts.filter,
      total: selected.length,
      tierCounts,
      tests: selected.map(t => ({
        id: t.id,
        tier: t.tier,
        suite: t.suite,
        file: t.file,
        name: t.name,
        features: t.features,
      })),
    };
    if (opts.json) {
      stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else {
      stdout.write(`MDC-2060 Opaque-Box E2E Tests (${payload.total} total; T1=${tierCounts["1"]}, T2=${tierCounts["2"]}, T3=${tierCounts["3"]}, T4=${tierCounts["4"]})\n`);
      for (const t of payload.tests) {
        stdout.write(`  [T${t.tier}] ${t.id} (${t.file}) — ${t.name}\n`);
      }
    }
    return 0;
  }

  const report = await runE2eSuite({
    suiteDir,
    tier: opts.tier,
    filter: opts.filter,
    discoveredTests: discovered,
  });
  if (opts.json) {
    stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    stdout.write(`MDC-2060 Opaque-Box E2E Run (tier=${opts.tier}${opts.filter ? `, filter=${opts.filter}` : ""})\n`);
    for (const r of report.results) {
      const tag = r.status === "PASS" ? "PASS" : "FAIL";
      const suffix = r.status === "FAIL" ? ` [${r.errorCode}] ${r.error}` : "";
      stdout.write(`  [${tag}] ${r.id} (${r.durationMs}ms) ${r.name}${suffix}\n`);
    }
    stdout.write("\nSummary by Tier:\n");
    for (const tierKey of ["1", "2", "3", "4"]) {
      const s = report.tiers[tierKey];
      if (s.total > 0) {
        stdout.write(`  Tier ${tierKey}: ${s.passed}/${s.total} passed, ${s.failed} failed (${s.durationMs}ms)\n`);
      }
    }
    stdout.write(`Overall: ${report.passed}/${report.total} passed, ${report.failed} failed (${report.durationMs}ms)\n`);
  }

  return report.total > 0 && report.failed === 0 ? 0 : 1;
}

function isDirectCliExecution() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(path.resolve(process.argv[1]));
  } catch {
    return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  }
}

if (isDirectCliExecution()) {
  process.stdout.on("error", err => {
    if (err && err.code === "EPIPE") process.exit(0);
    throw err;
  });
  process.exitCode = await runCli(process.argv.slice(2));
}
