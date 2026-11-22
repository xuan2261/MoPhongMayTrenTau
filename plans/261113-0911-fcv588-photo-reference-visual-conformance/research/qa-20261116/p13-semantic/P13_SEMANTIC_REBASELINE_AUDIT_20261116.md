# P13 — Independent semantic rebaseline audit

Date: 2026-11-16  
Reviewer: worker-21  
Scope: read-only review of source-index-dependent FCV-588 Sounder menu assertions and runtime/replay semantics after the proposed P12 13-row reorder. No source, test, browser, runtime, or existing evidence was modified.

## Decision

**Source-valid semantic rebaseline: GO in principle. Canonical apply: NO_GO. Release: NO_GO/HOLD.**

The proposed Sounder order is directly supported by OME-23890-E PDF page 59, printed AP-1, and independently corroborated by the 13 visible rows in the P12 `giaoDien.jpg` lexicon. The five known stage failures are valid old-index dependencies and can be rebaselined without weakening their behavioral assertions. One additional hardcoded White Marker index exists in `test/fcv588-v49-a11y-boundary.test.mjs` and can silently become a false-positive after the reorder.

There is also a runtime compatibility blocker: the reducer stores the active main-menu row as numeric `overlay.itemIndex`, while replay records the physical input sequence. The current profile revision remains `F1-public-reference-21`, and the replay profile hash does not bind the menu atlas/order or reducer implementation. A source-order change can therefore reinterpret an old sequence at the same numeric row. A commit that changes settings is likely caught later by `finalSessionHash`, but a selection-only/navigation replay can retain the same numeric `itemIndex` and final device-state hash while referring to a different semantic menu entry. That is silent semantic reinterpretation and violates the profile-version contract in `src/devices/fcv588/profile-version.mjs` lines 2–4.

P12 remains **499/526 PASS, 27 FAIL**, with no canonical apply authorized.

## Source oracle

Official OME-23890-E page 59 / AP-1 Sounder order:

1. `sounder.pictureAdvance` — Pic. Advance
2. `sounder.zoomMode` — Zoom Mode
3. `sounder.shift` — Shift
4. `sounder.interference` — Interference
5. `sounder.colorErase` — Color Erase
6. `sounder.clutter` — Clutter
7. `sounder.whiteLine` — White Line
8. `sounder.whiteMarker` — White Marker
9. `sounder.tvg` — TVG
10. `sounder.smoothing` — Smoothing
11. `sounder.bottomZone` — Bottom Zone
12. `sounder.txPower` — TX Power
13. `sounder.txRate` — TX Rate

The P12 photo lexicon for `giaoDien.jpg` records the same visible sequence in Vietnamese: `Kéo Hình`, `K. Phóng đại`, `Di chuyển`, `Nhiễu cạn`, `Xóa màu`, `Nhiễu tạp`, `Đường trắng`, `Dấu Trắng`, `TVG`, `Làm nhẵn`, `Khu vực Đáy`, `C.suất Phát`, `Tỉ lệ Phát`. This is a bounded photographic witness only; installed firmware and complete Vietnamese locale conformance remain unknown.

Relevant source evidence:

- `P12_MANUAL_SOUND_ORDER_SUPPLEMENT_20261116.md` SHA-256 `be84cf98525de66f4005550cf7c6bd381bf916b45c32d5e079c62a69c442b812`.
- `P12_2016_PHOTO_LCD_LEXICON_20261116.json` SHA-256 `9c8c7397a42610005a9fed7535a722f951ab708273068301c44f49faf81b2e83`.
- P12 stage `menu-atlas.mjs` SHA-256 `e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca`.

## Required semantic test pattern

The rebaseline should keep an explicit AP-1 order oracle and use semantic IDs to select a row. It must not replace strict assertions with broad `.some()`, truthiness, or `visible === true` checks.

Recommended shared pattern inside the affected test file(s):

```js
const AP1_SOUNDER_IDS = [
  "sounder.pictureAdvance",
  "sounder.zoomMode",
  "sounder.shift",
  "sounder.interference",
  "sounder.colorErase",
  "sounder.clutter",
  "sounder.whiteLine",
  "sounder.whiteMarker",
  "sounder.tvg",
  "sounder.smoothing",
  "sounder.bottomZone",
  "sounder.txPower",
  "sounder.txRate",
];

const sounderIndex = (state, id) => {
  const entries = getFcvMenuItems("Sounder", state);
  assert.deepEqual(entries.map(entry => entry.id), AP1_SOUNDER_IDS);
  const index = entries.findIndex(entry => entry.id === id);
  assert.ok(index >= 0, `missing Sounder entry ${id}`);
  return index;
};
```

This preserves both requirements: exact source order remains strict, while the behavioral assertion targets a semantic entry rather than inheriting its meaning from a numeric cursor.

## Five known source-index-dependent tests

### 1. `test/fcv588-public-lcd-presentation.test.mjs` — large choice window, lines 97–107

Current dependency: two fixed `down` inputs from the first Sounder row select old index 2 (`Clutter`). Under AP-1, index 2 is `Shift`; `Clutter` moves to index 5.

Precise rebaseline:

```js
let s = press(boot(), "menu");
const target = sounderIndex(s.deviceState, "sounder.clutter");
for (let i = 0; i < target; i++) s = pad(s, "down");
assert.equal(getFcvMenuItems("Sounder", s.deviceState)[s.deviceState.overlay.itemIndex].id,
  "sounder.clutter");
s = press(s, "enter");
```

Keep the existing strict assertions unchanged: `editor.total === 101`, bounded seven-value window, exact `["94", ..., "100"]` order, and exactly one selected `"100"` value. This is a semantic selector change only, not a behavioral relaxation.

### 2. `test/fcv588-public-lcd-presentation.test.mjs` — disabled Shift projection, lines 109–128

Current dependency: `itemIndex:12` and `rows[12]` mean `Shift` only in the old atlas. Under AP-1, `Shift` is index 2.

Precise rebaseline:

```js
const shiftIndex = sounderIndex(s.deviceState, "sounder.shift");
assert.equal(shiftIndex, 2, "AP-1 Shift must remain ordinal 3");
const sounder = {...s.deviceState,
  overlay:{kind:"menu",category:"Sounder",itemIndex:shiftIndex,editing:false}};
const shift = projectFcvMainMenu(sounder);
const row = shift.rows.find(r => r.id === "sounder.shift");
assert.ok(row?.selected);
assert.match(row.text,/Shift/);
assert.doesNotMatch(row.text,/\[HOLD\]|\[N\/A\]/);
assert.equal(row.disabled,true);
assert.match(shift.reason,/SHIFT_UNAVAILABLE_IN_AUTO_RANGE/);
```

The existing disabled/reason contract stays exact. `find()` is safe here because the separate AP-1 array assertion fixes the complete ordering and the test additionally requires the semantic row to be the selected row.

### 3. `test/fcv588-v47-white-marker-firmware-boundary.test.mjs` — White Marker D15 cue, lines 40–52

Current dependency is in `trainingState()` lines 21–25: `itemIndex:5` selects White Marker only in the old atlas. Under AP-1, White Marker is index 7.

Replace the fixture's numeric meaning with an ID-derived cursor. Recommended fixture:

```js
const trainingStateAt = id => {
  const base = {...initialFcv588State(), power:"on"};
  const itemIndex = sounderIndex(base, id);
  return {...base, overlay:{kind:"menu",category:"Sounder",categoryIndex:0,
    itemIndex,editing:false,draftValue:null,editEntryId:null}};
};
```

Then use `projectFcvSourceCue(trainingStateAt("sounder.whiteMarker"), 0)` and keep every existing strict assertion on `visible`, exact source status, White Marker title, color-bar detail, `Off`, `White/Gray`, training/simulation wording, firmware wording, and the negative `firmware đã xác nhận` assertion.

The second argument to `projectFcvSourceCue` is `simTick`; numeric values such as `0` or `5` there are **not menu indices** and must not be rebaselined as menu selectors.

### 4. `test/fcv588-v47-white-marker-firmware-boundary.test.mjs` — LCD projector purity, lines 54–66

Use `trainingStateAt("sounder.whiteMarker")`. Keep the semantic `rows.find(x => x.id === "sounder.whiteMarker")` already present and all existing strict assertions: selected row, exact trimmed text `▶ White Marker`, exact sourceStatus, no source-grade leakage into LCD text, and deep state immutability.

No assertion needs weakening; only the fixture's cursor derivation changes.

### 5. `test/fcv588-v47-white-marker-firmware-boundary.test.mjs` — selection-scoped notice, lines 68–77

Current dependencies: marker fixture uses old index 5; `nearby.itemIndex:4` assumes old row 4 is White Line. Under AP-1, index 4 is Color Erase and White Line is index 6.

Use two explicit semantic fixtures:

```js
const markerState = trainingStateAt("sounder.whiteMarker");
const nearby = trainingStateAt("sounder.whiteLine");
const white = projectFcvSourceCue(markerState, 5);
const other = projectFcvSourceCue(nearby, 5);
```

Keep the exact White Marker status assertion, `other.status !== white.status`, and negative `White.*Gray` leakage assertion. Optionally strengthen the nearby precondition with:

```js
assert.equal(getFcvMenuItems("Sounder", nearby)[nearby.overlay.itemIndex].id,
  "sounder.whiteLine");
```

Again, the `5` passed to `projectFcvSourceCue` is simulation time, not a row index.

## Additional hardcoded index found

`test/fcv588-v49-a11y-boundary.test.mjs` lines 49–59 has `itemIndex:5` while describing a White Marker boundary. After AP-1 reorder, index 5 is `sounder.clutter`. The test separately finds the White Marker metadata by ID but calls `projectFcvSourceCue(s,0)` with the numeric-index state and only asserts `visible === true`. That can pass for a different visible cue and therefore become a false-positive.

Required rebaseline:

- derive `itemIndex` from `getFcvMenuItems("Sounder", s).findIndex(x => x.id === "sounder.whiteMarker")`;
- assert AP-1 ordinal 8 (`index === 7`) or bind to the shared full-order oracle;
- strengthen the cue check to exact semantic status `TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN` and a White Marker title, while retaining the existing metadata/profile assertions.

This is a correctness strengthening, not a weakening.

## Hardcoded positions reviewed but not invalidated by this reorder

- `test/fcv588-v41-oem-sounder-labels.test.mjs` uses `itemIndex:0` and `rows[0]` for Pic. Advance. AP-1 and the P12 photo both keep Pic. Advance at ordinal 1, so this positional assertion remains source-valid. It may be left positional because it verifies the first-row contract.
- `test/fcv588-photo-menu-layout.test.mjs` and `test/fcv588-photo-menu-actions.test.mjs` use `rows[0]` for Pic. Advance. The same source-valid first-row reasoning applies.
- Numeric indices for Display/System/Data/configuration overlays found by the scan are outside the changed Sounder ordering and are not P13 regressions.
- `FCV_FUNC_TARGETS` has its own function-key ordering and is not reordered by the P12 `group.Sounder` change; FUNC index tests must not be mechanically rebaselined to AP-1 Sounder ordinals.
- `web/lcd-presentation.mjs` and `web/lcd-instructor-meta.mjs` consume `overlay.itemIndex` generically. They contain no hardcoded Sounder row literal, but their semantics follow the reducer cursor and are therefore covered by the replay blocker below.

## Reducer/session/replay blocker

### Runtime facts

`src/devices/fcv588/model.mjs`:

- `menuOverlay()` stores `categoryIndex` plus numeric `itemIndex`.
- `moveMenu()` resolves the active entry with `entries[o.itemIndex]` and moves selection by incrementing/wrapping `itemIndex`.
- an edit does store semantic `editEntryId`, which protects an active draft from dynamic row changes, but a non-editing menu cursor has no semantic entry ID.
- `reconcileCapabilityMenu()` can map a selected ID from a previous in-memory state to a new dynamic list, but it does not bind a historical replay to the old static atlas order across software revisions.

`src/core/session.mjs`:

- replay records physical events (`press`, `pad`, etc.), not selected menu IDs;
- `adapterProfileHash()` binds adapter id/revision/profile/controls/gestures/hold thresholds, but not the menu atlas order and not the reducer implementation;
- replay checks `finalSessionHash` after applying all events.

`src/devices/fcv588/profile-version.mjs` explicitly states that a behavior change advances the profile revision so historical replay/settings cannot be silently reinterpreted. Both canonical and the P12 stage still declare `F1-public-reference-21`.

### Why this blocks apply

With the proposed order, the same event sequence `MENU`, `DOWN`, `DOWN` still leaves numeric `itemIndex === 2`, but the semantic entry changes from old `sounder.clutter` to AP-1 `sounder.shift`. If the replay stops at navigation, the stored device state can be numerically identical even though the projected meaning changed; `finalSessionHash` therefore need not detect the reinterpretation. If the replay enters/commits an affected choice, the resulting settings/state can differ and the final-hash guard should reject it, but that late rejection does not cover selection-only histories.

Therefore **same-revision canonical apply is blocked**.

Before apply, the implementation must establish a versioned replay contract. The source-aligned options are:

1. advance the PUBLIC_REFERENCE profile revision for the menu-order behavior change (the existing contract strongly indicates this is required), and add a compatibility regression proving archived profile-21 replays are rejected before reinterpretation; or
2. introduce an equally strong semantic binding of menu identity/order into the replay/profile contract, with explicit compatibility behavior and tests.

For the current design, a profile revision advance is the smaller and clearer contract. Any settings migration decision must remain explicit and separate from replay migration; existing compatibility tests already establish that old replay must be rejected rather than silently migrated.

Minimum regression coverage before canonical apply:

- exact AP-1 13-ID order assertion;
- all five known tests re-target rows by semantic ID while retaining their existing strict value/status/reason/purity assertions;
- V49 White Marker cue test corrected and strengthened;
- a replay fixture captured under profile 21 that navigates to an affected Sounder ordinal must be rejected by the new profile before reducer reinterpretation;
- a fresh replay under the new profile must remain deterministic and hash-equal;
- a selection-only replay case must be included, because final state can otherwise preserve the same numeric `itemIndex` while the semantic entry changes;
- existing setting migration rules must not become implicit replay migration.

## Evidence hashes reviewed

- `test/fcv588-public-lcd-presentation.test.mjs` — `53cf6b172020ca63170e03f94389d421c7155e1106c4ed6f2b00d5700e2e29be`
- `test/fcv588-v47-white-marker-firmware-boundary.test.mjs` — `993afb020bd01f05f8cf6f2fb9803d484cab6f1861f5f8e440c3505cd3755773`
- `test/fcv588-v49-a11y-boundary.test.mjs` — `f5f068450d1a3826fd01f4a28873dcfe17329a7a18d5f2d6a45dadf3ddea41b2`
- `src/devices/fcv588/model.mjs` — `45ed40e44e0af6434ae3f17249d5f9c52081be77bd7302738b7ac39b37a8db11`
- `src/core/session.mjs` — `39783a274572af83ee382ad2d0caea94ecd968cf98377c3b9300f179fabdaa44`
- `src/devices/fcv588/profile-version.mjs` — `8134470b379315ebc369a7b5922dacbdfcf47d3472d084832da5fff031e03070`
- `web/lcd-presentation.mjs` — `aaff1c8b7970e06c23f41e58e2a384b68a07c8f8ccc3ca9eb7975f2d186f66ef`
- `web/lcd-instructor-meta.mjs` — `d6edb36224ec4f3fdf65b5f9d7421330c10b999b03cb662cc4f20538408c4fcd`

## Bounded verdict

The P12 order change itself is source-valid. The five visible failures should be rebaselined with semantic ID selectors plus an exact AP-1 order oracle. V49 contains an additional hidden numeric White Marker dependency and must be corrected. The numeric menu cursor/replay contract is a **BLOCKER** for a same-revision apply because a selection-only historical replay can change semantic meaning without necessarily changing its final numeric device state. No P12 canonical apply or release is justified from the current 499/526 stage.
