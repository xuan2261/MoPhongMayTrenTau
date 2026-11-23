import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
  getFcvDisplayPalette,
  getFcvLcdContrastTheme,
} from "../src/devices/fcv588/display-palette.mjs";
import {
  depthFractionOnFcvFrame,
  projectFcvBottomZone,
  projectFcvAScope,
  projectFcvBottomDiscrimination,
} from "../src/devices/fcv588/echo-projection.mjs";
import {
  convertFcvDepth,
  formatFcvDepth,
  formatFcvFishSize,
} from "../src/devices/fcv588/units.mjs";
import {
  projectFcvAuthenticHeader,
  projectFcvDepthTicks,
  projectFcvDepthSubTicks,
  projectFcvMainMenu,
  formatFcvNavBoxForLcd,
  localizeFcvNavLabel,
} from "../web/lcd-presentation.mjs";
import {rasterizeFcvEcho} from "../web/fcv588-echo-rasterizer.mjs";

const [html, css, app] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../web/app.mjs", import.meta.url), "utf8"),
]);

test("Authentic bezel: FURUNO inside black glass, concentric TrackPad chevrons, GAIN/PUSH TO AUTO/MODE, and blue BRILL pill", () => {
  const housing = html.split('<div class="display-housing">')[1]?.split('<div class="controls"')[0] ?? "";
  assert.match(housing, /<div class="bezel-header"><span class="manufacturer-name" lang="en">FURUNO<\/span><\/div>/);

  const controls = html.split('<div class="controls"')[1]?.split('<aside class="training-panel">')[0] ?? "";
  // TrackPad sleek chevrons ‹ ▲ ▼ ›
  assert.match(controls, /id="pad-up"[^>]*>▲<\/button>/);
  assert.match(controls, /id="pad-left"[^>]*>‹<\/button>/);
  assert.match(controls, /id="pad-right"[^>]*>›<\/button>/);
  assert.match(controls, /id="pad-down"[^>]*>▼<\/button>/);

  // GAIN above knob, - / + flanking knob, PUSH TO AUTO below knob
  const gainWrap = controls.split('<div class="knob-wrap gain-wrap">')[1]?.split('<div class="knob-wrap mode-wrap">')[0] ?? "";
  const gainTitleIdx = gainWrap.indexOf(">GAIN<");
  const gainMinusIdx = gainWrap.indexOf('gain-scale-minus');
  const gainKnobIdx = gainWrap.indexOf('id="gain-knob"');
  const gainPlusIdx = gainWrap.indexOf('gain-scale-plus');
  const pushAutoIdx = gainWrap.indexOf(">PUSH TO AUTO<");
  assert.ok(gainTitleIdx >= 0 && gainTitleIdx < gainKnobIdx, "GAIN stays above #gain-knob");
  assert.ok(gainMinusIdx > gainTitleIdx && gainMinusIdx < gainKnobIdx, "- mark precedes #gain-knob");
  assert.ok(gainPlusIdx > gainKnobIdx && gainPlusIdx < pushAutoIdx, "+ mark follows #gain-knob");
  assert.ok(pushAutoIdx > gainKnobIdx, "PUSH TO AUTO sits below #gain-knob");
  assert.match(gainWrap, /gain-scale-minus[^>]*aria-hidden="true"/);
  assert.match(gainWrap, /gain-scale-plus[^>]*aria-hidden="true"/);

  // MODE scale above knob and MODE label below knob
  const modeWrap = controls.split('<div class="knob-wrap mode-wrap">')[1]?.split('id="key-power"')[0] ?? "";
  const modeScaleIdx = modeWrap.indexOf('class="mode-scale"');
  const modeKnobIdx = modeWrap.indexOf('id="mode-knob"');
  const modeLabelIdx = modeWrap.indexOf(">MODE<");
  assert.ok(modeScaleIdx >= 0 && modeScaleIdx < modeKnobIdx, "NAV1..NAV2 scale precedes #mode-knob");
  assert.ok(modeLabelIdx > modeKnobIdx, "MODE label sits below #mode-knob");

  // Blue pill POWER / BRILL button with BRILL stacked inside
  const powerBtn = controls.match(/<button id="key-power"[^>]*>([\s\S]*?)<\/button>/)?.[1] ?? "";
  assert.match(powerBtn, /class="power-glyph"/);
  assert.match(powerBtn, /<span[^>]*>BRILL<\/span>/);
  const powerCss = css.match(/\.power-button\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(powerCss, /#1f6fd8[\s\S]*#0e4da8/i);
  assert.match(powerCss, /border-radius:\s*999px/);
  const powerSpanCss = css.match(/\.power-button\s+span\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(powerSpanCss, /position:\s*static/);
});

test("Authentic royal-blue header bar renders MAN_R, G: 10, 13.6V, and NAV right-1/3 sonar strip", () => {
  assert.match(css, /linear-gradient\(180deg,\s*#0d36a8\s+0%,\s*#164bd1\s+55%,\s*#09257a\s+100%\)/i);
  assert.match(css, /\.depth-indicator\[data-view="DUAL"\],\s*\.depth-indicator\[data-view="LF-ZOOM"\],\s*\.depth-indicator\[data-view="HF-ZOOM"\]/);

  const baseState = {
    power: "on",
    mode: "HF",
    rangeMode: "manual",
    gainMode: "off",
    manualGain: 10,
    autoGainOffset: 0,
    settings: {
      headerInfo: "On",
      pictureAdvance: "4x",
      battery: "On",
      zoomMode: "Bottom Lock",
    },
  };
  const headerWithVolt = projectFcvAuthenticHeader(baseState, {battery: {voltageText: "13.5V"}});
  assert.equal(headerWithVolt.scope, "full");
  assert.equal(headerWithVolt.leftText, "MAN_R   G: 10   HF");
  assert.equal(headerWithVolt.rightText, "13.5V");

  const defaultVolt = projectFcvAuthenticHeader(baseState, {battery: {}});
  assert.equal(defaultVolt.rightText, "13.6V");

  const zoomHeader = projectFcvAuthenticHeader({...baseState, mode: "LF-ZOOM"}, null);
  assert.match(zoomHeader.leftText, /BL-LF/);

  const autoHeader = projectFcvAuthenticHeader({
    ...baseState,
    mode: "DUAL",
    rangeMode: "auto",
    gainMode: "fishing",
    settings: {...baseState.settings, battery: "Off", pictureAdvance: "4x"},
  });
  assert.equal(autoHeader.leftText, "AUTO_R   G:AF   LF/HF");
  assert.equal(autoHeader.rightText, "x4");

  const navHeader = projectFcvAuthenticHeader({...baseState, mode: "NAV2"}, {battery: {voltageText: "13.5V"}});
  assert.equal(navHeader.scope, "nav-sonar");
  assert.equal(navHeader.text, "13.5V");
});

test("Vietnamese D04 main menu & NAV boxes match giaoDien.jpg and nav1/nav2.jpg", () => {
  assert.match(css, /#1c4596/i, "FURUNO dark blue menu header background");
  assert.match(css, /#e89a48/i, "FURUNO warm amber active row/category highlight");

  const viState = {
    power: "on",
    mode: "HF",
    rangeMode: "manual",
    overlay: {kind: "menu", category: "Sounder", itemIndex: 6, editing: false, draftValue: null},
    settings: {
      language: "Tieng Viet",
      units: "Metric",
      pictureAdvance: "4x",
      zoomMode: "Bottom Lock",
      shift: "2",
      interference: "Auto",
      colorErase: "0",
      clutter: "60",
      whiteLine: "Edge",
      whiteMarker: "Off",
      tvg: "Medium",
      smoothing: "Off",
      bottomZone: "Standard",
      txPower: "Auto",
      txRate: "10",
    },
    trainingFixture: {},
    syntheticConditions: {},
  };

  const view = projectFcvMainMenu(viState);
  assert.ok(view, "Vietnamese Sounder menu must project");
  assert.equal(view.menuHeader, "B. Lenh");
  assert.equal(view.category, "Do sau");
  assert.deepEqual(
    view.categories.map(c => c.label),
    ["Do sau", "Man hinh", "Bao dong", "Du lieu", "He thong"],
  );

  const byId = Object.fromEntries(view.rows.map(r => [r.id, r]));
  assert.equal(byId["sounder.pictureAdvance"].label, "Keo Hinh");
  assert.equal(byId["sounder.pictureAdvance"].valueText, "x4");
  assert.equal(byId["sounder.zoomMode"].label, "K. Phong dai");
  assert.equal(byId["sounder.zoomMode"].valueText, "Bam Day");
  assert.equal(byId["sounder.shift"].label, "Dich chuyen");
  assert.equal(byId["sounder.shift"].valueText, "2m");
  assert.equal(byId["sounder.interference"].label, "Nhieu can");
  assert.equal(byId["sounder.interference"].valueText, "Tu Dong");
  assert.equal(byId["sounder.colorErase"].label, "Xoa mau");
  assert.equal(byId["sounder.colorErase"].valueText, "0%");
  assert.equal(byId["sounder.clutter"].label, "Nhieu tap");
  assert.equal(byId["sounder.clutter"].valueText, "60%");
  assert.equal(byId["sounder.whiteLine"].label, "Duong trang");
  assert.equal(byId["sounder.whiteLine"].valueText, "Bien");
  assert.match(byId["sounder.whiteLine"].text, /Duong trang : Bien$/);
  assert.equal(byId["sounder.tvg"].valueText, "Tr. Binh");
  assert.equal(byId["sounder.smoothing"].label, "Lam nhan");
  assert.equal(byId["sounder.smoothing"].valueText, "Tat");
  assert.equal(byId["sounder.txPower"].label, "C. suat Phat");
  assert.equal(byId["sounder.txPower"].valueText, "Tu Dong");
  assert.equal(byId["sounder.txRate"].label, "Ti le Phat");
  assert.equal(byId["sounder.txRate"].valueText, "10");

  assert.deepEqual(view.legendLines, [
    "▲/▼/◀/▶: Chon lua",
    "[ENTER] : Nhap vao",
    "[MENU]  : Quay lai",
  ]);

  assert.equal(formatFcvNavBoxForLcd({label: "SPEED (SOG)", value: "NO DATA"}, viState.settings), "--.- kn");
  assert.equal(formatFcvNavBoxForLcd({label: "Toc do (SOG)", value: "NO DATA"}, viState.settings), "--.- kn");
  assert.equal(formatFcvNavBoxForLcd({label: "POSITION", value: "NO DATA"}, viState.settings), "--°--.---' ---°--.---'");
  assert.equal(formatFcvNavBoxForLcd({label: "Vi tri", value: "NO DATA"}, viState.settings), "--°--.---' ---°--.---'");
  assert.equal(formatFcvNavBoxForLcd({label: "Nhiet do", value: "NO DATA"}, viState.settings), "--.- °C");
  assert.equal(formatFcvNavBoxForLcd({label: "DEPTH", value: "19.7 m (SIM)"}, viState.settings), "19.7 m");
  assert.equal(localizeFcvNavLabel("POSITION", viState.settings), "Vi tri");
  assert.equal(localizeFcvNavLabel("DEPTH", viState.settings), "Do sau");
  assert.equal(localizeFcvNavLabel("SPEED (STW)", viState.settings), "Toc do (STW)");
  assert.equal(localizeFcvNavLabel("SPEED (SOG)", viState.settings), "Toc do (SOG)");
});

test("Depth scale draws 4 minor 4px sub-ticks between each major tick pair with contrast halo", () => {
  const major = projectFcvDepthTicks({startDepthM: 0, rangeM: 20}, {height: 640, top: 62, bottom: 12, units: "Metric"});
  const minor = projectFcvDepthSubTicks(major, 5);
  assert.equal(major.length, 5);
  assert.equal(minor.length, 16, "4 minor sub-ticks across 4 intervals = 16");
  assert.ok(minor.every(t => t.widthPx === 4));

  const painter = app.slice(app.indexOf("function drawChannel("), app.indexOf("function sounderFrame("));
  const compile = new Function(
    "ctx", "displayCanvas", "displayCtx", "session",
    "getFcvDisplayPalette", "getFcvLcdContrastTheme", "formatFcvDepth", "lcdRgb",
    "projectFcvDepthTicks", "rasterizeFcvEcho",
    painter + "\nreturn drawChannel;",
  );
  const rects = [];
  const strokes = [];
  const labels = [];
  const ctx = {
    drawImage() {},
    fillRect(x, y, w, h) { rects.push({x, y, w, h, style: this.fillStyle}); },
    strokeText(text, x, y) { strokes.push({text, x, y}); },
    fillText(text, x, y) { labels.push({text, x, y}); },
  };
  const surface = {
    createImageData(w, h) { return {data: new Uint8ClampedArray(w * h * 4)}; },
    putImageData() {},
  };
  const draw = compile(
    ctx, {}, surface,
    {deviceState: {settings: {units: "Metric", palette: "White"}}},
    getFcvDisplayPalette, getFcvLcdContrastTheme, formatFcvDepth,
    c => "rgb(" + c.join(",") + ")", projectFcvDepthTicks, rasterizeFcvEcho,
  );
  draw({columns: 2, rows: 2, pixels: new Uint8Array(4), frequencyKhz: 200, startDepthM: 0, rangeM: 20}, 0, 0, 480, 640);
  const fourPxSubTicks = rects.filter(r => r.w === 4 && r.h === 1 && r.x === 476);
  assert.equal(fourPxSubTicks.length, 16, "drawChannel must paint 16 minor 4px sub-ticks on a 5-mark scale");
  assert.equal(labels.length, 5);
  assert.equal(strokes.length, 5, "each scale label gets a contrasting halo outline");
});

test("White Line: Edge (Bien) undulating terrain contour and manual Shift readout render in drawSourceGradedOverlays", () => {
  const overlaySlice = app.slice(
    app.indexOf("function drawWhiteLineOverlay("),
    app.indexOf("function drawSupplementaryDisplay("),
  );
  const compileOverlays = new Function(
    "ctx", "session", "cachedSeabedProvenance",
    "depthFractionOnFcvFrame", "projectFcvBottomZone",
    "projectFcvAScope", "projectFcvBottomDiscrimination",
    "convertFcvDepth", "getFcvLcdContrastTheme", "formatFcvFishSize", "lcdRgb",
    overlaySlice + "\nreturn drawSourceGradedOverlays;",
  );

  const rects = [];
  const lineTos = [];
  const texts = [];
  const ctx = {
    save() {},
    restore() {},
    beginPath() {},
    moveTo(x, y) { lineTos.push({x, y}); },
    lineTo(x, y) { lineTos.push({x, y}); },
    stroke() {},
    strokeRect() {},
    setLineDash() {},
    strokeText() {},
    fillRect(x, y, w, h) { rects.push({x, y, w, h, fill: this.fillStyle}); },
    fillText(text, x, y) { texts.push({text, x, y}); },
  };
  const columns = 12;
  const columnBottoms = Array.from({length: columns}, (_, i) => ({
    present: true,
    depthM: 18 + Math.sin(i * 0.7) * 2.4,
  }));
  const session = {
    deviceState: {
      mode: "HF",
      rangeMode: "manual",
      settings: {whiteLine: "Edge", shift: "2", units: "Metric", palette: "White"},
    },
  };
  const drawOverlays = compileOverlays(
    ctx, session, null,
    depthFractionOnFcvFrame, projectFcvBottomZone,
    projectFcvAScope, projectFcvBottomDiscrimination,
    convertFcvDepth, getFcvLcdContrastTheme, formatFcvFishSize,
    c => "rgb(" + c.join(",") + ")",
  );
  drawOverlays(
    {
      columns,
      rows: 40,
      startDepthM: 2,
      rangeM: 20,
      columnBottoms,
      overlays: {whiteLine: false, whiteLineMode: "Edge", bottomZone: "Standard"},
    },
    0, 0, 480, 640, 19.3,
  );

  const whiteSegments = rects.filter(r => r.fill === "#ffffff" && r.h === 2.5);
  assert.equal(whiteSegments.length, columns, "White Line: Edge paints per-column white contour segments");
  const uniqueYs = new Set(whiteSegments.map(r => r.y));
  assert.ok(uniqueYs.size >= 4, "White Line: Edge contour undulates with per-column seabed terrain");
  assert.ok(lineTos.length >= columns * 2, "smooth vector polyline connects terrain columns");
  assert.ok(texts.some(t => t.text === "2.0" && t.y <= 80), "manual Shift=2 renders '2.0' right under header");
});
