import {existsSync, realpathSync, statSync} from "node:fs";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const REAL_REPO_ROOT = realpathSync(REPO_ROOT);

export class E2eTargetError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "E2eTargetError";
    this.code = code;
    this.details = details;
  }
}

function isInsideRoot(rootDir, candidatePath) {
  const rel = path.relative(rootDir, candidatePath);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

export function resolveWorkspacePath(relPath) {
  if (typeof relPath !== "string" || relPath.length === 0 || relPath.includes("\0")) {
    throw new E2eTargetError(
      "E2E_MISSING_FILE",
      `Invalid workspace path: ${String(relPath)}`,
      {relPath},
    );
  }
  const absPath = path.resolve(REPO_ROOT, relPath);
  if (!isInsideRoot(REPO_ROOT, absPath)) {
    throw new E2eTargetError(
      "E2E_MISSING_FILE",
      `Workspace path escapes repository root: ${relPath}`,
      {relPath, absPath},
    );
  }
  if (existsSync(absPath)) {
    let realTarget;
    try {
      realTarget = realpathSync(absPath);
    } catch (err) {
      throw new E2eTargetError(
        "E2E_MISSING_FILE",
        `Workspace path cannot be resolved safely: ${relPath}`,
        {relPath, absPath, cause: err},
      );
    }
    if (!isInsideRoot(REAL_REPO_ROOT, realTarget)) {
      throw new E2eTargetError(
        "E2E_MISSING_FILE",
        `Workspace path escapes repository root via symlink: ${relPath}`,
        {relPath, absPath, realTarget},
      );
    }
  }
  return absPath;
}

/**
 * Dynamically imports a workspace ES module relative to REPO_ROOT and verifies required exports.
 * NEVER returns null or silently passes on missing files/exports.
 */
export async function loadMdcModule(relPath, requiredExports = []) {
  const absPath = resolveWorkspacePath(relPath);
  if (!existsSync(absPath)) {
    throw new E2eTargetError(
      "E2E_MISSING_MODULE",
      `Target module not yet implemented: ${relPath} (expected exports: ${requiredExports.join(", ") || "<any>"})`,
      {relPath, absPath, requiredExports},
    );
  }
  let mod;
  try {
    mod = await import(pathToFileURL(absPath).href);
  } catch (err) {
    throw new E2eTargetError(
      "E2E_MODULE_LOAD_ERROR",
      `Failed to import ${relPath}: ${err instanceof Error ? err.message : String(err)}`,
      {relPath, absPath, cause: err},
    );
  }
  const missing = requiredExports.filter(name => !Object.hasOwn(mod, name) || mod[name] === undefined);
  if (missing.length > 0) {
    const available = Object.keys(mod).sort();
    throw new E2eTargetError(
      "E2E_MISSING_EXPORT",
      `Module ${relPath} missing export(s): ${missing.join(", ")} (available: ${available.join(", ")})`,
      {relPath, missing, available},
    );
  }
  return mod;
}

/**
 * Verifies a workspace file exists (and optionally non-empty) and returns { absPath, relPath, size }.
 * Throws E2eTargetError("E2E_MISSING_FILE", ...) if absent or empty.
 */
export async function requireWorkspaceFile(relPath, {nonEmpty = true, hint = ""} = {}) {
  const absPath = resolveWorkspacePath(relPath);
  if (!existsSync(absPath)) {
    throw new E2eTargetError(
      "E2E_MISSING_FILE",
      `Required workspace file not found: ${relPath}${hint ? ` (${hint})` : ""}`,
      {relPath, absPath},
    );
  }
  const info = statSync(absPath);
  if (!info.isFile()) {
    throw new E2eTargetError(
      "E2E_MISSING_FILE",
      `Required workspace path is not a regular file: ${relPath}`,
      {relPath, absPath},
    );
  }
  if (nonEmpty && info.size === 0) {
    throw new E2eTargetError(
      "E2E_MISSING_FILE",
      `Required workspace file is empty (0 bytes): ${relPath}`,
      {relPath, absPath, size: info.size},
    );
  }
  return {absPath, relPath, size: info.size};
}

/**
 * Reads a required UTF-8 workspace file, throwing E2eTargetError("E2E_MISSING_FILE") if absent.
 */
export async function readWorkspaceText(relPath, opts = {}) {
  const {absPath} = await requireWorkspaceFile(relPath, opts);
  return readFile(absPath, "utf8");
}

export async function readWorkspaceJson(relPath, opts = {}) {
  const text = await readWorkspaceText(relPath, opts);
  return JSON.parse(text);
}

// Contracted convenience loaders per PROJECT.md § Interface Contracts
export const SPEC_EXPORTS = Object.freeze([
  "MDC2060_ID",
  "MDC2060_PROFILE_REVISION",
  "MDC2060_RANGES",
  "MDC2060_PRESENTATION_MODES",
  "MDC2060_MOTION_MODES",
  "MDC2060_SCREEN_MODES",
  "MDC2060_COLOR_PALETTES",
  "MDC2060_MAIN_MENU_TREE",
  "MDC2060_SYSTEM_MENU_TREE",
  "MDC2060_FKEY_PRESETS",
  "MDC2060_RANGE_UNITS",
  "MDC2060_RADAR_SPECS",
  "formatRangeValue",
]);

export const SCENARIOS_EXPORTS = Object.freeze([
  "MDC2060_COASTAL_SCENARIO",
  "MDC2060_STORM_SCENARIO",
  "MDC2060_BRIDGE_SYNC_SCENARIO",
  "MDC2060_SCENARIOS",
  "getMdc2060ScenarioById",
  "createCustomOwnshipScenario",
]);

export const SIGNAL_EXPORTS = Object.freeze([
  "MDC2060_NOISE_STREAM",
  "evaluatePolarEchoGrid",
  "isPointOccludedByLand",
]);

export const ARPA_AIS_EXPORTS = Object.freeze([
  "initialAtaState",
  "acquireAtaTarget",
  "deleteAtaTarget",
  "deleteAllAtaTargets",
  "stepAtaTracking",
  "formatRattmSentence",
  "projectAisTargets",
  "initialGuardZoneState",
  "evaluateGuardZone",
]);

export const I18N_EXPORTS = Object.freeze([
  "MDC2060_LANGUAGES",
  "tMdc2060",
]);

export const MODEL_EXPORTS = Object.freeze([
  "MDC2060_PROFILE",
  "MDC2060_SETTINGS_STORAGE_KEY",
  "MDC2060_SETTINGS_SCHEMA_VERSION",
  "encodeMdc2060Settings",
  "decodeMdc2060Settings",
  "initialMdc2060State",
  "reduceMdc2060",
  "probeMdc2060",
]);

export const ADAPTER_EXPORTS = Object.freeze([
  "MDC2060_ADAPTER",
]);

export const LESSONS_EXPORTS = Object.freeze([
  "MDC2060_LESSONS",
  "getMdc2060Lesson",
  "assessMdc2060Lesson",
]);

export const BUNDLER_EXPORTS = Object.freeze([
  "tokenizeModule",
  "findModuleSpecifiers",
  "buildStandaloneHtml",
]);

export const loadSpec = () => loadMdcModule("src/devices/mdc2060/spec.mjs", SPEC_EXPORTS);
export const loadScenarios = () => loadMdcModule("src/devices/mdc2060/scenarios.mjs", SCENARIOS_EXPORTS);
export const loadSignal = () => loadMdcModule("src/devices/mdc2060/radar-signal.mjs", SIGNAL_EXPORTS);
export const loadArpaAis = () => loadMdcModule("src/devices/mdc2060/arpa-ais.mjs", ARPA_AIS_EXPORTS);
export const loadI18n = () => loadMdcModule("src/devices/mdc2060/i18n.mjs", I18N_EXPORTS);
export const loadModel = () => loadMdcModule("src/devices/mdc2060/model.mjs", MODEL_EXPORTS);
export const loadAdapter = () => loadMdcModule("src/devices/mdc2060/adapter.mjs", ADAPTER_EXPORTS);
export const loadLessons = () => loadMdcModule("src/devices/mdc2060/lessons.mjs", LESSONS_EXPORTS);
export const loadBundler = () => loadMdcModule("tools/build_mdc2060_standalone.mjs", BUNDLER_EXPORTS);
export const loadPpiRenderer = () => loadMdcModule("web/mdc2060/ppi-renderer.mjs", []);
