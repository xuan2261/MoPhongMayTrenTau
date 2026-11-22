// QA-only compatibility probe. Run only after the P04 provenance stage is stable.
// Example:
// C:\\nvm4w\\nodejs\\node.exe p04-provenance-compat-probe.mjs --out P04_PROVENANCE_COMPAT_PROBE_RESULT_<unique>.json
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {access, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";

const CANONICAL = "C:\\Work\\MoPhongMayTrenTau";
const STAGE = "C:\\Work\\MoPhongMayTrenTau\\staging\\fcv588-p04-bottom-provenance-20261116";
const PROFILE21 = "F1-public-reference-21";
if (process.versions.node.split(".")[0] !== "22") {
  throw new Error(`Node 22 required, got ${process.version}`);
}

function option(name) {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : null;
}

const outArg = option("--out");
if (!outArg) throw new Error("required: --out <new write-once JSON path>");
const OUTPUT = path.resolve(process.cwd(), outArg);

async function mustNotExist(file) {
  try {
    await access(file);
    throw new Error(`write-once output already exists: ${file}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

async function sourceSha(root, relative) {
  return sha256(await readFile(path.join(root, relative)));
}

async function loadRoot(root) {
  const url = relative => pathToFileURL(path.join(root, relative)).href;
  const [session, scenario, adapter, protocol, profile] = await Promise.all([
    import(url("src/core/session.mjs")),
    import(url("src/core/scenario.mjs")),
    import(url("src/devices/fcv588/adapter.mjs")),
    import(url("src/core/protocol.mjs")),
    import(url("src/devices/fcv588/profile-version.mjs")),
  ]);
  return {root, session, scenario, adapter, protocol, profile};
}

const TRACES = Object.freeze([
  Object.freeze({
    name: "off-world-four-ticks",
    inputs: Object.freeze([{kind: "tick", steps: 4}]),
  }),
  Object.freeze({
    name: "boot-mode-range",
    inputs: Object.freeze([
      {kind: "down", control: "power"},
      {kind: "up", control: "power"},
      {kind: "tick", steps: 4},
      {kind: "rotate", control: "mode", steps: 1},
      {kind: "press", control: "range"},
      {kind: "pad", control: "trackpad", direction: "right"},
      {kind: "press", control: "enter"},
      {kind: "tick", steps: 7},
    ]),
  }),
]);

function runTrace(ctx, trace) {
  const {createSession, dispatch, createReplayEnvelope, replay, sessionHash} = ctx.session;
  const scenario = ctx.scenario.TRAINING_SCENARIO;
  const adapter = ctx.adapter.FCV588_ADAPTER;
  let live = createSession(adapter, scenario);
  for (const input of trace.inputs) live = dispatch(live, adapter, input, scenario);
  const envelope = createReplayEnvelope(live);
  const replayed = replay(adapter, scenario, envelope);
  assert.equal(sessionHash(replayed), sessionHash(live), `${trace.name}: own replay drift`);
  return {live, envelope, sessionHash: sessionHash(live)};
}

function plainObservationExistingFields(observation) {
  const out = {};
  for (const key of Object.keys(observation).sort()) {
    if (key !== "channels") out[key] = observation[key];
  }
  return out;
}

function channelProof(ctx, observation, frequencyKhz) {
  const channel = observation.channels?.[frequencyKhz];
  assert.ok(channel instanceof Uint8Array, `${frequencyKhz} kHz channel must be Uint8Array`);
  return {
    bytes: channel.length,
    sha256: sha256(channel),
    protocolFingerprint: ctx.protocol.fingerprint([...channel]),
  };
}

async function main() {
  await mustNotExist(OUTPUT);
  const [canonical, stage] = await Promise.all([loadRoot(CANONICAL), loadRoot(STAGE)]);

  for (const ctx of [canonical, stage]) {
    assert.equal(ctx.profile.FCV588_PUBLIC_PROFILE_REVISION, PROFILE21,
      `${ctx.root}: profile revision changed`);
    assert.equal(ctx.adapter.FCV588_ADAPTER.revision, PROFILE21,
      `${ctx.root}: adapter revision changed`);
  }

  const sessions = [];
  for (const trace of TRACES) {
    const c = runTrace(canonical, trace);
    const s = runTrace(stage, trace);
    assert.equal(s.sessionHash, c.sessionHash, `${trace.name}: live sessionHash differs`);
    assert.deepEqual(s.envelope, c.envelope, `${trace.name}: replay envelope differs`);

    // Cross-root replay is the backward-compatibility check: each root must
    // accept the exact same profile21 envelope and land on the same final hash.
    const stageFromCanonical = stage.session.replay(
      stage.adapter.FCV588_ADAPTER, stage.scenario.TRAINING_SCENARIO, c.envelope);
    const canonicalFromStage = canonical.session.replay(
      canonical.adapter.FCV588_ADAPTER, canonical.scenario.TRAINING_SCENARIO, s.envelope);
    assert.equal(stage.session.sessionHash(stageFromCanonical), c.sessionHash,
      `${trace.name}: stage cannot replay canonical envelope exactly`);
    assert.equal(canonical.session.sessionHash(canonicalFromStage), c.sessionHash,
      `${trace.name}: canonical cannot replay stage envelope exactly`);

    sessions.push({
      name: trace.name,
      eventCount: c.envelope.events.length,
      sessionHash: c.sessionHash,
      contentFingerprint: c.envelope.contentFingerprint,
      finalSessionHash: c.envelope.finalSessionHash,
    });
  }

  const observationOptions = {columns: 48, rows: 151};
  const canonicalWorld = canonical.scenario.advanceWorld(
    canonical.scenario.TRAINING_SCENARIO,
    canonical.scenario.initialWorldState(canonical.scenario.TRAINING_SCENARIO), 17);
  const stageWorld = stage.scenario.advanceWorld(
    stage.scenario.TRAINING_SCENARIO,
    stage.scenario.initialWorldState(stage.scenario.TRAINING_SCENARIO), 17);
  const canonicalObs = canonical.scenario.observeSounder(
    canonical.scenario.TRAINING_SCENARIO, canonicalWorld, observationOptions);
  const stageObs = stage.scenario.observeSounder(
    stage.scenario.TRAINING_SCENARIO, stageWorld, observationOptions);

  const canonicalKeys = Object.keys(canonicalObs).sort();
  const stageKeys = Object.keys(stageObs).sort();
  const missingStageKeys = canonicalKeys.filter(key => !stageKeys.includes(key));
  assert.deepEqual(missingStageKeys, [], "stage removed canonical observation keys");

  const canonicalPlain = plainObservationExistingFields(canonicalObs);
  const stageExistingPlain = {};
  for (const key of Object.keys(canonicalPlain)) stageExistingPlain[key] = stageObs[key];
  assert.deepEqual(stageExistingPlain, canonicalPlain,
    "stage changed values of canonical observation fields");

  const raw = {};
  for (const frequencyKhz of [50, 200]) {
    const c = channelProof(canonical, canonicalObs, frequencyKhz);
    const s = channelProof(stage, stageObs, frequencyKhz);
    assert.deepEqual(s, c, `${frequencyKhz} kHz raw observation fingerprint differs`);
    assert.deepEqual(stageObs.channels[frequencyKhz], canonicalObs.channels[frequencyKhz],
      `${frequencyKhz} kHz raw bytes differ`);
    raw[frequencyKhz] = c;
  }

  const additiveStageKeys = stageKeys.filter(key => !canonicalKeys.includes(key));
  const sourceFiles = [
    "src/core/scenario.mjs",
    "src/core/session.mjs",
    "src/core/protocol.mjs",
    "src/devices/fcv588/adapter.mjs",
    "src/devices/fcv588/profile-version.mjs",
  ];
  const sourceSha256 = {};
  for (const relative of sourceFiles) {
    sourceSha256[relative] = {
      canonical: await sourceSha(CANONICAL, relative),
      stage: await sourceSha(STAGE, relative),
    };
  }

  const receipt = {
    schema: "fcv588-p04-provenance-compat-probe-v1",
    status: "PASS",
    node: process.version,
    canonicalRoot: CANONICAL,
    stageRoot: STAGE,
    profileRevision: PROFILE21,
    sessions,
    observation: {
      options: observationOptions,
      simTick: canonicalWorld.simTick,
      canonicalKeys,
      stageKeys,
      additiveStageKeys,
      existingFieldsIdentical: true,
      rawChannelsIdentical: true,
      raw,
    },
    sourceSha256,
  };
  await writeFile(OUTPUT, JSON.stringify(receipt, null, 2) + "\n", {flag: "wx"});
  process.stdout.write(JSON.stringify({status: receipt.status, output: OUTPUT}) + "\n");
}

try {
  await main();
} catch (error) {
  try {
    await writeFile(OUTPUT, JSON.stringify({
      schema: "fcv588-p04-provenance-compat-probe-v1",
      status: "FAIL",
      node: process.version,
      canonicalRoot: CANONICAL,
      stageRoot: STAGE,
      error: String(error?.message ?? error),
    }, null, 2) + "\n", {flag: "wx"});
  } catch (writeError) {
    if (writeError?.code !== "EEXIST") throw writeError;
  }
  throw error;
}
