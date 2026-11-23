import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {fingerprint} from "../src/core/protocol.mjs";
import {createSession, dispatch, sessionHash} from "../src/core/session.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {DISPLAY_MODES} from "../src/devices/fcv588/model.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from "../src/devices/fcv588/profile-version.mjs";
import {encodeFcvSettings} from "../src/devices/fcv588/settings.mjs";
import {
  localizeFcvControlTitle,
  localizeFcvControlLegend,
  localizeFcvChoiceValue,
} from "../src/devices/fcv588/i18n.mjs";
import {projectFcvControl} from "../web/lcd-control-presentation.mjs";
import {decodeFcv588ArchivePair} from "../web/fcv588-archive-import.mjs";
import {
  FCV588_SETTINGS_TRANSFER_SCHEMA,
  FCV588_SETTINGS_STORAGE_KEY,
  FCV588_SETTINGS_FILE_NAME,
  FCV588_REPLAY_ENVELOPE_FILE_NAME,
  FCV588_REPLAY_SIDECAR_FILE_NAME,
  exportFcv588SettingsText,
  importFcv588SettingsText,
  buildFcv588ReplayExportFiles,
} from "../web/fcv588-settings-transfer.mjs";

const send = (s, event) => dispatch(s, adapter, event, scenario);
const press = (s, control) => send(s, {kind: "press", control});
const pad = (s, direction) => send(s, {kind: "pad", control: "trackpad", direction});
const shortPower = s =>
  send(send(s, {kind: "down", control: "power"}), {kind: "up", control: "power", durationMs: 120});
const boot = (settings = null) => {
  let s = createSession(adapter, scenario);
  if (settings) s = send(s, {kind: "restore-settings", settings});
  return send(shortPower(s), {kind: "tick", steps: 4});
};

test("projectFcvControl renders preset depth on Manual Range, live offset on Auto Gain, ASCII bar on Brill, and full Tieng Viet localization", () => {
  // 1. Range (English & Tieng Viet)
  let s = pad(press(boot(), "range"), "right");
  const enRange = projectFcvControl(s.deviceState);
  assert.equal(enRange.title, "Range");
  assert.equal(enRange.rows.length, 2);
  assert.deepEqual(enRange.rows.map(r => r.value), ["auto", "manual"]);
  assert.equal(enRange.rows[0].text, "Auto");
  assert.equal(enRange.rows[1].text, "Manual : 40 m");
  assert.match(enRange.draftText, /Range 4.*40 m/);
  assert.match(enRange.help, /ENTER lưu.*MENU\/ESC hủy/);
  assert.doesNotMatch(enRange.currentText, /Đã lưu/);
  assert.ok(enRange.legendLines.join("\n").includes("[ENTER]"));
  assert.ok(enRange.legendLines.join("\n").includes("[MENU]"));

  const feetRange = projectFcvControl({
    ...s.deviceState,
    settings: {...s.deviceState.settings, units: "Feet", rangePreset4: "200"},
  });
  assert.equal(feetRange.rows[1].text, "Manual : 656 ft");
  assert.match(feetRange.draftText, /656 ft/);

  const viRange = projectFcvControl({
    ...s.deviceState,
    settings: {...s.deviceState.settings, language: "Tieng Viet"},
  });
  assert.equal(viRange.title, "Thang do");
  assert.deepEqual(viRange.rows.map(r => r.text), ["Tu Dong", "Tay : 40 m"]);
  assert.match(viRange.legendLines.join("\n"), /Nhap vao.*Quay lai/s);

  // 2. Auto Gain (English & Tieng Viet)
  let g = send(boot(), {kind: "push", control: "gain"});
  g = pad(pad(g, "down"), "right");
  const enGain = projectFcvControl(g.deviceState);
  assert.equal(enGain.title, "Auto Gain");
  assert.deepEqual(enGain.rows.map(r => r.value), ["fishing", "cruising", "off"]);
  assert.deepEqual(enGain.rows.map(r => r.text), [
    "Fishing (0)",
    "Cruising (+1)",
    "Off (Manual 5.0)",
  ]);
  assert.match(enGain.draftText, /Cruising.*\+1/);
  assert.match(enGain.help, /▲\/▼.*◀\/▶.*ENTER lưu.*MENU\/ESC hủy/);

  const viGain = projectFcvControl({
    ...g.deviceState,
    settings: {...g.deviceState.settings, language: "Tieng Viet"},
  });
  assert.equal(viGain.title, "Khuech dai TD");
  assert.deepEqual(viGain.rows.map(r => r.text), [
    "Danh ca (0)",
    "Hanh trinh (+1)",
    "Tat (Tay 5.0)",
  ]);

  // 3. Brill (English & Tieng Viet + marine ASCII bar)
  const b = shortPower(shortPower(boot())); // preview 8 from 9
  const enBrill = projectFcvControl(b.deviceState);
  assert.equal(enBrill.title, "Brill");
  assert.equal(enBrill.rows.length, 7);
  const selectedBrill = enBrill.rows.find(r => r.selected);
  assert.equal(selectedBrill?.value, "8");
  assert.equal(selectedBrill?.text, "8  ████████░");
  const zeroBrill = projectFcvControl({
    ...b.deviceState,
    overlay: {...b.deviceState.overlay, value: 0},
  });
  assert.equal(zeroBrill.rows.find(r => r.selected)?.text, "0  ░░░░░░░░░");
  assert.match(enBrill.help, /MENU\/ESC lưu/);
  assert.doesNotMatch(enBrill.help, /hủy/);

  const viBrill = projectFcvControl({
    ...b.deviceState,
    settings: {...b.deviceState.settings, language: "Tieng Viet"},
  });
  assert.equal(viBrill.title, "Do sang");
  assert.equal(viBrill.rows.find(r => r.selected)?.text, "8  ████████░");

  // 4. MODE (English & Tieng Viet)
  const m = send(boot(), {kind: "rotate", control: "mode", steps: 1});
  const enMode = projectFcvControl(m.deviceState);
  assert.equal(enMode.title, "MODE");
  assert.deepEqual(enMode.rows.map(r => r.value), DISPLAY_MODES);
  assert.match(enMode.help, /Xoay MODE.*tự.*MENU\/ESC hủy/);
  assert.doesNotMatch(enMode.help, /ENTER/);
  assert.doesNotMatch(enMode.legendLines.join("\n"), /ENTER/);

  const viMode = projectFcvControl({
    ...m.deviceState,
    settings: {...m.deviceState.settings, language: "Tieng Viet"},
  });
  assert.equal(viMode.title, "Che do");
  assert.equal(localizeFcvControlTitle("mode", "Tieng Viet"), "Che do");
  assert.equal(localizeFcvControlLegend("mode", "Tieng Viet")[0], "MODE: Chon lua");
  assert.equal(localizeFcvChoiceValue("tankenmaruPicSync", "Yes", {language: "Tieng Viet"}), "Co");
});

test("fcv588-settings-transfer round-trips F1-public-reference-24 & legacy profiles 19..23 and exports valid archive replay pairs", () => {
  assert.equal(FCV588_PUBLIC_PROFILE_REVISION, "F1-public-reference-24");
  const s = boot({language: "Tieng Viet", whiteLine: "Edge", zoomMode: "Bottom Zoom", zoomRange: "10"});
  const exportedText = exportFcv588SettingsText(s.deviceState.settings);
  const parsedDoc = JSON.parse(exportedText);
  assert.equal(parsedDoc.schema, FCV588_SETTINGS_TRANSFER_SCHEMA);
  assert.equal(parsedDoc.trainingOnly, true);
  assert.equal(parsedDoc.settingsStorageKey, FCV588_SETTINGS_STORAGE_KEY);

  const imported = importFcv588SettingsText(exportedText);
  assert.equal(imported.profileRevision, "F1-public-reference-24");
  assert.equal(imported.legacyRevision, null);
  assert.deepEqual(imported.settings, s.deviceState.settings);

  // Round-trip legacy profiles 19..23
  for (const revNum of ["19", "20", "21", "22", "23"]) {
    const profileRevision = `F1-public-reference-${revNum}`;
    const body = {
      schemaVersion: 18,
      profileClass: "PUBLIC_REFERENCE",
      profileRevision,
      settings: {whiteLine: "On", palette: "Blue", units: "Metric"},
    };
    const legacyRaw = JSON.stringify({...body, contentFingerprint: fingerprint(body)});
    const legacyTransfer = exportFcv588SettingsText(legacyRaw);
    const restored = importFcv588SettingsText(legacyTransfer);
    assert.equal(restored.profileRevision, profileRevision);
    assert.equal(restored.legacyRevision, revNum);
    assert.deepEqual(restored.settings, body.settings);
    const applied = send(createSession(adapter, scenario), {
      kind: "restore-settings",
      settings: restored.settings,
    });
    assert.equal(applied.deviceState.settings.whiteLine, "On");
    assert.equal(applied.deviceState.settings.palette, "Blue");
  }

  // Reject hostile / tampered settings transfer payloads
  assert.throws(() => importFcv588SettingsText(""), /18 KB|hợp lệ/);
  assert.throws(() => importFcv588SettingsText("{"), /JSON/);
  assert.throws(
    () => importFcv588SettingsText(JSON.stringify({...parsedDoc, extra: 1})),
    /Từ chối/,
  );
  assert.throws(
    () => importFcv588SettingsText(JSON.stringify({...parsedDoc, trainingOnly: false})),
    /Từ chối/,
  );
  const tamperedSettings = JSON.parse(parsedDoc.encodedSettings);
  tamperedSettings.settings.palette = "White";
  assert.throws(
    () => importFcv588SettingsText(JSON.stringify({
      ...parsedDoc,
      encodedSettings: JSON.stringify(tamperedSettings),
    })),
    /Từ chối/,
  );
  assert.equal(FCV588_SETTINGS_FILE_NAME, "FCV588-settings-training-only.json");

  // One-click session replay pair export passes decodeFcv588ArchivePair
  let zoomSession = send(s, {kind: "rotate", control: "mode", steps: -1});
  zoomSession = send(zoomSession, {kind: "ui-tick", elapsedMs: 6000});
  assert.equal(zoomSession.deviceState.mode, "LF-ZOOM");

  const pair = buildFcv588ReplayExportFiles(zoomSession, "P23_LOWER_BOTTOM");
  assert.equal(pair.envelopeFileName, FCV588_REPLAY_ENVELOPE_FILE_NAME);
  assert.equal(pair.sidecarFileName, FCV588_REPLAY_SIDECAR_FILE_NAME);
  const archiveSummary = decodeFcv588ArchivePair(pair.envelopeText, pair.sidecarText);
  assert.equal(archiveSummary.profileRevision, "F1-public-reference-24");
  assert.equal(archiveSummary.presentationContract, "P23_LOWER_BOTTOM");
  assert.equal(archiveSummary.sessionHash, sessionHash(zoomSession));
  assert.equal(archiveSummary.eventCount, zoomSession.events.length);
  assert.equal(archiveSummary.zoomPreview?.bottomFraction, 0.75);

  const encodedDirect = encodeFcvSettings(zoomSession.deviceState.settings);
  assert.equal(importFcv588SettingsText(exportFcv588SettingsText(encodedDirect)).encodedSettings, encodedDirect);
});

test("UI shell, dark power-off LCD glass, front-panel marks, keyboard shortcuts, and locked contracts remain intact", async () => {
  const [html, css, app, transferMod] = await Promise.all([
    readFile(new URL("../web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../web/app.mjs", import.meta.url), "utf8"),
    readFile(new URL("../web/fcv588-settings-transfer.mjs", import.meta.url), "utf8"),
  ]);

  // 1. Power-off LCD dark glass z-index >= 4 and hidden rule
  const offScreenRule = css.match(/\.off-screen\s*\{([^}]*)\}/s)?.[1] ?? "";
  const offZ = Number(offScreenRule.match(/z-index\s*:\s*(\d+)/)?.[1] ?? 0);
  assert.ok(offZ >= 4, `.off-screen must have z-index >= 4 to block header/depth bleed-through (got ${offZ})`);
  assert.match(offScreenRule, /inset\s*:\s*0/);
  assert.match(offScreenRule, /position\s*:\s*absolute/);
  assert.match(offScreenRule, /linear-gradient\(155deg,\s*#050a11/);
  assert.match(css, /\.off-screen\[hidden\]\s*\{\s*display:\s*none;\s*\}/);

  // 2. Exact 12 <button> elements inside .controls (zero extra buttons in .device-frame)
  const deviceBlock = html.slice(
    html.indexOf('<div class="device-frame"'),
    html.indexOf('<aside class="training-panel">'),
  );
  const controlsButtons = deviceBlock.match(/<button\b/g) ?? [];
  assert.equal(controlsButtons.length, 12, "device-frame/.controls must contain exact 12 hardware <button> controls");

  // 3. Direct front-panel click handlers for .mode-scale [data-mode] and .gain-scale-mark
  assert.match(css, /\.mode-scale\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(css, /\.mode-scale\s+\[data-mode\]\s*\{[^}]*pointer-events:\s*auto;[^}]*cursor:\s*pointer;/s);
  assert.match(css, /\.gain-scale-mark\s*\{[^}]*pointer-events:\s*auto;[^}]*cursor:\s*pointer;/s);
  assert.match(app, /document\.querySelector\("\.mode-scale"\)\?\.addEventListener\("click"/);
  assert.match(app, /document\.querySelector\("\.gain-scale-minus"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*rotate\("gain",\s*-1\)\)/);
  assert.match(app, /document\.querySelector\("\.gain-scale-plus"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*rotate\("gain",\s*1\)\)/);

  // 4. Keyboard shortcuts (b/B, f/F, m/M, r/R, g/G) with heldControls guard
  assert.match(app, /Object\.hasOwn\(session\.heldControls,\s*control\)/);
  for (const key of ["b", "B", "f", "F", "m", "M", "r", "R", "g", "G"]) {
    assert.match(app, new RegExp(`\\b${key}:\\s*\\(\\)\\s*=>`), `missing shortcut ${key}`);
  }

  // 5. Vietnamese overlays & control footer legend in app.mjs, zero innerHTML= / device-focus-toggle
  assert.doesNotMatch(app, /innerHTML\s*=/);
  assert.doesNotMatch(app, /device-focus-toggle/);
  assert.match(app, /DANG KHOI DONG \.\.\. /);
  assert.match(app, /KHONG CO TIN HIEU DO SAU/);
  assert.match(app, /NO SONAR DATA/);
  assert.match(app, /NMEA: TAT\\nVI TRI: /);
  assert.match(app, /Ngo ra: /);
  assert.match(app, /HANH TRINH  /);

  const controlBranch = app.slice(
    app.indexOf("function renderControlChrome("),
    app.indexOf("function renderDialog()"),
  );
  assert.match(controlBranch, /footer\.textContent=/);
  assert.match(controlBranch, /footer\.hidden=false/);
  assert.doesNotMatch(controlBranch, /innerHTML|dispatch\(|send\(|setTimeout|setInterval|Date\.now/);

  // 6. Workspace fullscreen button, settings transfer controls, and dedicated FCV-588 help
  const toggleIdx = html.indexOf('id="device-focus-toggle"');
  const fullscreenIdx = html.indexOf('id="btn-fullscreen"');
  const frameIdx = html.indexOf('<div class="device-frame"');
  assert.ok(toggleIdx > 0 && toggleIdx < frameIdx);
  assert.ok(fullscreenIdx > 0 && fullscreenIdx < frameIdx);
  for (const id of [
    "btn-quick-power",
    "btn-export-settings",
    "import-settings-file",
    "btn-import-settings",
    "btn-export-replay-pair",
    "settings-transfer-status",
  ]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) ?? []).length, 1, `unique #${id} required`);
  }
  assert.doesNotMatch(html, /MDC-2060|KODEN J2000/, "distracting multi-device roadmap removed from FCV-588 console");
  assert.match(html, /Bảng Phím Tắt &amp; Thao Tác FCV-588/);
  assert.doesNotMatch(transferMod, /\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|document\b/);
});
