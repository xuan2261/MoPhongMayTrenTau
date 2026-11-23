import test from "node:test";
import assert from "node:assert/strict";
import {createSession, dispatch, createReplayEnvelope, sessionHash} from "../src/core/session.mjs";
import {TRAINING_SCENARIO, observeSounder} from "../src/core/scenario.mjs";
import {fingerprint} from "../src/core/protocol.mjs";
import {FCV588_ADAPTER} from "../src/devices/fcv588/adapter.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from "../src/devices/fcv588/profile-version.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {
  FCV_MENU_CATEGORIES, FCV_MENU_ENTRIES, getFcvMenuItems, getInstallationMenu,
} from "../src/devices/fcv588/menu-atlas.mjs";
import {
  FCV_LANGUAGES, isVietnameseFcv, localizeFcvMenuHeader, localizeFcvCategory,
  localizeFcvMenuLabel, localizeFcvChoiceValue, localizeFcvNavLabel, localizeFcvMenuLegend,
} from "../src/devices/fcv588/i18n.mjs";
import {projectFcvEcho} from "../src/devices/fcv588/echo-projection.mjs";
import {projectFcvDisplayWidgets} from "../src/devices/fcv588/display-widgets.mjs";
import {projectFcvManualNavBoxes} from "../src/devices/fcv588/navigation.mjs";
import {
  encodeFcvSettings, decodeFcvSettings, decodeFcvProfile23Settings,
} from "../src/devices/fcv588/settings.mjs";
import {getFcvReplayAdapter, replayFcv588Envelope} from "../src/devices/fcv588/replay-compat.mjs";

const send = (s, input) => dispatch(s, FCV588_ADAPTER, input, TRAINING_SCENARIO);
const press = (s, control) => send(s, {kind: "press", control});
const pad = (s, direction) => send(s, {kind: "pad", control: "trackpad", direction});

function boot(initialSettings = null) {
  let s = createSession(FCV588_ADAPTER, TRAINING_SCENARIO);
  if (initialSettings) {
    s = send(s, {kind: "restore-settings", settings: initialSettings});
  }
  s = send(s, {kind: "down", control: "power"});
  s = send(s, {kind: "up", control: "power", durationMs: 100});
  s = send(s, {kind: "tick", steps: 4});
  return s;
}

test("D04 i18n dictionary matches 2016 FCV-588 hardware photos (giaoDien.jpg, nav1.jpg, nav2.jpg) 100%", () => {
  assert.deepEqual(FCV_LANGUAGES, ["English", "Tieng Viet"]);
  assert.ok(Object.isFrozen(FCV_LANGUAGES));

  const en = {language: "English", units: "Metric"};
  const vi = {language: "Tieng Viet", units: "Metric"};
  assert.equal(isVietnameseFcv(en), false);
  assert.equal(isVietnameseFcv(vi), true);
  assert.equal(isVietnameseFcv({settings: vi}), true);

  assert.equal(localizeFcvMenuHeader(en), "Menu");
  assert.equal(localizeFcvMenuHeader(vi), "B. Lenh");

  assert.deepEqual(
    FCV_MENU_CATEGORIES.map(c => localizeFcvCategory(c, vi)),
    ["Do sau", "Man hinh", "Bao dong", "Du lieu", "He thong"],
  );
  assert.equal(localizeFcvCategory("Installation", vi), "Cai dat");

  const sounderRowsVi = FCV_MENU_ENTRIES
    .filter(e => e.category === "Sounder")
    .map(e => localizeFcvMenuLabel(e.id, e.label, vi));
  assert.deepEqual(sounderRowsVi, [
    "Keo Hinh",
    "K. Phong dai",
    "Dich chuyen",
    "Nhieu can",
    "Xoa mau",
    "Nhieu tap",
    "Duong trang",
    "Dau Trang",
    "TVG",
    "Lam nhan",
    "Khu vuc Day",
    "C. suat Phat",
    "Ti le Phat",
  ]);

  // All 67 menu entries have deterministic strings in both languages
  assert.equal(FCV_MENU_ENTRIES.length, 67);
  for (const entry of FCV_MENU_ENTRIES) {
    assert.equal(localizeFcvMenuLabel(entry.id, entry.label, en), entry.label);
    const translated = localizeFcvMenuLabel(entry.id, entry.label, vi);
    assert.ok(typeof translated === "string" && translated.length > 0, entry.id);
  }
  assert.equal(localizeFcvMenuLabel("system.language", "Language", vi), "Ngon ngu");
  assert.equal(localizeFcvMenuLabel("system.draft", "Draft", vi), "Mon nuoc");
  assert.equal(localizeFcvMenuLabel("system.units", "Units", vi), "Don vi");
  assert.equal(localizeFcvMenuLabel("system.calibration", "Calibration", vi), "Hieu chuan");
  assert.equal(localizeFcvMenuLabel("system.demo", "Demo", vi), "Mo phong");
  assert.equal(localizeFcvMenuLabel("system.restore", "Restore Defaults", vi), "Mac dinh");

  // Choice values from giaoDien.jpg
  assert.equal(localizeFcvChoiceValue("pictureAdvance", "4x", vi), "x4");
  assert.equal(localizeFcvChoiceValue("zoomMode", "Bottom Lock", vi), "Bam Day");
  assert.equal(localizeFcvChoiceValue("shift", "2", vi), "2m");
  assert.equal(localizeFcvChoiceValue("interference", "Auto", vi), "Tu Dong");
  assert.equal(localizeFcvChoiceValue("colorErase", "0", vi), "0%");
  assert.equal(localizeFcvChoiceValue("clutter", "60", vi), "60%");
  assert.equal(localizeFcvChoiceValue("whiteLine", "Edge", vi), "Bien");
  assert.equal(localizeFcvChoiceValue("tvg", "Medium", vi), "Tr. Binh");
  assert.equal(localizeFcvChoiceValue("smoothing", "Off", vi), "Tat");
  assert.equal(localizeFcvChoiceValue("txPower", "Auto", vi), "Tu Dong");
  assert.equal(localizeFcvChoiceValue("txRate", "10", vi), "10");

  // Legend box from giaoDien.jpg
  assert.deepEqual(localizeFcvMenuLegend(vi), [
    "▲/▼/◀/▶: Chon lua",
    "[ENTER] : Nhap vao",
    "[MENU]  : Quay lai",
  ]);
  assert.deepEqual(localizeFcvMenuLegend(en), [
    "▲/▼/◀/▶: Select",
    "[ENTER] : Enter",
    "[MENU]  : Back",
  ]);
});

test("D04 Language switching in System and Installation triggers §2.4 4-tick reboot only when language changes", () => {
  assert.equal(initialFcv588State().settings.language, "English");
  let s = boot();

  // Navigate to System > Language
  s = press(s, "menu");
  for (let i = 0; i < 4; i++) s = pad(s, "right");
  const langIdx = getFcvMenuItems("System", s.deviceState).findIndex(x => x.id === "system.language");
  assert.ok(langIdx >= 0);
  for (let i = 0; i < langIdx; i++) s = pad(s, "down");

  // Committing unchanged "English" closes editor normally without rebooting
  s = press(s, "enter");
  assert.equal(s.deviceState.overlay?.editing, true);
  assert.equal(s.deviceState.overlay?.draftValue, "English");
  s = press(s, "enter");
  assert.equal(s.deviceState.power, "on");
  assert.equal(s.deviceState.overlay?.kind, "menu");
  assert.equal(s.deviceState.overlay?.editing, false);

  // Cancel staged "Tieng Viet" leaves "English" intact
  s = press(s, "enter");
  s = pad(s, "right");
  assert.equal(s.deviceState.overlay?.draftValue, "Tieng Viet");
  s = press(s, "menu");
  assert.equal(s.deviceState.settings.language, "English");
  assert.equal(s.deviceState.power, "on");

  // Commit "Tieng Viet" -> triggers 4-tick reboot
  s = press(s, "enter");
  s = pad(s, "right");
  s = press(s, "enter");
  assert.equal(s.deviceState.settings.language, "Tieng Viet");
  assert.equal(s.deviceState.power, "booting");
  assert.equal(s.deviceState.bootElapsed, 0);
  assert.equal(s.deviceState.overlay, null);
  assert.equal(s.deviceState.notice, "LANGUAGE UPDATED · REBOOTING");

  for (let tick = 1; tick <= 3; tick++) {
    s = send(s, {kind: "tick", steps: 1});
    assert.equal(s.deviceState.power, "booting");
    assert.equal(s.deviceState.bootElapsed, tick);
  }
  s = send(s, {kind: "tick", steps: 1});
  assert.equal(s.deviceState.power, "on");
  assert.equal(s.deviceState.settings.language, "Tieng Viet");

  // Switch back to English via Installation > Language -> also triggers 4-tick reboot
  s = press(s, "menu");
  for (let i = 0; i < 4; i++) s = pad(s, "right");
  const instIdx = getFcvMenuItems("System", s.deviceState).findIndex(x => x.id === "system.installation");
  for (let i = 0; i < instIdx; i++) s = pad(s, "down");
  s = press(s, "enter");
  assert.equal(s.deviceState.overlay?.kind, "installation");
  assert.equal(getInstallationMenu(s.deviceState)[0].settingKey, "language");
  s = press(s, "enter");
  assert.equal(s.deviceState.overlay?.draftValue, "Tieng Viet");
  s = pad(s, "left");
  assert.equal(s.deviceState.overlay?.draftValue, "English");
  s = press(s, "enter");
  assert.equal(s.deviceState.settings.language, "English");
  assert.equal(s.deviceState.power, "booting");
  s = send(s, {kind: "tick", steps: 4});
  assert.equal(s.deviceState.power, "on");

  const env = createReplayEnvelope(s);
  assert.equal(sessionHash(replayFcv588Envelope(TRAINING_SCENARIO, env)), sessionHash(s));
});

test("White Line Edge (Bien), Battery voltageText (13.6V / 10.8V), and NAV Vietnamese placeholders", () => {
  const s = boot({language: "Tieng Viet", whiteLine: "Edge", battery: "On"});
  const obs = observeSounder(TRAINING_SCENARIO, s.worldState, {columns: 32, rows: 121});
  const echo = projectFcvEcho(obs, s.deviceState, {frequencyKhz: 200, rows: 80});
  assert.equal(echo.overlays.whiteLine, true);
  assert.equal(echo.overlays.whiteLineMode, "Edge");
  assert.equal(localizeFcvChoiceValue("whiteLine", s.deviceState.settings.whiteLine, s.deviceState.settings), "Bien");

  const normalWidgets = projectFcvDisplayWidgets(s.deviceState, null, s.worldState.simTick);
  assert.equal(normalWidgets.battery?.status, "NO_HARDWARE_DATA");
  assert.equal(normalWidgets.battery?.voltageText, "13.6V");

  const lowWidgets = projectFcvDisplayWidgets({
    ...s.deviceState,
    trainingFixture: {...s.deviceState.trainingFixture, lowBattery: true},
  }, null, s.worldState.simTick);
  assert.equal(lowWidgets.battery?.voltageText, "10.8V");

  const nav2Vi = projectFcvManualNavBoxes({
    mode: "NAV2",
    simTick: s.worldState.simTick,
    sample: null,
    navState: s.deviceState.navigation,
    settings: {
      ...s.deviceState.settings,
      nav2Box1: "SPEED (STW)",
      nav2Box2: "SPEED (SOG)",
      nav2Box3: "POSITION",
      nav2Box4: "DEPTH",
    },
    sonarDepthM: 19.7,
  });
  assert.equal(nav2Vi.status, "NO_DATA");
  assert.deepEqual(nav2Vi.boxes.map(b => b.label), [
    "Toc do (STW)",
    "Toc do (SOG)",
    "Vi tri",
    "Do sau",
  ]);
  assert.equal(nav2Vi.boxes[0].value, "NO DATA");
  assert.equal(nav2Vi.boxes[0].placeholderValue, "--.- kn");
  assert.equal(nav2Vi.boxes[1].placeholderValue, "--.- kn");
  assert.equal(nav2Vi.boxes[2].placeholderValue, "--°--.---'");
  assert.equal(nav2Vi.boxes[3].placeholderValue, "--.- m");
  assert.match(nav2Vi.boxes[3].value, /19\.7 m \(SIM\)/);

  assert.equal(localizeFcvNavLabel("Water Temp", "TEMPERATURE", {language: "Tieng Viet"}), "Nhiet do");
  assert.equal(localizeFcvNavLabel("Trip", "TRIP", {language: "Tieng Viet"}), "Hanh trinh");
  assert.equal(localizeFcvNavLabel("Odometer", "ODOMETER", {language: "Tieng Viet"}), "Tong hanh trinh");
  assert.equal(localizeFcvNavLabel("Course", "COURSE", {language: "Tieng Viet"}), "Huong di");
  assert.equal(localizeFcvNavLabel("Wind", "WIND", {language: "Tieng Viet"}), "Gio");
});

test("Frozen profile21/22/23 replay hashes remain byte-identical alongside active F1-public-reference-24", () => {
  assert.equal(FCV588_PUBLIC_PROFILE_REVISION, "F1-public-reference-24");
  const expectedSealed = [
    ["F1-public-reference-21", "f0-fnv1a32-f2d5289b", "f0-fnv1a32-84f4ae40", "f0-fnv1a32-25a59bb0"],
    ["F1-public-reference-22", "f0-fnv1a32-83ab0d53", "f0-fnv1a32-6d4052c8", "f0-fnv1a32-64364495"],
    ["F1-public-reference-23", "f0-fnv1a32-21eaccd9", "f0-fnv1a32-0cab1512", "f0-fnv1a32-8acd0893"],
  ];
  for (const [rev, profileHash, expectedSessionHash, expectedEnvFp] of expectedSealed) {
    const adapter = getFcvReplayAdapter(rev);
    let s = createSession(adapter, TRAINING_SCENARIO);
    for (const ev of [
      {kind: "down", control: "power"},
      {kind: "up", control: "power", durationMs: 100},
      {kind: "tick", steps: 4},
      {kind: "press", control: "menu"},
      {kind: "pad", control: "trackpad", direction: "down"},
    ]) {
      s = dispatch(s, adapter, ev, TRAINING_SCENARIO);
    }
    const env = createReplayEnvelope(s);
    assert.equal(s.meta.profileHash, profileHash, rev);
    assert.equal(sessionHash(s), expectedSessionHash, rev);
    assert.equal(env.contentFingerprint, expectedEnvFp, rev);
    assert.equal(sessionHash(replayFcv588Envelope(TRAINING_SCENARIO, env)), expectedSessionHash, rev);
  }

  const p23Body = {
    schemaVersion: 18,
    profileClass: "PUBLIC_REFERENCE",
    profileRevision: "F1-public-reference-23",
    settings: {whiteLine: "On", palette: "Blue"},
  };
  const p23Raw = JSON.stringify({...p23Body, contentFingerprint: fingerprint(p23Body)});
  assert.equal(decodeFcvSettings(p23Raw), null);
  assert.deepEqual(decodeFcvProfile23Settings(p23Raw), {whiteLine: "On", palette: "Blue"});

  const p24Encoded = encodeFcvSettings({language: "Tieng Viet", whiteLine: "Edge"});
  assert.equal(JSON.parse(p24Encoded).profileRevision, "F1-public-reference-24");
  assert.deepEqual(decodeFcvSettings(p24Encoded), {language: "Tieng Viet", whiteLine: "Edge"});
});
