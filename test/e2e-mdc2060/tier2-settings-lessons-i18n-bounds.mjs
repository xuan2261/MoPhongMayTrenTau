import assert from "node:assert/strict";
import {loadAdapter, loadI18n, loadLessons, loadModel, loadScenarios, loadSpec} from "./helpers/module-loader.mjs";
import {
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  bridgeSessionHash,
  createBridgeReplay,
  createMdcBridgeDriver,
  createMdcSingleDriver,
  createReplayEnvelope,
  discoverSettingsKeys,
  fingerprint,
  getAisInfo,
  getAtaInfo,
  getColorPalette,
  getLanguageCodes,
  getPowerMode,
  getPreheatRemaining,
  operateMenuItem,
  replay,
  replayBridgeSession,
} from "./helpers/session-driver.mjs";

export const TIER = 2;
export const SUITE = "tier2-settings-lessons-i18n-bounds";

export const TESTS = [
  {
    id: "T2-069",
    name: "Settings Codec Rejects Prototype Pollution (__proto__, constructor, prototype)",
    features: [31],
    async run() {
      const model = await loadModel();
      const base = model.initialMdc2060State().settings;
      const validRaw = model.encodeMdc2060Settings(base);
      const env = JSON.parse(validRaw);
      const poisonedPayloads = [
        `{"schemaVersion":${env.schemaVersion},"profileClass":"PUBLIC_REFERENCE","profileRevision":"${env.profileRevision}","__proto__":{"polluted":true},"settings":${JSON.stringify(base)},"contentFingerprint":"${env.contentFingerprint}"}`,
        `{"schemaVersion":${env.schemaVersion},"profileClass":"PUBLIC_REFERENCE","profileRevision":"${env.profileRevision}","settings":{"__proto__":{"polluted":true}},"contentFingerprint":"${env.contentFingerprint}"}`,
        `{"schemaVersion":${env.schemaVersion},"profileClass":"PUBLIC_REFERENCE","profileRevision":"${env.profileRevision}","constructor":{"polluted":true},"settings":${JSON.stringify(base)},"contentFingerprint":"${env.contentFingerprint}"}`,
        `{"schemaVersion":${env.schemaVersion},"profileClass":"PUBLIC_REFERENCE","profileRevision":"${env.profileRevision}","settings":{"prototype":{"polluted":true}},"contentFingerprint":"${env.contentFingerprint}"}`,
      ];
      for (const payload of poisonedPayloads) {
        assert.equal(model.decodeMdc2060Settings(payload), null, "Prototype-polluting settings JSON must fail closed (return null)");
        assert.equal(({}).polluted, undefined, "Object.prototype must never be polluted");
      }
    },
  },
  {
    id: "T2-070",
    name: "Settings Codec Rejects Oversize Payload (> 12000 Bytes) & Malformed JSON",
    features: [31],
    async run() {
      const {decodeMdc2060Settings} = await loadModel();
      const huge = `{"pad":"${"x".repeat(13000)}"}`;
      for (const bad of [huge, '{"schema', "[]", "null", "42", '""', undefined, null, 123, {}]) {
        assert.equal(decodeMdc2060Settings(bad), null, `Malformed/oversize input must return null: ${String(bad).slice(0, 40)}`);
      }
    },
  },
  {
    id: "T2-071",
    name: "Settings Codec Rejects Corrupt contentFingerprint",
    features: [31],
    async run() {
      const model = await loadModel();
      const base = model.initialMdc2060State().settings;
      const env = JSON.parse(model.encodeMdc2060Settings(base));
      const flippedChar = env.contentFingerprint.endsWith("0") ? "1" : "0";
      const badFpEnv = {...env, contentFingerprint: env.contentFingerprint.slice(0, -1) + flippedChar};
      assert.equal(model.decodeMdc2060Settings(JSON.stringify(badFpEnv)), null);

      const keys = discoverSettingsKeys(base);
      assert.ok(keys.colorPalette, "discoverSettingsKeys must locate colorPalette");
      const mutated = structuredClone(env);
      mutated.settings[keys.colorPalette] = mutated.settings[keys.colorPalette] === "NIGHT" ? "DAY" : "NIGHT";
      assert.equal(model.decodeMdc2060Settings(JSON.stringify(mutated)), null, "Tampered setting without matching fingerprint must return null");
    },
  },
  {
    id: "T2-072",
    name: "Settings Codec Rejects Wrong schemaVersion, Wrong profileRevision, Wrong profileClass",
    features: [31],
    async run() {
      const model = await loadModel();
      const base = model.initialMdc2060State().settings;
      const env = JSON.parse(model.encodeMdc2060Settings(base));
      const buildRecomputedEnv = v => {
        const body = {
          schemaVersion: v.schemaVersion,
          profileClass: v.profileClass,
          profileRevision: v.profileRevision,
          settings: v.settings,
        };
        return {...body, contentFingerprint: fingerprint(body)};
      };

      // Positive control: unmodified envelope with authentic body fingerprint decodes cleanly
      const positiveRecomputed = buildRecomputedEnv(env);
      assert.equal(
        positiveRecomputed.contentFingerprint,
        env.contentFingerprint,
        "Recomputed body fingerprint must match encodeMdc2060Settings contentFingerprint",
      );
      assert.ok(
        model.decodeMdc2060Settings(JSON.stringify(positiveRecomputed)),
        "Unmodified envelope with authentic body fingerprint must decode cleanly",
      );

      const variants = [
        {...env, schemaVersion: 999},
        {...env, profileRevision: "F1-wrong-0"},
        {...env, profileClass: "CERTIFIED_OEM"},
      ];
      for (const v of variants) {
        const recomputed = buildRecomputedEnv(v);
        assert.equal(model.decodeMdc2060Settings(JSON.stringify(v)), null);
        assert.equal(model.decodeMdc2060Settings(JSON.stringify(recomputed)), null);
      }
    },
  },
  {
    id: "T2-073",
    name: "Settings Codec Rejects Unknown Allowlist Keys & Out-of-Domain Values",
    features: [5, 12, 31],
    async run() {
      const model = await loadModel();
      const base = model.initialMdc2060State().settings;
      const keys = discoverSettingsKeys(base);
      assert.ok(keys.colorPalette, "discoverSettingsKeys must locate colorPalette");
      assert.ok(keys.subGain, "discoverSettingsKeys must locate subGain");
      assert.ok(keys.stcCurve, "discoverSettingsKeys must locate stcCurve");
      assert.ok(keys.motorRpm, "discoverSettingsKeys must locate motorRpm");
      assert.ok(keys.ftc, "discoverSettingsKeys must locate ftc");
      assert.ok(keys.alarmInnerNm, "discoverSettingsKeys must locate alarmInnerNm");
      assert.ok(keys.alarmOuterNm, "discoverSettingsKeys must locate alarmOuterNm");
      assert.ok(keys.motionMode, "discoverSettingsKeys must locate motionMode");
      assert.ok(keys.offCenter, "discoverSettingsKeys must locate offCenter");

      const env = JSON.parse(model.encodeMdc2060Settings(base));
      const buildForgedEnv = settingsObj => {
        const body = {
          schemaVersion: env.schemaVersion,
          profileClass: env.profileClass,
          profileRevision: env.profileRevision,
          settings: settingsObj,
        };
        return JSON.stringify({...body, contentFingerprint: fingerprint(body)});
      };

      // Positive control: forged envelope with authentic body fingerprint & valid mutation decodes cleanly
      const validMut = structuredClone(base);
      const validAltPal = validMut[keys.colorPalette] === "NIGHT" ? "DAY" : "NIGHT";
      validMut[keys.colorPalette] = validAltPal;
      const decodedValid = model.decodeMdc2060Settings(buildForgedEnv(validMut));
      assert.ok(decodedValid, "Valid forged settings envelope with authentic body fingerprint must decode cleanly");
      assert.equal(decodedValid[keys.colorPalette], validAltPal);

      const assertRejectedPayload = (label, settingsObj, errPred) => {
        assert.equal(
          model.decodeMdc2060Settings(buildForgedEnv(settingsObj)),
          null,
          `Expected decodeMdc2060Settings to reject tampered setting (${label})`,
        );
        assert.throws(
          () => model.encodeMdc2060Settings(settingsObj),
          errPred,
          `Expected encodeMdc2060Settings to throw on tampered setting (${label})`,
        );
      };

      // Empty settings object {} (hits keys.length === 0 size guard)
      assertRejectedPayload(
        "empty settings object {}",
        {},
        err => err instanceof RangeError && /size/i.test(err.message),
      );
      // Oversize unknown key (48 + 1 = 49 keys)
      assertRejectedPayload(
        "oversize unknown key adminBypass (49 keys)",
        {...structuredClone(base), adminBypass: true},
        err => err instanceof RangeError && /size/i.test(err.message),
      );
      // Minimal unknown key (bypasses size cap to hit per-key allowlist guard)
      assertRejectedPayload(
        "minimal unknown key adminBypass",
        {[keys.colorPalette]: base[keys.colorPalette], adminBypass: true},
        err => err instanceof TypeError && /unknown|unsafe/i.test(err.message),
      );
      // Smuggled top-level live rotary knobs (gain / stc are live panel controls, not allowlisted menu settings)
      assertRejectedPayload(
        "smuggled rotary knob gain",
        {[keys.colorPalette]: base[keys.colorPalette], gain: 150},
        err => err instanceof TypeError && /unknown|unsafe/i.test(err.message),
      );
      assertRejectedPayload(
        "smuggled rotary knob stc",
        {[keys.colorPalette]: base[keys.colorPalette], stc: -5},
        err => err instanceof TypeError && /unknown|unsafe/i.test(err.message),
      );

      // Non-finite float encode guards (NaN / +Infinity)
      assert.throws(
        () => model.encodeMdc2060Settings({...structuredClone(base), [keys.alarmOuterNm]: Number.NaN}),
        RangeError,
        "Expected encodeMdc2060Settings to reject NaN float setting",
      );
      assert.throws(
        () => model.encodeMdc2060Settings({...structuredClone(base), [keys.alarmOuterNm]: Number.POSITIVE_INFINITY}),
        RangeError,
        "Expected encodeMdc2060Settings to reject +Infinity float setting",
      );

      let domainChecksExecuted = 0;
      const runDomainTamper = (label, mutator) => {
        const s = structuredClone(base);
        mutator(s);
        assertRejectedPayload(label, s, err => err instanceof RangeError);
        domainChecksExecuted++;
      };
      runDomainTamper("colorPalette=NEON_INVALID", s => { s[keys.colorPalette] = "NEON_INVALID"; });
      runDomainTamper("subGain=21", s => { s[keys.subGain] = 21; });
      runDomainTamper("subGain=-21", s => { s[keys.subGain] = -21; });
      runDomainTamper("stcCurve=0", s => { s[keys.stcCurve] = 0; });
      runDomainTamper("stcCurve=9", s => { s[keys.stcCurve] = 9; });
      runDomainTamper("motorRpm=99", s => { s[keys.motorRpm] = typeof base[keys.motorRpm] === "string" ? "99" : 99; });
      runDomainTamper("ftc=9", s => { s[keys.ftc] = 9; });
      runDomainTamper("ftc=2.5 (non-int)", s => { s[keys.ftc] = 2.5; });
      runDomainTamper("alarmInnerNm=65 (>60)", s => { s[keys.alarmInnerNm] = 65; });
      runDomainTamper("alarmOuterNm=65 (>64)", s => { s[keys.alarmOuterNm] = 65; });
      runDomainTamper("alarmInnerNm=0 (<0.1)", s => { s[keys.alarmInnerNm] = 0; });
      runDomainTamper("alarmInnerNm=3.0 (==alarmOuterNm, violates 0.05 gap)", s => {
        s[keys.alarmOuterNm] = 3.0;
        s[keys.alarmInnerNm] = 3.0;
      });
      runDomainTamper("alarmInnerNm=4.0 (>outer-0.05)", s => {
        s[keys.alarmOuterNm] = 3.0;
        s[keys.alarmInnerNm] = 4.0;
      });
      runDomainTamper("mutually exclusive motionMode=TM + offCenter=ON", s => {
        s[keys.motionMode] = "TM";
        s[keys.offCenter] = "ON";
      });
      assert.ok(domainChecksExecuted >= 14, `Must execute >= 14 domain/cross-field tamper checks, executed ${domainChecksExecuted}`);
    },
  },
  {
    id: "T2-074",
    name: "restore-settings Ignored/Rejected While Powered ON (PREHEAT, STANDBY, TRANSMIT, SLEEP)",
    features: [31],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const base = model.initialMdc2060State().settings;
      const keys = discoverSettingsKeys(base);
      const altSettings = structuredClone(base);
      assert.ok(keys.colorPalette, "colorPalette key must exist in settings");
      const targetPal = altSettings[keys.colorPalette] === "NIGHT" ? "WHITE" : "NIGHT";
      altSettings[keys.colorPalette] = targetPal;
      const decodedAlt = model.decodeMdc2060Settings(model.encodeMdc2060Settings(altSettings));
      assert.ok(decodedAlt);

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      const initialPal = getColorPalette(drv.state(), MDC2060_ADAPTER);

      const assertRestoreRejected = expectedMode => {
        assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), expectedMode);
        const hashBefore = drv.hash();
        const historyLenBefore = drv.bridge.history.length;
        assert.throws(
          () => drv.restoreSettings(decodedAlt),
          err => err instanceof Error && !(err instanceof ReferenceError) && !(err instanceof SyntaxError) && /off/i.test(err.message),
          `restore-settings must reject fail-closed while in ${expectedMode}`,
        );
        assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), expectedMode, `restore-settings must not alter powerMode in ${expectedMode}`);
        assert.equal(getColorPalette(drv.state(), MDC2060_ADAPTER), initialPal, `restore-settings must not apply in ${expectedMode}`);
        assert.equal(drv.hash(), hashBefore, `Rejected restore-settings must not mutate session hash in ${expectedMode}`);
        assert.equal(drv.bridge.history.length, historyLenBefore, `Rejected restore-settings must not append history in ${expectedMode}`);
      };

      // PREHEAT
      drv.fixture("fastPreheat", true);
      drv.holdPress("power", 200);
      assertRestoreRejected("preheat");
      // STANDBY
      drv.tick(5);
      assertRestoreRejected("standby");
      // TRANSMIT
      drv.press("stby_tx");
      assertRestoreRejected("transmit");
      // SLEEP
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^SLEEP$/i, /MODE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      assertRestoreRejected("sleep");

      // Positive control: powering OFF allows restoreSettings to succeed cleanly
      drv.holdPress("power", 3200);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      drv.restoreSettings(decodedAlt);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      assert.equal(getColorPalette(drv.state(), MDC2060_ADAPTER), targetPal, "restore-settings must apply cleanly after powering OFF");
    },
  },
  {
    id: "T2-075",
    name: "restore-settings Cannot Grant Hardware/Training Fixtures",
    features: [31],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      const base = structuredClone(model.initialMdc2060State().settings);
      const keys = discoverSettingsKeys(base);
      assert.ok(keys.colorPalette, "colorPalette key must exist in settings");
      assert.ok(keys.ataAutoArea, "ataAutoArea key must exist in settings");
      assert.ok(keys.aisDisplay, "aisDisplay key must exist in settings");
      assert.ok(keys.aisCpaAlarm, "aisCpaAlarm key must exist in settings");

      const env = JSON.parse(model.encodeMdc2060Settings(base));
      const buildForgedEnv = settingsObj => {
        const body = {
          schemaVersion: env.schemaVersion,
          profileClass: env.profileClass,
          profileRevision: env.profileRevision,
          settings: settingsObj,
        };
        return JSON.stringify({...body, contentFingerprint: fingerprint(body)});
      };

      const initialPal = getColorPalette(drv.state(), MDC2060_ADAPTER);
      const targetPal = initialPal === "NIGHT" ? "WHITE" : "NIGHT";
      const hashBefore = drv.hash();
      const histBefore = drv.bridge.history.length;
      assert.equal(getAtaInfo(drv.state(), MDC2060_ADAPTER).boardEnabled, true);

      // Positive control for buildForgedEnv authenticity
      const decodedPositive = model.decodeMdc2060Settings(buildForgedEnv({[keys.colorPalette]: targetPal}));
      assert.ok(decodedPositive, "Authentic forged minimal settings payload must decode cleanly");
      assert.equal(decodedPositive[keys.colorPalette], targetPal);

      // Full-payload + smuggled fixtures (51 keys > 48 allowlist cap)
      const smuggledFull = {...base, fastPreheat: true, skipPreheat: true, ataBoardOption: false};
      assert.throws(
        () => model.encodeMdc2060Settings(smuggledFull),
        err => err instanceof RangeError && /size/i.test(err.message),
        "encodeMdc2060Settings must reject full payload with smuggled fixtures",
      );
      assert.equal(
        model.decodeMdc2060Settings(buildForgedEnv(smuggledFull)),
        null,
        "decodeMdc2060Settings must reject forged full payload with smuggled fixtures",
      );
      assert.throws(
        () => drv.restoreSettings(smuggledFull),
        err => err instanceof RangeError && /size/i.test(err.message),
        "restoreSettings must reject full payload with smuggled fixtures",
      );

      // Minimal-payload + smuggled fixtures (4 keys <= 48, hits unknown/unsafe allowlist guard)
      const smuggledMinimal = {[keys.colorPalette]: targetPal, fastPreheat: true, skipPreheat: true, ataBoardOption: false};
      assert.throws(
        () => model.encodeMdc2060Settings(smuggledMinimal),
        err => err instanceof TypeError && /unknown|unsafe/i.test(err.message),
        "encodeMdc2060Settings must reject minimal payload with smuggled fixtures",
      );
      assert.equal(
        model.decodeMdc2060Settings(buildForgedEnv(smuggledMinimal)),
        null,
        "decodeMdc2060Settings must reject forged minimal payload with smuggled fixtures",
      );
      assert.throws(
        () => drv.restoreSettings(smuggledMinimal),
        err => err instanceof TypeError && /unknown|unsafe/i.test(err.message),
        "restoreSettings must reject minimal payload with smuggled fixtures",
      );

      // Verify zero state, history, palette, or fixture mutation
      assert.equal(drv.hash(), hashBefore, "Rejected smuggled restoreSettings must not mutate session hash");
      assert.equal(drv.bridge.history.length, histBefore, "Rejected smuggled restoreSettings must not append history");
      assert.equal(getColorPalette(drv.state(), MDC2060_ADAPTER), initialPal, "Rejected smuggled restoreSettings must not mutate colorPalette");
      assert.equal(getAtaInfo(drv.state(), MDC2060_ADAPTER).boardEnabled, true, "ataBoardOption must remain intact");
      assert.equal(drv.state().trainingFixture.ataBoardOption, true);
      assert.equal(drv.state().trainingFixture.fastPreheat, false);
      assert.equal(drv.state().trainingFixture.skipPreheat, false);

      // Power ON without fastPreheat fixture must still take authentic 120s preheat (120 -> 114 -> 1 -> 0/standby)
      drv.holdPress("power", 200);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 120);
      drv.tick(6);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat", "Smuggled fastPreheat/skipPreheat inside restore-settings must NOT grant training fixtures");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 114);
      drv.tick(113);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat", "119s elapsed must still remain in preheat");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 1);
      drv.tick(1);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "standby", "120s elapsed must transition cleanly to standby");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 0);
      assert.equal(getAtaInfo(drv.state(), MDC2060_ADAPTER).boardEnabled, true, "ataBoardOption must remain true after authentic 120s preheat");

      // Second OFF driver with hardware option boards disabled: verify neither smuggled payloads
      // nor valid allowlisted settings can re-enable uninstalled ATA/AIS board capabilities
      const drv2 = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv2.fixture("ataBoardOption", false);
      drv2.fixture("aisBoardOption", false);
      assert.equal(getPowerMode(drv2.state(), MDC2060_ADAPTER), "off");
      assert.equal(drv2.state().trainingFixture.ataBoardOption, false);
      assert.equal(drv2.state().trainingFixture.aisBoardOption, false);
      assert.equal(getAtaInfo(drv2.state(), MDC2060_ADAPTER).boardEnabled, false);
      assert.equal(getAisInfo(drv2.state(), MDC2060_ADAPTER).boardEnabled, false);
      const drv2HashBefore = drv2.hash();
      const drv2HistBefore = drv2.bridge.history.length;

      // (a) Smuggled board-enable payload rejected by encode, forged decode, and restoreSettings
      const smuggledEnableBoards = {[keys.colorPalette]: targetPal, ataBoardOption: true, aisBoardOption: true};
      assert.throws(
        () => model.encodeMdc2060Settings(smuggledEnableBoards),
        err => err instanceof TypeError && /unknown|unsafe/i.test(err.message),
        "encodeMdc2060Settings must reject smuggled ataBoardOption/aisBoardOption",
      );
      assert.equal(
        model.decodeMdc2060Settings(buildForgedEnv(smuggledEnableBoards)),
        null,
        "decodeMdc2060Settings must reject forged payload smuggling ataBoardOption/aisBoardOption",
      );
      assert.throws(
        () => drv2.restoreSettings(smuggledEnableBoards),
        err => err instanceof TypeError && /unknown|unsafe/i.test(err.message),
        "restoreSettings must reject smuggled ataBoardOption/aisBoardOption",
      );
      assert.equal(drv2.hash(), drv2HashBefore, "Rejected smuggled board-enable restoreSettings must not mutate session hash");
      assert.equal(drv2.bridge.history.length, drv2HistBefore, "Rejected smuggled board-enable restoreSettings must not append history");

      // (b) Valid allowlisted ATA/AIS ON settings reconcile back to OFF when option boards are uninstalled
      const validBoardFeaturePayload = {
        [keys.ataAutoArea]: "ON",
        [keys.aisDisplay]: "ON",
        [keys.aisCpaAlarm]: "ON",
      };
      const decodedBoardFeaturePayload = model.decodeMdc2060Settings(model.encodeMdc2060Settings(validBoardFeaturePayload));
      assert.ok(decodedBoardFeaturePayload, "Valid allowlisted ATA/AIS feature settings must round-trip through codec");
      drv2.restoreSettings(decodedBoardFeaturePayload);

      assert.equal(drv2.state().settings[keys.ataAutoArea], "OFF", "restore-settings must reconcile ataAutoArea back to OFF when ataBoardOption=false");
      assert.equal(drv2.state().settings[keys.aisDisplay], "OFF", "restore-settings must reconcile aisDisplay back to OFF when aisBoardOption=false");
      assert.equal(drv2.state().settings[keys.aisCpaAlarm], "OFF", "restore-settings must reconcile aisCpaAlarm back to OFF when aisBoardOption=false");
      assert.equal(drv2.state().trainingFixture.ataBoardOption, false, "ataBoardOption must remain false after restore-settings");
      assert.equal(drv2.state().trainingFixture.aisBoardOption, false, "aisBoardOption must remain false after restore-settings");
      assert.equal(getAtaInfo(drv2.state(), MDC2060_ADAPTER).boardEnabled, false, "getAtaInfo.boardEnabled must remain false");
      assert.equal(getAtaInfo(drv2.state(), MDC2060_ADAPTER).autoArea, false, "getAtaInfo.autoArea must remain false");
      assert.equal(getAisInfo(drv2.state(), MDC2060_ADAPTER).boardEnabled, false, "getAisInfo.boardEnabled must remain false");
      assert.equal(getAisInfo(drv2.state(), MDC2060_ADAPTER).display, false, "getAisInfo.display must remain false");
      assert.equal(getAisInfo(drv2.state(), MDC2060_ADAPTER).cpaAlarm, false, "getAisInfo.cpaAlarm must remain false");
      assert.equal(drv2.state().ais.enabled, false, "ais.enabled must remain false when aisBoardOption=false");
      drv2.assertCanonicalState();
      drv2.verifyReplay();
    },
  },
  {
    id: "T2-076",
    name: "Replay Rejects Tampered Event, Out-of-Order seq, Wrong finalBridgeHash, Wrong Scenario",
    features: [31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO, MDC2060_STORM_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.press("range_down");
      const env = createBridgeReplay(drv.bridge);

      const badHash = structuredClone(env);
      badHash.finalBridgeHash = "f0-fnv1a32-00000000";
      assert.throws(() => replayBridgeSession([MDC2060_ADAPTER], MDC2060_COASTAL_SCENARIO, badHash));

      const badSeq = structuredClone(env);
      assert.ok(badSeq.history.length > 0, "Replay history must be non-empty");
      badSeq.history[0].seq = 99;
      assert.throws(() => replayBridgeSession([MDC2060_ADAPTER], MDC2060_COASTAL_SCENARIO, badSeq));

      assert.throws(() => replayBridgeSession([MDC2060_ADAPTER], MDC2060_STORM_SCENARIO, env));

      // Also verify single-session replay tampering fails
      const sDrv = createMdcSingleDriver({adapter: MDC2060_ADAPTER, scenario: DEFAULT_BRIDGE_WORLD_SCENARIO});
      sDrv.powerOnToTransmit({fastPreheat: true});
      const sEnv = createReplayEnvelope(sDrv.session);
      const sTampered = structuredClone(sEnv);
      sTampered.finalSessionHash = "f0-fnv1a32-deadbeef";
      assert.throws(() => replay(MDC2060_ADAPTER, DEFAULT_BRIDGE_WORLD_SCENARIO, sTampered));
    },
  },
  {
    id: "T2-077",
    name: "assessMdc2060Lesson Rejects Unknown Lesson ID & Missing Session",
    features: [33],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {getMdc2060Lesson, assessMdc2060Lesson} = await loadLessons();
      assert.equal(getMdc2060Lesson("MDC2060-LEARN-99") ?? null, null);
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      let failedClosed = false;
      try {
        const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-99", {scenario: MDC2060_COASTAL_SCENARIO});
        failedClosed = res?.passed === false;
      } catch (err) {
        assert.ok(!(err instanceof ReferenceError) && !(err instanceof SyntaxError), `Unexpected code error: ${err}`);
        failedClosed = true;
      }
      assert.equal(failedClosed, true, "Unknown lesson ID must throw or return passed: false");

      let missingSessionFailed = false;
      try {
        const res = assessMdc2060Lesson(null, "MDC2060-LEARN-01");
        missingSessionFailed = res?.passed === false;
      } catch (err) {
        assert.ok(!(err instanceof ReferenceError) && !(err instanceof SyntaxError), `Unexpected code error: ${err}`);
        missingSessionFailed = true;
      }
      assert.equal(missingSessionFailed, true, "Null session must fail closed");
    },
  },
  {
    id: "T2-078",
    name: "assessMdc2060Lesson Rejects Actions Performed While Powered OFF (ACTION_WHILE_POWERED_OFF)",
    features: [33],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.press("range_down");
      drv.rotate("gain", 3);
      drv.powerOnToTransmit({fastPreheat: true});
      const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-01", {scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(res.passed, false, "Actions while powered OFF must fail lesson assessment");
      assert.ok(Array.isArray(res.reasons) && res.reasons.length > 0);
    },
  },
  {
    id: "T2-079",
    name: "assessMdc2060Lesson Rejects Mismatched startSessionHash When startSeq > 0",
    features: [33],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.tick(2);
      const startSeq = drv.bridge.history.length;
      const validStartHash = bridgeSessionHash(drv.bridge);
      drv.powerOnToTransmit({fastPreheat: true});

      const validRes = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-01", {
        scenario: MDC2060_COASTAL_SCENARIO,
        startSeq,
        startSessionHash: validStartHash,
      });
      assert.equal(
        validRes?.passed,
        true,
        `Valid startSessionHash witness at startSeq=${startSeq} must pass before negative check: ${JSON.stringify(validRes?.reasons)}`,
      );

      const badHash = validStartHash === "f0-fnv1a32-00000000" ? "f0-fnv1a32-ffffffff" : "f0-fnv1a32-00000000";
      let rejected = false;
      try {
        const badRes = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-01", {
          scenario: MDC2060_COASTAL_SCENARIO,
          startSeq,
          startSessionHash: badHash,
        });
        rejected = badRes?.passed === false;
      } catch (err) {
        assert.ok(!(err instanceof ReferenceError) && !(err instanceof SyntaxError), `Unexpected code error: ${err}`);
        assert.match(String(err?.message ?? err), /hash|witness|session|mismatch|replay|startSeq/i, `Expected witness/hash validation error, got: ${err}`);
        rejected = true;
      }
      assert.equal(rejected, true, "Mismatched startSessionHash witness must fail closed");
    },
  },
  {
    id: "T2-080",
    name: "assessMdc2060Lesson Rejects Incomplete Action Sequences Across All 7 Lessons",
    features: [33],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO, MDC2060_STORM_SCENARIO} = await loadScenarios();
      const {MDC2060_LESSONS, assessMdc2060Lesson} = await loadLessons();
      for (const lesson of MDC2060_LESSONS) {
        const sc = lesson.id === "MDC2060-LEARN-04" ? MDC2060_STORM_SCENARIO : MDC2060_COASTAL_SCENARIO;
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: sc});
        drv.powerOnToStandby({fastPreheat: true});
        const res = assessMdc2060Lesson(drv.bridge, lesson.id, {scenario: sc});
        assert.equal(res.passed, false, `${lesson.id} must fail when operator stops at STANDBY`);
        assert.ok(Array.isArray(res.reasons) && res.reasons.length > 0);
        assert.equal(res.score, 0);
      }
    },
  },
  {
    id: "T2-081",
    name: "Mandatory Unvalidated Training Claims Invariant on All 7 Lesson Results",
    features: [33],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {MDC2060_LESSONS, assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      for (const lesson of MDC2060_LESSONS) {
        const res = assessMdc2060Lesson(drv.bridge, lesson.id, {scenario: MDC2060_COASTAL_SCENARIO});
        assert.equal(res.hardwareApproved, false, `${lesson.id} must set hardwareApproved=false`);
        assert.equal(res.publicReleaseEligible, false, `${lesson.id} must set publicReleaseEligible=false`);
        assert.equal(res.firmwareInstalled, null, `${lesson.id} must set firmwareInstalled=null`);
      }
    },
  },
  {
    id: "T2-082",
    name: "tMdc2060 Blocks Prototype-Chain Keys (toString, constructor, __proto__) & Missing Keys",
    features: [32],
    async run() {
      const i18n = await loadI18n();
      const {en, vi} = getLanguageCodes(i18n.MDC2060_LANGUAGES);
      assert.ok(en && vi);
      for (const protoKey of ["toString", "valueOf", "constructor", "__proto__", "hasOwnProperty"]) {
        assert.equal(i18n.tMdc2060(en, protoKey, "SAFE_FB"), "SAFE_FB", `EN tMdc2060 must block prototype key "${protoKey}"`);
        assert.equal(i18n.tMdc2060(vi, protoKey, "SAFE_FB"), "SAFE_FB", `VI tMdc2060 must block prototype key "${protoKey}"`);
      }
      assert.equal(i18n.tMdc2060("fr", "nonexistent", "FB"), "FB");
    },
  },
];
