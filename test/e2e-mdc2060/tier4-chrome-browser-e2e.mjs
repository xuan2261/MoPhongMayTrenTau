import assert from "node:assert/strict";
import {withCdpFilePage, withCdpHttpPage} from "./helpers/cdp-browser.mjs";
import {withLoopbackServer} from "./helpers/loopback-server.mjs";

export const TIER = 4;
export const SUITE = "tier4-chrome-browser-e2e";

/**
 * Shared semantic DOM expression helpers run inside Chrome (zero brittle DOM IDs).
 */
const CLICK_CONTROL_EXPR = `((matcherSource) => {
  const re = new RegExp(matcherSource, "i");
  const aside = document.querySelector("aside");
  const candidates = Array.from(document.querySelectorAll("button, [role='button']"))
    .filter(el => (!aside || !aside.contains(el)) && !el.closest("[role='toolbar']") && !el.closest("[hidden]"));
  const hit = candidates.find(el =>
    re.test(el.dataset.control ?? "") ||
    re.test(el.getAttribute("aria-label") ?? "") ||
    re.test(el.textContent ?? "")
  );
  if (!hit) return false;
  hit.click();
  return true;
})`;

const CLICK_ASIDE_BUTTON_EXPR = `((matcherSource) => {
  const re = new RegExp(matcherSource, "i");
  const aside = document.querySelector("aside");
  if (!aside) return false;
  const tabs = Array.from(aside.querySelectorAll("[role='tab']"));
  // Search current visible panel first, then walk tabs if needed
  const findBtn = () => Array.from(aside.querySelectorAll("button")).find(b =>
    b.getAttribute("role") !== "tab" &&
    !b.closest("[hidden]") &&
    (re.test(b.getAttribute("aria-label") ?? "") || re.test(b.textContent ?? ""))
  );
  let btn = findBtn();
  if (!btn) {
    for (const tab of tabs) {
      tab.click();
      btn = findBtn();
      if (btn) break;
    }
  }
  if (!btn) return false;
  btn.click();
  return true;
})`;

const RANGE_DOWN_MATCHER = "^range_down$|range[^a-z0-9]*(?:-|−|down|dec|giảm)|(?:down|dec|giảm)[^a-z0-9]*range";
const STEP_1S_MATCHER = "\\+1\\s*s|\\+1\\s*giây|step\\s*1";
const POWER_MATCHER = "^power$|POWER.*BRILL|\\bPOWER\\b";
const MENU_MATCHER = "^menu$|\\bMENU\\b";

const POWER_BEZEL_LOCATOR_EXPR = `(() => {
  const aside = document.querySelector("aside");
  return Array.from(document.querySelectorAll("button, [role='button']"))
    .filter(el => (!aside || !aside.contains(el)) && !el.closest("[role='toolbar']") && !el.closest("[hidden]"))
    .find(el => /^power$|POWER.*BRILL|\\bPOWER\\b/i.test(
      (el.dataset.control ?? "") + " " + (el.getAttribute("aria-label") ?? "") + " " + (el.textContent ?? "")
    )) ?? null;
})()`;

const REPLAY_FAIL_RE = /\b(?:fail|failed|error|invalid|mismatch|rejected)\b|lỗi|không khớp|từ chối/i;
const REPLAY_PASS_RE = /replay.{0,60}(?:pass|khớp|trùng khớp|hợp lệ|verified|\bok\b)|(?:pass|khớp|trùng khớp|hợp lệ|verified).{0,60}replay|\bPASS\b|\bVERIFIED\b/i;

const SETTINGS_IMPORT_REJECT_RE = /lỗi|từ chối|thất bại|không thể|chưa thể|không hợp lệ|chưa hợp lệ|không thành công|rejected|error|invalid|fail|cannot|unable/i;
const SETTINGS_IMPORT_CONFIRM_RE = /khôi phục|đã nạp|nạp cấu hình|cấu hình.*hợp lệ|restored|imported|loaded|applied/i;

async function readVisibleReplayStatus(page) {
  const readVisibleStatusNodes = `(() => {
    const isVisible = el => Boolean(
      el &&
      !el.closest("[hidden]") &&
      getComputedStyle(el).display !== "none" &&
      getComputedStyle(el).visibility !== "hidden"
    );
    const statusSelectors = [
      ".d15-live-rail",
      "aside [role='status']",
      "aside [aria-live]",
      "aside output",
      "aside [data-replay-status]",
      "aside .validation-status",
      "aside .replay-status",
      "aside [id*='replay'][id*='status']",
      "aside [id*='validation']",
    ].join(", ");
    const statusTexts = Array.from(document.querySelectorAll(statusSelectors))
      .filter(isVisible)
      .map(el => (el.textContent ?? "").trim())
      .filter(Boolean);
    if (statusTexts.length > 0) return {source: "status-live", text: statusTexts.join(" | ")};
    // Narrow fallback: visible non-label status text in active tabpanel ONLY (never hidden panels, never <label> sliders)
    const activePanel = document.querySelector("aside [role='tabpanel']:not([hidden])");
    if (!activePanel || !isVisible(activePanel)) return {source: "none", text: ""};
    const clone = activePanel.cloneNode(true);
    for (const drop of clone.querySelectorAll("label, input, select, option, textarea, button, h1, h2, h3, h4")) {
      drop.remove();
    }
    return {source: "active-panel-non-label", text: (clone.textContent ?? "").replace(/\\s+/g, " ").trim()};
  })()`;

  let snap = await page.evaluate(readVisibleStatusNodes);
  if (!REPLAY_PASS_RE.test(snap.text) && !REPLAY_FAIL_RE.test(snap.text)) {
    // Handle FCV-588-style layout where Tab 1's Replay button writes to Tab 5's visible #validation-status
    const switchedTab5 = await page.evaluate(`(() => {
      const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
      const tab5 = tabs[tabs.length - 1];
      if (!tab5 || tab5.getAttribute("aria-selected") === "true") return false;
      tab5.click();
      return true;
    })()`);
    if (switchedTab5) {
      await page.delay(80);
      const tab5Snap = await page.evaluate(readVisibleStatusNodes);
      if (tab5Snap.text) snap = tab5Snap;
    }
  }
  return snap;
}

async function assertVisibleReplayPassed(page, label) {
  const snap = await readVisibleReplayStatus(page);
  assert.ok(snap.text.length > 0, `${label}: visible D15 replay status region must be non-empty`);
  assert.doesNotMatch(snap.text, REPLAY_FAIL_RE, `${label}: D15 replay status reported failure: ${snap.text}`);
  assert.match(snap.text, REPLAY_PASS_RE, `${label}: D15 replay status must contain explicit replay pass token (got: ${snap.text})`);
  return snap;
}

async function readVisibleTabPanelStatus(page) {
  return page.evaluate(`(() => {
    const isVisible = el => Boolean(
      el &&
      !el.closest("[hidden]") &&
      getComputedStyle(el).display !== "none" &&
      getComputedStyle(el).visibility !== "hidden"
    );
    const activePanel = document.querySelector("aside [role='tabpanel']:not([hidden])");
    if (!activePanel || !isVisible(activePanel)) return {source: "none", text: ""};
    const statusSelectors = [
      "[role='status']",
      "[role='alert']",
      "[aria-live]",
      "output",
      "[data-settings-status]",
      "[data-replay-status]",
      "[data-status]",
      ".settings-status",
      ".validation-status",
      ".replay-status",
      "[id*='status']",
      "[id*='validation']",
    ].join(", ");
    const statusNodes = Array.from(activePanel.querySelectorAll(statusSelectors))
      .filter(el =>
        isVisible(el) &&
        !el.closest(".d15-live-rail") &&
        !el.querySelector("button, input, textarea, select")
      );
    if (statusNodes.length > 0) {
      const statusTexts = statusNodes
        .map(el => (el.textContent ?? "").replace(/\\s+/g, " ").trim())
        .filter(Boolean);
      return {source: "tabpanel-status-live", text: statusTexts.join(" | ")};
    }
    const clone = activePanel.cloneNode(true);
    for (const drop of clone.querySelectorAll("[hidden], [aria-hidden='true'], .d15-live-rail, label, input, select, option, textarea, button, h1, h2, h3, h4")) {
      drop.remove();
    }
    return {source: "tabpanel-non-label", text: (clone.textContent ?? "").replace(/\\s+/g, " ").trim()};
  })()`);
}

async function readVisibleUiSnapshot(page) {
  return page.evaluate(`(() => {
    const isVisible = el => Boolean(
      el &&
      !el.closest("[hidden]") &&
      getComputedStyle(el).display !== "none" &&
      getComputedStyle(el).visibility !== "hidden"
    );
    const liveNodes = Array.from(document.querySelectorAll(
      "[role='status'], [aria-live], .d15-live-rail, .instructor-telemetry, .sensor-status, [data-warning], .device-frame [data-status]"
    )).filter(isVisible);
    const text = liveNodes.map(el => (el.textContent ?? "").replace(/\\s+/g, " ").trim()).filter(Boolean).join(" | ");
    const menuVisible = Boolean(
      Array.from(document.querySelectorAll("[data-menu-open='true'], .lcd-menu, .menu-overlay, [role='menu']"))
        .find(isVisible) ||
      /\\bMENU\\b|MAIN\\s*MENU|SYSTEM\\s*MENU/i.test(text)
    );
    const evMatch = text.match(/(?:sự\\s*kiện|events?|seq)\\s*[:#]?\\s*(\\d+)/i);
    const eventCount = evMatch ? Number(evMatch[1]) : null;
    const rngMatch = text.match(/(?:range|thang\\s*đo)\\s*[:=]?\\s*([0-9]+(?:\\.[0-9]+)?\\s*(?:NM|km|sm)?)/i);
    const rangeText = rngMatch ? rngMatch[1].trim() : "";
    return {text, menuVisible, eventCount, rangeText};
  })()`);
}

async function bootMdcInBrowserToTx(page) {
  const offStats = await page.inspectCanvas('canvas[width="480"][height="640"], canvas');
  assert.ok(offStats, "480x640 PPI canvas must exist in DOM");

  // Click POWER/BRILL bezel button
  const clickedPower = await page.evaluate(`${CLICK_CONTROL_EXPR}(${JSON.stringify(POWER_MATCHER)})`);
  assert.equal(clickedPower, true, "Must find and click POWER/BRILL button inside bezel");
  await page.delay(150);

  // Skip preheat cleanly via D15 Skip Preheat button or stepping +1s ticks
  const skipped = await page.evaluate(`${CLICK_ASIDE_BUTTON_EXPR}(${JSON.stringify("bỏ qua sấy|skip\\s*preheat")})`);
  if (!skipped) {
    let stepped = 0;
    for (let i = 0; i < 6; i++) {
      const ok = await page.evaluate(`${CLICK_ASIDE_BUTTON_EXPR}(${JSON.stringify(STEP_1S_MATCHER)})`);
      if (ok) stepped++;
      await page.delay(60);
    }
    assert.ok(stepped >= 5, `Must skip preheat or step +1s at least 5 times (stepped=${stepped})`);
  }
  await page.delay(180);

  // Click STBY/TX bezel button to begin transmitting
  const clickedTx = await page.evaluate(`${CLICK_CONTROL_EXPR}(${JSON.stringify("^stby_tx$|STBY.*TX")})`);
  assert.equal(clickedTx, true, "Must find and click STBY/TX button inside bezel");
  await page.delay(350);

  // Advance 2 ticks to guarantee sweep/trails/contacts render deterministically
  await page.evaluate(`${CLICK_ASIDE_BUTTON_EXPR}(${JSON.stringify(STEP_1S_MATCHER)})`);
  await page.delay(120);
  await page.evaluate(`${CLICK_ASIDE_BUTTON_EXPR}(${JSON.stringify(STEP_1S_MATCHER)})`);
  await page.delay(250);

  const txStats = await page.inspectCanvas('canvas[width="480"][height="640"], canvas');
  assert.ok(txStats, "Canvas must remain readable in TX");
  assert.ok(txStats.renderedWidth >= 200 && txStats.renderedHeight >= 260, `Canvas rendered size too small: ${txStats.renderedWidth}x${txStats.renderedHeight}`);
  assert.ok(txStats.uniqueColors >= 6, `TX PPI canvas must render multi-color echoes & vectors (uniqueColors=${txStats.uniqueColors} < 6)`);
  assert.ok(txStats.ppiCircleNonBg >= 400, `TX PPI canvas must draw real echoes/rings inside PPI circle (ppiCircleNonBg=${txStats.ppiCircleNonBg} < 400)`);
  assert.notEqual(txStats.frameHash, offStats.frameHash, "TX canvas frameHash must differ from powered-off state");

  const offVeil = await page.evaluate(`(() => {
    const veil = document.querySelector(".off-screen, [data-off-screen], [id*='off-screen']");
    if (!veil) return {exists: false, hidden: false};
    const cs = getComputedStyle(veil);
    const hidden = Boolean(
      veil.hidden ||
      veil.getAttribute("aria-hidden") === "true" ||
      cs.display === "none" ||
      cs.visibility === "hidden" ||
      Number(cs.opacity) === 0
    );
    return {exists: true, hidden};
  })()`);
  if (offVeil.exists) {
    assert.equal(offVeil.hidden, true, "Power-off veil (.off-screen / [data-off-screen]) must be hidden once transmitting");
  } else {
    assert.ok(
      txStats.uniqueColors >= 6 && txStats.ppiCircleNonBg >= 400 && txStats.nonBlack > offStats.nonBlack,
      `Without a power-off veil element, TX canvas must strictly exceed powered-off nonBlack pixels (${txStats.nonBlack} vs ${offStats.nonBlack})`,
    );
  }
  return {offStats, txStats};
}

async function ensurePoweredOnToTx(page) {
  const status = await page.evaluate(`(() => {
    const veil = document.querySelector(".off-screen, [data-off-screen], [id*='off-screen']");
    const veilVisible = Boolean(
      veil &&
      !veil.hidden &&
      veil.getAttribute("aria-hidden") !== "true" &&
      getComputedStyle(veil).display !== "none" &&
      getComputedStyle(veil).visibility !== "hidden" &&
      Number(getComputedStyle(veil).opacity) !== 0
    );
    return {veilVisible};
  })()`);
  const canvasStats = await page.inspectCanvas('canvas[width="480"][height="640"], canvas');
  const looksOff = status.veilVisible || !canvasStats || (canvasStats.ppiCircleNonBg < 50 && canvasStats.uniqueColors <= 3);
  if (looksOff) {
    await bootMdcInBrowserToTx(page);
  }
}

async function adjustRotaryControlInBrowser(page, controlName) {
  // 1. Try physical bezel rotary knob via real CDP keyboard ArrowUp + wheel event
  const knobFound = await page.evaluate(`((ctrl) => {
    const aside = document.querySelector("aside");
    const nameRe = new RegExp("\\\\b" + ctrl + "\\\\b", "i");
    const minusRe = /(?:^|[^a-z])(?:-|−|minus|dec|down|giảm)(?:$|[^a-z])/i;
    const candidates = Array.from(document.querySelectorAll("button, [role='slider'], [role='spinbutton'], [data-control]"))
      .filter(el => (!aside || !aside.contains(el)) && !el.closest("[role='toolbar']") && !el.closest("[hidden]"));
    const knob = candidates.find(el => {
      const label = (el.dataset.control ?? "") + " " + (el.id ?? "") + " " + (el.getAttribute("aria-label") ?? "") + " " + (el.textContent ?? "");
      if (el.dataset.control && el.dataset.control.toLowerCase() === ctrl.toLowerCase()) return true;
      return nameRe.test(label) && !minusRe.test(label);
    });
    if (!knob) return false;
    knob.scrollIntoView({block: "center", inline: "center", behavior: "instant"});
    if (typeof knob.focus === "function") knob.focus();
    knob.dispatchEvent(new WheelEvent("wheel", {deltaY: -120, bubbles: true, cancelable: true}));
    return true;
  })(${JSON.stringify(controlName)})`);

  if (knobFound) {
    for (let i = 0; i < 3; i++) {
      await page.dispatchKey("rawKeyDown", {key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38});
      await page.dispatchKey("keyUp", {key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38});
    }
    await page.delay(60);
  }

  // 2. Also step D15 Tab 1 rotary assist "+" button or range input if present
  const assistUsed = await page.evaluate(`((ctrl) => {
    const aside = document.querySelector("aside");
    if (!aside) return false;
    const tabs = Array.from(aside.querySelectorAll("[role='tab']"));
    if (tabs[0]) tabs[0].click();
    const ctrlRe = new RegExp("\\\\b" + ctrl + "\\\\b", "i");
    const plusRe = /\\+|plus|tăng|\\bup\\b|inc/i;

    const directBtn = Array.from(aside.querySelectorAll("button"))
      .filter(b => b.getAttribute("role") !== "tab" && !b.closest("[hidden]"))
      .find(b => {
        const meta = (b.dataset.control ?? "") + " " + (b.id ?? "") + " " + (b.getAttribute("aria-label") ?? "") + " " + (b.textContent ?? "");
        return ctrlRe.test(meta) && plusRe.test(meta);
      });
    if (directBtn) {
      directBtn.click();
      directBtn.click();
      return true;
    }

    // Look inside a labeled container/row for GAIN or STC
    const rows = Array.from(aside.querySelectorAll(".rotary-assist-row, .control-row, .field, label, div, section"))
      .filter(el => !el.closest("[hidden]") && ctrlRe.test(el.textContent ?? ""));
    for (const row of rows) {
      const plusBtn = Array.from(row.querySelectorAll("button")).find(b =>
        b.getAttribute("role") !== "tab" && plusRe.test((b.getAttribute("aria-label") ?? "") + " " + (b.textContent ?? ""))
      );
      if (plusBtn) {
        plusBtn.click();
        plusBtn.click();
        return true;
      }
      const slider = row.querySelector("input[type='range']");
      if (slider) {
        const cur = Number(slider.value || 0);
        const step = Number(slider.step || 1);
        const max = Number(slider.max || 100);
        slider.value = String(Math.min(max, cur + step * 4));
        slider.dispatchEvent(new Event("input", {bubbles: true}));
        slider.dispatchEvent(new Event("change", {bubbles: true}));
        return true;
      }
    }
    return false;
  })(${JSON.stringify(controlName)})`);

  await page.delay(80);
  return {interacted: Boolean(knobFound || assistUsed), knobFound, assistUsed};
}

export const TESTS = [
  {
    id: "T4-013",
    name: "Live Localhost /mdc2060 Full Operator Workflow in Headless Chrome CDP",
    features: [2, 6, 9, 19, 20, 23, 24, 28, 29, 32, 34],
    timeoutMs: 45000,
    async run() {
      await withLoopbackServer(async server => {
        await withCdpHttpPage(server.url("/mdc2060"), async page => {
          // Verify mandatory banner, canvas, 10 physical control groups, and bezel vs aside separation
          const structure = await page.evaluate(`(() => {
            const note = Array.from(document.querySelectorAll("[role='note']")).map(n => n.textContent ?? "").join(" ");
            const canvas = document.querySelector('canvas[width="480"][height="640"]');
            const aside = document.querySelector("aside");
            const bezelControls = Array.from(document.querySelectorAll("button, [role='button'], [data-control]"))
              .filter(el => (!aside || !aside.contains(el)) && !el.closest("[role='toolbar']"))
              .map(el => (el.dataset.control ?? "") + " " + (el.getAttribute("aria-label") ?? "") + " " + (el.textContent ?? ""));
            const bezelTabs = Array.from(document.querySelectorAll("[role='tablist'], [role='tab'], [role='tabpanel']"))
              .filter(el => !aside || !aside.contains(el)).length;
            const asideTabs = aside ? aside.querySelectorAll("[role='tab']").length : 0;
            const asidePanels = aside ? aside.querySelectorAll("[role='tabpanel']").length : 0;
            return {note, hasCanvas: Boolean(canvas), bezelControls, bezelTabs, asideTabs, asidePanels};
          })()`);

          assert.ok(structure.note.includes("PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY"));
          assert.equal(structure.hasCanvas, true, "Must render 480x640 canvas");
          assert.equal(structure.bezelTabs, 0, "Bezel must contain 0 ARIA tabs");
          assert.equal(structure.asideTabs, 5, "Instructor aside must contain 5 ARIA tabs");
          assert.equal(structure.asidePanels, 5, "Instructor aside must contain 5 ARIA tabpanels");
          const joinedBezel = structure.bezelControls.join("\n");
          for (const re of [/\bf1\b/i, /\bf2\b/i, /\bmenu\b/i, /\bent\b/i, /cursorpad|▲|▼|◀|▶/i, /range/i, /\bgain\b/i, /\bstc\b/i, /stby.*tx|stby_tx/i, /power/i]) {
            assert.match(joinedBezel, re, `Bezel missing physical control matching ${re}`);
          }

          await bootMdcInBrowserToTx(page);

          // Capture non-clock UI snapshot and freeze sweep if Pause button is available
          const beforeUi = await readVisibleUiSnapshot(page);
          const paused = await page.evaluate(`${CLICK_ASIDE_BUTTON_EXPR}("tạm dừng|pause")`);
          await page.delay(120);
          const frozenA = await page.inspectCanvas('canvas[width="480"][height="640"], canvas');
          await page.delay(180);
          const frozenB = await page.inspectCanvas('canvas[width="480"][height="640"], canvas');
          const sweepFrozen = Boolean(paused && frozenA && frozenB && frozenA.frameHash === frozenB.frameHash);

          // Operate RANGE down, open MENU, close MENU — strictly checking every click return value
          const clickedRangeDown = await page.evaluate(`${CLICK_CONTROL_EXPR}(${JSON.stringify(RANGE_DOWN_MATCHER)})`);
          assert.equal(clickedRangeDown, true, "Must locate and click bezel RANGE DOWN control");
          await page.delay(150);

          const clickedMenuOpen = await page.evaluate(`${CLICK_CONTROL_EXPR}(${JSON.stringify(MENU_MATCHER)})`);
          assert.equal(clickedMenuOpen, true, "Must locate and click bezel MENU control to open Main Menu");
          await page.delay(150);
          const menuStats = await page.inspectCanvas('canvas[width="480"][height="640"], canvas');
          const duringMenuUi = await readVisibleUiSnapshot(page);

          const clickedMenuClose = await page.evaluate(`${CLICK_CONTROL_EXPR}(${JSON.stringify(MENU_MATCHER)})`);
          assert.equal(clickedMenuClose, true, "Must locate and click bezel MENU control to close Main Menu");
          await page.delay(150);
          const afterCloseStats = await page.inspectCanvas('canvas[width="480"][height="640"], canvas');
          const afterUi = await readVisibleUiSnapshot(page);

          if (paused) {
            await page.evaluate(`${CLICK_ASIDE_BUTTON_EXPR}("tiếp tục|resume|tạm dừng|pause")`);
            await page.delay(80);
          }

          // Prove genuine non-drift UI/LCD reaction (never rely on unpaused 60 FPS sweep frameHash drift!)
          const canvasProvedMenu = Boolean(
            sweepFrozen &&
            menuStats &&
            afterCloseStats &&
            menuStats.frameHash !== frozenB.frameHash &&
            afterCloseStats.frameHash !== menuStats.frameHash,
          );
          const uiProvedAction = Boolean(
            (duringMenuUi.menuVisible && !beforeUi.menuVisible) ||
            (afterUi.eventCount !== null && beforeUi.eventCount !== null && afterUi.eventCount >= beforeUi.eventCount + 3) ||
            (afterUi.rangeText !== beforeUi.rangeText && afterUi.rangeText.length > 0),
          );
          assert.ok(
            canvasProvedMenu || uiProvedAction,
            `Range/Menu interaction must produce non-drift proof on paused LCD or visible telemetry (sweepFrozen=${sweepFrozen}, beforeUi=${JSON.stringify(beforeUi)}, duringMenuUi=${JSON.stringify(duringMenuUi)}, afterUi=${JSON.stringify(afterUi)})`,
          );

          const clickedReplay = await page.evaluate(`${CLICK_ASIDE_BUTTON_EXPR}("replay|kiểm tra.*replay|xác minh")`);
          assert.equal(clickedReplay, true, "Must locate and click D15 Replay verify button");
          await page.delay(200);
          await assertVisibleReplayPassed(page, "T4-013 /mdc2060");
          page.assertNoErrors("T4-013 /mdc2060");
        });
      });
    },
  },
  {
    id: "T4-014",
    name: "Standalone file:// dist/MDC-2060-Standalone.html Full Operator Workflow in Headless Chrome CDP",
    features: [2, 16, 17, 28, 29, 34],
    timeoutMs: 45000,
    async run() {
      await withCdpFilePage("dist/MDC-2060-Standalone.html", async page => {
        await bootMdcInBrowserToTx(page);

        // Unconditionally switch scenario to mdc2060-storm-clutter
        const switchedStorm = await page.evaluate(`(() => {
          const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
          if (tabs[0]) tabs[0].click();
          const select = document.querySelector("aside select");
          if (!select) return {ok: false, reason: "no-select"};
          const stormOpt = Array.from(select.options).find(o => /storm/i.test(o.value) || /bão|mưa/i.test(o.textContent ?? ""));
          if (!stormOpt) return {ok: false, reason: "no-storm-option"};
          select.value = stormOpt.value;
          select.dispatchEvent(new Event("change", {bubbles: true}));
          return {ok: select.value === stormOpt.value, value: select.value};
        })()`);
        assert.equal(switchedStorm.ok, true, `Must switch to mdc2060-storm-clutter in standalone HTML (${JSON.stringify(switchedStorm)})`);
        await page.delay(200);
        await ensurePoweredOnToTx(page);

        // Exercise GAIN & STC rotary controls against storm clutter
        const gainRes = await adjustRotaryControlInBrowser(page, "gain");
        assert.equal(gainRes.interacted, true, `Must locate and adjust GAIN control in standalone HTML (${JSON.stringify(gainRes)})`);
        const stcRes = await adjustRotaryControlInBrowser(page, "stc");
        assert.equal(stcRes.interacted, true, `Must locate and adjust STC control in standalone HTML (${JSON.stringify(stcRes)})`);
        await page.delay(150);

        const clickedReplay = await page.evaluate(`${CLICK_ASIDE_BUTTON_EXPR}("replay|kiểm tra.*replay|xác minh")`);
        assert.equal(clickedReplay, true, "Must find and trigger Replay check in offline standalone HTML");
        await page.delay(200);
        await assertVisibleReplayPassed(page, "T4-014 file:// standalone");
        page.assertNoErrors("T4-014 file:// dist/MDC-2060-Standalone.html");
      });
    },
  },
  {
    id: "T4-015",
    name: "Live /mdc2060 D15 5-Tab ARIA Keyboard Navigation, VI/EN Toggle & Focus Mode",
    features: [28, 32],
    timeoutMs: 45000,
    async run() {
      await withLoopbackServer(async server => {
        await withCdpHttpPage(server.url("/mdc2060"), async page => {
          // Verify clicking all 5 tabs + keyboard ArrowRight/End/Home
          const tabResult = await page.evaluate(`(() => {
            const aside = document.querySelector("aside");
            const tabs = Array.from(aside.querySelectorAll("[role='tab']"));
            const panels = Array.from(aside.querySelectorAll("[role='tabpanel']"));
            const clickStates = [];
            for (const tab of tabs) {
              tab.click();
              const visiblePanels = panels.filter(p => !p.hidden).length;
              clickStates.push({selected: tab.getAttribute("aria-selected"), visiblePanels});
            }
            tabs[0].click();
            tabs[0].focus();
            tabs[0].dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight", bubbles: true}));
            const afterRight = tabs.findIndex(t => t.getAttribute("aria-selected") === "true");
            tabs[afterRight].dispatchEvent(new KeyboardEvent("keydown", {key: "End", bubbles: true}));
            const afterEnd = tabs.findIndex(t => t.getAttribute("aria-selected") === "true");
            tabs[afterEnd].dispatchEvent(new KeyboardEvent("keydown", {key: "Home", bubbles: true}));
            const afterHome = tabs.findIndex(t => t.getAttribute("aria-selected") === "true");
            return {count: tabs.length, clickStates, afterRight, afterEnd, afterHome};
          })()`);
          assert.equal(tabResult.count, 5);
          for (const st of tabResult.clickStates) {
            assert.equal(st.selected, "true");
            assert.equal(st.visiblePanels, 1);
          }
          assert.equal(tabResult.afterRight, 1);
          assert.equal(tabResult.afterEnd, 4);
          assert.equal(tabResult.afterHome, 0);

          // Boot to TX so VI/EN toolbar toggle is active across both powered-on LCD and toolbar
          await bootMdcInBrowserToTx(page);

          const READ_LANG_TOGGLE_EXPR = `(() => {
            const scopes = Array.from(document.querySelectorAll("[role='toolbar'], .workspace-toolbar, header, main"));
            const seen = new Set();
            const candidates = [];
            for (const sc of scopes) {
              for (const el of sc.querySelectorAll("button, select, input[type='checkbox']")) {
                if (seen.has(el) || el.closest(".controls") || el.closest("[hidden]")) continue;
                seen.add(el);
                const meta = (el.id ?? "") + " " + (el.name ?? "") + " " + (el.getAttribute("aria-label") ?? "") + " " + (el.textContent ?? "") + " " + (el.closest("label")?.textContent ?? "");
                if (/audio|loa|âm thanh|fullscreen|toàn màn hình|focus|tập trung/i.test(meta)) continue;
                if (/\\bVI\\s*\\/\\s*EN\\b|\\bEN\\s*\\/\\s*VI\\b|ngôn\\s*ngữ|\\blang|\\bLCD\\s*:\\s*(?:EN|VI)\\b/i.test(meta)) {
                  candidates.push(el);
                }
              }
            }
            const el = candidates[0] ?? null;
            if (!el) return {found: false};
            const toolbar = el.closest("[role='toolbar'], .workspace-toolbar, header") ?? el.parentElement;
            return {
              found: true,
              tag: el.tagName.toLowerCase(),
              btnText: (el.textContent ?? "").replace(/\\s+/g, " ").trim(),
              value: "value" in el ? String(el.value) : "",
              checked: "checked" in el ? Boolean(el.checked) : null,
              ariaPressed: el.getAttribute("aria-pressed"),
              ariaLabel: el.getAttribute("aria-label") ?? "",
              langAttr: document.documentElement.getAttribute("lang") ?? "",
              toolbarText: toolbar ? (toolbar.textContent ?? "").replace(/\\s+/g, " ").trim() : "",
            };
          })`;

          const CLICK_LANG_TOGGLE_EXPR = `(() => {
            const scopes = Array.from(document.querySelectorAll("[role='toolbar'], .workspace-toolbar, header, main"));
            const seen = new Set();
            for (const sc of scopes) {
              for (const el of sc.querySelectorAll("button, select, input[type='checkbox']")) {
                if (seen.has(el) || el.closest(".controls") || el.closest("[hidden]")) continue;
                seen.add(el);
                const meta = (el.id ?? "") + " " + (el.name ?? "") + " " + (el.getAttribute("aria-label") ?? "") + " " + (el.textContent ?? "") + " " + (el.closest("label")?.textContent ?? "");
                if (/audio|loa|âm thanh|fullscreen|toàn màn hình|focus|tập trung/i.test(meta)) continue;
                if (/\\bVI\\s*\\/\\s*EN\\b|\\bEN\\s*\\/\\s*VI\\b|ngôn\\s*ngữ|\\blang|\\bLCD\\s*:\\s*(?:EN|VI)\\b/i.test(meta)) {
                  if (el.tagName === "SELECT" && el.options.length >= 2) {
                    el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
                    el.dispatchEvent(new Event("change", {bubbles: true}));
                  } else {
                    el.click();
                  }
                  return true;
                }
              }
            }
            return false;
          })`;

          const langBefore = await page.evaluate(`${READ_LANG_TOGGLE_EXPR}()`);
          assert.equal(langBefore.found, true, "Workspace toolbar must expose a VI/EN language toggle control");
          const clickedLang1 = await page.evaluate(`${CLICK_LANG_TOGGLE_EXPR}()`);
          assert.equal(clickedLang1, true, "Must click VI/EN toggle control");
          await page.delay(150);
          const langAfter = await page.evaluate(`${READ_LANG_TOGGLE_EXPR}()`);
          const langChanged =
            langAfter.btnText !== langBefore.btnText ||
            langAfter.value !== langBefore.value ||
            langAfter.checked !== langBefore.checked ||
            langAfter.ariaPressed !== langBefore.ariaPressed ||
            langAfter.ariaLabel !== langBefore.ariaLabel ||
            langAfter.langAttr !== langBefore.langAttr ||
            langAfter.toolbarText !== langBefore.toolbarText;
          assert.equal(
            langChanged,
            true,
            `Clicking VI/EN toggle must visibly update language state (before=${JSON.stringify(langBefore)}, after=${JSON.stringify(langAfter)})`,
          );

          const clickedLang2 = await page.evaluate(`${CLICK_LANG_TOGGLE_EXPR}()`);
          assert.equal(clickedLang2, true, "Must click VI/EN toggle a second time to restore initial language");
          await page.delay(150);
          const langRestored = await page.evaluate(`${READ_LANG_TOGGLE_EXPR}()`);
          assert.deepEqual(
            {
              btnText: langRestored.btnText,
              value: langRestored.value,
              checked: langRestored.checked,
              ariaPressed: langRestored.ariaPressed,
              ariaLabel: langRestored.ariaLabel,
              langAttr: langRestored.langAttr,
            },
            {
              btnText: langBefore.btnText,
              value: langBefore.value,
              checked: langBefore.checked,
              ariaPressed: langBefore.ariaPressed,
              ariaLabel: langBefore.ariaLabel,
              langAttr: langBefore.langAttr,
            },
            "Second VI/EN toggle click must restore initial language state",
          );

          // Toggle focus mode semantically (no brittle hard-only #device-focus-toggle) & verify zero overflow
          const layout = await page.evaluate(`(async () => {
            const cb = document.querySelector("#device-focus-toggle") ?? Array.from(document.querySelectorAll("input[type='checkbox']"))
              .find(el => {
                const lbl = el.id ? document.querySelector(\`label[for="\${el.id}"]\`) : null;
                const meta = (el.id ?? "") + " " + (el.name ?? "") + " " + (el.getAttribute("aria-label") ?? "") + " " + (lbl?.textContent ?? "") + " " + (el.closest("label")?.textContent ?? "");
                return /tập\\s*trung|focus/i.test(meta);
              }) ?? null;
            if (!cb) return {hasFocusToggle: false, checked: false, opacity: 1, panelCollapsed: false, overflowX: 0};
            if (!cb.checked) cb.click();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const panel = document.querySelector(".training-panel, aside");
            const cs = panel ? getComputedStyle(panel) : null;
            const opacity = cs ? Number(cs.opacity) : 1;
            const panelCollapsed = Boolean(panel && (panel.hidden || cs.display === "none" || cs.visibility === "hidden"));
            const overflowX = document.documentElement.scrollWidth - window.innerWidth;
            return {
              hasFocusToggle: true,
              checked: Boolean(cb.checked),
              opacity,
              panelCollapsed,
              overflowX,
              innerWidth: window.innerWidth,
              dpr: window.devicePixelRatio,
              m1241: matchMedia("(min-width: 1241px)").matches,
              activeId: document.activeElement?.id || document.activeElement?.tagName || "",
              focusWithin: Boolean(panel?.matches(":focus-within")),
              hasChecked: Boolean(document.querySelector(".workbench")?.matches(":has(#device-focus-toggle:checked)")),
            };
          })()`);
          assert.equal(layout.hasFocusToggle, true, "Must find semantic device focus checkbox");
          assert.equal(layout.checked, true, "Focus toggle checkbox must become checked when clicked");
          assert.ok(
            layout.opacity < 1 || layout.panelCollapsed,
            `Focus mode should dim or collapse training panel, got opacity=${layout.opacity}, collapsed=${layout.panelCollapsed} (w=${layout.innerWidth}, dpr=${layout.dpr}, m1241=${layout.m1241}, active=${layout.activeId}, focusWithin=${layout.focusWithin}, hasChecked=${layout.hasChecked})`,
          );
          assert.ok(layout.overflowX <= 1, `Unexpected horizontal scroll overflow: ${layout.overflowX}px`);
          page.assertNoErrors("T4-015 D15 ARIA, VI/EN Toggle & Focus Mode");
        });
      });
    },
  },
  {
    id: "T4-016",
    name: "Live /mdc2060 Storm Clutter, Sensor Fault (HDG NO SIGNAL) & Bridge Sync Tab",
    features: [7, 9, 24, 30, 31, 32],
    timeoutMs: 45000,
    async run() {
      await withLoopbackServer(async server => {
        await withCdpHttpPage(server.url("/mdc2060"), async page => {
          await bootMdcInBrowserToTx(page);

          // Tab 1: switch to mdc2060-storm-clutter
          const switchedStorm = await page.evaluate(`(() => {
            const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
            if (tabs[0]) tabs[0].click();
            const sel = document.querySelector("aside select");
            if (!sel) return false;
            const opt = Array.from(sel.options).find(o => /storm/i.test(o.value) || /bão|mưa/i.test(o.textContent ?? ""));
            if (!opt) return false;
            sel.value = opt.value;
            sel.dispatchEvent(new Event("change", {bubbles: true}));
            return true;
          })()`);
          assert.equal(switchedStorm, true, "Tab 1 must allow switching to mdc2060-storm-clutter");
          await page.delay(200);
          await ensurePoweredOnToTx(page);

          const READ_VISIBLE_FAULT_TEXT_EXPR = `(() => {
            const isVisible = el => Boolean(
              el &&
              !el.closest("[hidden]") &&
              getComputedStyle(el).display !== "none" &&
              getComputedStyle(el).visibility !== "hidden"
            );
            const nodes = Array.from(document.querySelectorAll(
              "[role='status'], [aria-live], .d15-live-rail, .instructor-telemetry, .sensor-status, [data-warning], aside [role='tabpanel']:not([hidden]), .device-frame"
            )).filter(isVisible);
            return nodes.map(el => (el.textContent ?? "").replace(/\\s+/g, " ").trim()).filter(Boolean).join(" | ");
          })`;

          const beforeFaultText = await page.evaluate(`${READ_VISIBLE_FAULT_TEXT_EXPR}()`);
          assert.doesNotMatch(
            beforeFaultText,
            /HDG\s*NO\s*SIGNAL/i,
            "HDG NO SIGNAL must not be displayed prior to disabling heading sensor",
          );

          // Tab 2: toggle HDG sensor OFF -> verify explicit HDG NO SIGNAL indicator -> re-enable HDG
          const toggledHdgOff = await page.evaluate(`(() => {
            const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
            if (tabs[1]) tabs[1].click();
            const inputs = Array.from(document.querySelectorAll("aside input[type='checkbox']"));
            const hdg = inputs.find(el => /hdg|heading|la bàn/i.test((el.id ?? "") + " " + (el.name ?? "") + " " + (el.closest("label")?.textContent ?? "")));
            if (!hdg) return {found: false, nowChecked: true};
            if (hdg.checked) hdg.click();
            return {found: true, nowChecked: Boolean(hdg.checked)};
          })()`);
          assert.equal(toggledHdgOff.found, true, "Tab 2 must provide heading sensor toggle");
          assert.equal(toggledHdgOff.nowChecked, false, "HDG sensor toggle must switch OFF");
          await page.evaluate(`${CLICK_ASIDE_BUTTON_EXPR}(${JSON.stringify(STEP_1S_MATCHER)})`);
          await page.delay(220);

          const faultText = await page.evaluate(`${READ_VISIBLE_FAULT_TEXT_EXPR}()`);
          assert.match(
            faultText,
            /HDG\s*NO\s*SIGNAL/i,
            `Disabling HDG sensor must surface explicit HDG NO SIGNAL in visible status/telemetry (got: ${faultText.slice(0, 300)})`,
          );

          const toggledHdgOn = await page.evaluate(`(() => {
            const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
            if (tabs[1]) tabs[1].click();
            const inputs = Array.from(document.querySelectorAll("aside input[type='checkbox']"));
            const hdg = inputs.find(el => /hdg|heading|la bàn/i.test((el.id ?? "") + " " + (el.name ?? "") + " " + (el.closest("label")?.textContent ?? "")));
            if (!hdg) return {found: false, nowChecked: false};
            if (!hdg.checked) hdg.click();
            return {found: true, nowChecked: Boolean(hdg.checked)};
          })()`);
          assert.equal(toggledHdgOn.found, true);
          assert.equal(toggledHdgOn.nowChecked, true, "HDG sensor toggle must re-enable cleanly");
          await page.evaluate(`${CLICK_ASIDE_BUTTON_EXPR}(${JSON.stringify(STEP_1S_MATCHER)})`);
          await page.delay(200);
          const recoveredText = await page.evaluate(`${READ_VISIBLE_FAULT_TEXT_EXPR}()`);
          assert.doesNotMatch(
            recoveredText,
            /HDG\s*NO\s*SIGNAL/i,
            "Re-enabling HDG sensor must clear HDG NO SIGNAL warning",
          );

          // Tab 3: verify live NMEA sentences strictly inside visible Tab 3 panel
          const tab3Snap = await page.evaluate(`(() => {
            const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
            if (!tabs[2]) return {selected: false, text: ""};
            tabs[2].click();
            const activePanel = document.querySelector("aside [role='tabpanel']:not([hidden])");
            return {
              selected: tabs[2].getAttribute("aria-selected") === "true",
              text: activePanel ? (activePanel.textContent ?? "") : "",
            };
          })()`);
          assert.equal(tab3Snap.selected, true, "Tab 3 must be selected when inspecting NMEA stream");
          assert.match(tab3Snap.text, /\$HEHDT,/);
          assert.match(tab3Snap.text, /\$GPRMC,/);
          assert.match(tab3Snap.text, /\$GPVTG,/);
          assert.match(tab3Snap.text, /\$SDDBT,/);

          const switchedBridge = await page.evaluate(`(() => {
            const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
            if (tabs[0]) tabs[0].click();
            const sel = document.querySelector("aside select");
            if (!sel) return false;
            const opt = Array.from(sel.options).find(o => /bridge/i.test(o.value) || /buồng lái|fcv/i.test(o.textContent ?? ""));
            if (!opt) return false;
            sel.value = opt.value;
            sel.dispatchEvent(new Event("change", {bubbles: true}));
            return true;
          })()`);
          assert.equal(switchedBridge, true, "Must allow switching to bridge-coastal-traffic-001");
          await page.delay(200);
          page.assertNoErrors("T4-016 Sensor Fault & Bridge Sync");
        });
      });
    },
  },
  {
    id: "T4-017",
    name: "Live /mdc2060 Settings Export -> Hold Power OFF -> Import Restore -> Power ON",
    features: [2, 31, 32],
    timeoutMs: 45000,
    async run() {
      await withLoopbackServer(async server => {
        await withCdpHttpPage(server.url("/mdc2060"), async page => {
          await bootMdcInBrowserToTx(page);

          // Change range before exporting settings (checking click return)
          const clickedRange = await page.evaluate(`${CLICK_CONTROL_EXPR}(${JSON.stringify(RANGE_DOWN_MATCHER)})`);
          assert.equal(clickedRange, true, "Must click bezel RANGE DOWN before exporting settings");
          await page.delay(120);

          // Open Tab 5 (Settings & Replay) and trigger initial settings export
          const exportedJson = await page.evaluate(`(() => {
            const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
            if (tabs[4]) tabs[4].click();
            const area = document.querySelector("aside [role='tabpanel']:not([hidden]) textarea") ?? document.querySelector("aside textarea");
            if (area) area.value = "";
            const btns = Array.from(document.querySelectorAll("aside button"))
              .filter(b => b.getAttribute("role") !== "tab" && !b.closest("[hidden]"));
            const expBtn =
              btns.find(b => /(?:xuất|export|lưu|save).*(?:cấu hình|settings)|(?:cấu hình|settings).*(?:xuất|export|lưu|save)/i.test(b.textContent ?? "")) ??
              btns.find(b => /xuất|export|lưu|save/i.test(b.textContent ?? ""));
            if (!expBtn) return null;
            expBtn.click();
            return area ? area.value : null;
          })()`);
          assert.equal(typeof exportedJson, "string", "Tab 5 Export must produce JSON settings payload");
          assert.ok(exportedJson.length > 0, "Tab 5 Export must populate non-empty settings JSON");
          const parsedExport = JSON.parse(exportedJson);
          assert.ok(parsedExport && typeof parsedExport === "object");
          assert.ok(parsedExport.settings && typeof parsedExport.settings === "object", "Exported settings payload must include a settings object");
          assert.match(String(parsedExport.contentFingerprint ?? ""), /^f0-fnv1a32-[0-9a-f]{8}$/);

          // Force genuine state divergence before power-OFF (live RANGE/GAIN + allowlisted bezel F1 EBL1/VRM1 setting)
          const clickedRange2 = await page.evaluate(`${CLICK_CONTROL_EXPR}(${JSON.stringify(RANGE_DOWN_MATCHER)})`);
          assert.equal(clickedRange2, true, "Must click bezel RANGE DOWN a second time to diverge radar state");
          await page.delay(120);
          const gainDiv = await adjustRotaryControlInBrowser(page, "gain");
          assert.equal(gainDiv.interacted, true, `Must adjust GAIN to diverge radar state (${JSON.stringify(gainDiv)})`);
          await page.delay(120);
          const clickedF1 = await page.evaluate(`${CLICK_CONTROL_EXPR}(${JSON.stringify("^f1$|\\bF1\\b")})`);
          assert.equal(clickedF1, true, "Must click bezel F1 (EBL1/VRM1) to diverge allowlisted menu settings");
          await page.delay(120);

          // Re-select Tab 5, clear textarea, export diverged settings, and assert genuine divergence
          const divergedExportRes = await page.evaluate(`(() => {
            const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
            if (tabs[4]) tabs[4].click();
            const area = document.querySelector("aside [role='tabpanel']:not([hidden]) textarea") ?? document.querySelector("aside textarea");
            if (area) area.value = "";
            const btns = Array.from(document.querySelectorAll("aside button"))
              .filter(b => b.getAttribute("role") !== "tab" && !b.closest("[hidden]"));
            const expBtn =
              btns.find(b => /(?:xuất|export|lưu|save).*(?:cấu hình|settings)|(?:cấu hình|settings).*(?:xuất|export|lưu|save)/i.test(b.textContent ?? "")) ??
              btns.find(b => /xuất|export|lưu|save/i.test(b.textContent ?? ""));
            if (!expBtn) return {exportedDiverged: false, json: null};
            expBtn.click();
            return {exportedDiverged: true, json: area ? area.value : null};
          })()`);
          const exportedDiverged = divergedExportRes.exportedDiverged;
          assert.equal(exportedDiverged, true, "Tab 5 Export Settings must execute after mutating settings");
          const divergedJson = divergedExportRes.json;
          assert.equal(typeof divergedJson, "string", "Tab 5 Export after divergence must produce JSON settings payload");
          assert.ok(divergedJson.length > 0, "Tab 5 Export after divergence must populate non-empty settings JSON");
          const divergedExport = JSON.parse(divergedJson);
          assert.ok(
            divergedExport && typeof divergedExport === "object" && divergedExport.settings && typeof divergedExport.settings === "object",
            "Diverged settings payload must include a settings object",
          );
          assert.equal(parsedExport.settings.ebl1, "OFF", "Initial exported settings must start with EBL1 OFF");
          assert.equal(parsedExport.settings.vrm1, "OFF", "Initial exported settings must start with VRM1 OFF");
          assert.equal(divergedExport.settings.ebl1, "ON", "Clicking bezel F1 must diverge exported settings.ebl1 to ON");
          assert.equal(divergedExport.settings.vrm1, "ON", "Clicking bezel F1 must diverge exported settings.vrm1 to ON");
          assert.notDeepEqual(
            divergedExport.settings,
            parsedExport.settings,
            "Mutating radar settings after initial export must diverge settings prior to OFF-state restore",
          );

          // Authentic >3000ms physical hold via real Chromium CDP mouse events (exercises web/hold-input.mjs setPointerCapture)
          await page.holdElementMouse(POWER_BEZEL_LOCATOR_EXPR, 3200);
          await page.delay(220);

          const offCheck = await page.evaluate(`(() => {
            const veil = document.querySelector(".off-screen, [data-off-screen], [id*='off-screen']");
            const veilVisible = Boolean(
              veil &&
              !veil.hidden &&
              veil.getAttribute("aria-hidden") !== "true" &&
              getComputedStyle(veil).display !== "none" &&
              getComputedStyle(veil).visibility !== "hidden" &&
              Number(getComputedStyle(veil).opacity) !== 0
            );
            const statusNodes = Array.from(document.querySelectorAll("[role='status'], [aria-live], .d15-live-rail"))
              .filter(el => !el.closest("[hidden]") && getComputedStyle(el).display !== "none");
            const statusText = statusNodes.map(el => (el.textContent ?? "").trim()).join(" | ");
            return {veilExists: Boolean(veil), veilVisible, statusText};
          })()`);
          if (offCheck.veilExists) {
            assert.equal(offCheck.veilVisible, true, "Holding POWER/BRILL >3000ms must power unit OFF and reveal off-screen veil");
          } else {
            const offCanvas = await page.inspectCanvas('canvas[width="480"][height="640"], canvas');
            const canvasDark = Boolean(offCanvas && offCanvas.ppiCircleNonBg < 50 && offCanvas.uniqueColors <= 3);
            const statusSaysOff = /\b(?:POWER\s*OFF|OFF|TẮT\s*NGUỒN)\b/i.test(offCheck.statusText);
            assert.equal(
              canvasDark && statusSaysOff,
              true,
              `Holding POWER/BRILL >3000ms must power unit OFF (canvasDark=${canvasDark}, statusText=${offCheck.statusText})`,
            );
          }

          // Import original pre-divergence exportedJson (NOT divergedJson) while powered OFF
          const imported = await page.evaluate(`((jsonStr) => {
            const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
            if (tabs[4]) tabs[4].click();
            const area = document.querySelector("aside [role='tabpanel']:not([hidden]) textarea") ?? document.querySelector("aside textarea");
            if (!area) return false;
            area.value = jsonStr;
            area.dispatchEvent(new Event("input", {bubbles: true}));
            const btns = Array.from(document.querySelectorAll("aside button"))
              .filter(b => b.getAttribute("role") !== "tab" && !b.closest("[hidden]"));
            const impBtn =
              btns.find(b => /(?:nạp|import|khôi phục|restore).*(?:cấu hình|settings)|(?:cấu hình|settings).*(?:nạp|import|khôi phục|restore)/i.test(b.textContent ?? "")) ??
              btns.find(b => /nạp|import|khôi phục|restore/i.test(b.textContent ?? ""));
            if (!impBtn) return false;
            impBtn.click();
            return true;
          })(${JSON.stringify(exportedJson)})`);
          assert.equal(imported, true, "Tab 5 Import/Restore button must execute while powered OFF");
          await page.delay(150);
          const importStatus = await readVisibleTabPanelStatus(page);
          assert.ok(
            importStatus.text.length > 0,
            "Importing valid settings while OFF must display non-empty Tab 5 restore confirmation status",
          );
          assert.doesNotMatch(
            importStatus.text,
            SETTINGS_IMPORT_REJECT_RE,
            `Importing valid settings while OFF must succeed without error (status: ${importStatus.text})`,
          );
          assert.match(
            importStatus.text,
            SETTINGS_IMPORT_CONFIRM_RE,
            `Importing valid settings while OFF must display explicit restore confirmation token in Tab 5 (status: ${importStatus.text})`,
          );

          // Power back ON -> TX and verify multi-color rendering resumes cleanly and original pre-divergence settings were restored
          await bootMdcInBrowserToTx(page);
          const reExportedJson = await page.evaluate(`(() => {
            const tabs = Array.from(document.querySelectorAll("aside [role='tab']"));
            if (tabs[4]) tabs[4].click();
            const area = document.querySelector("aside [role='tabpanel']:not([hidden]) textarea") ?? document.querySelector("aside textarea");
            if (area) area.value = "";
            const btns = Array.from(document.querySelectorAll("aside button"))
              .filter(b => b.getAttribute("role") !== "tab" && !b.closest("[hidden]"));
            const expBtn =
              btns.find(b => /(?:xuất|export|lưu|save).*(?:cấu hình|settings)|(?:cấu hình|settings).*(?:xuất|export|lưu|save)/i.test(b.textContent ?? "")) ??
              btns.find(b => /xuất|export|lưu|save/i.test(b.textContent ?? ""));
            if (!expBtn) return null;
            expBtn.click();
            return area ? area.value : null;
          })()`);
          assert.equal(typeof reExportedJson, "string", "Tab 5 Export after cold reboot must produce JSON settings payload");
          assert.ok(reExportedJson.length > 0, "Tab 5 Export after cold reboot must populate non-empty settings JSON");
          const reParsedExport = JSON.parse(reExportedJson);
          assert.ok(
            reParsedExport && typeof reParsedExport === "object" && reParsedExport.settings && typeof reParsedExport.settings === "object",
            "Re-exported settings payload after cold reboot must include a settings object",
          );
          assert.equal(reParsedExport.settings.ebl1, "OFF", "OFF-state import restore must revert settings.ebl1 back to OFF");
          assert.equal(reParsedExport.settings.vrm1, "OFF", "OFF-state import restore must revert settings.vrm1 back to OFF");
          assert.deepEqual(
            reParsedExport.settings,
            parsedExport.settings,
            "Settings exported before divergence must be restored identically after OFF-state import and cold reboot",
          );
          assert.notDeepEqual(
            reParsedExport.settings,
            divergedExport.settings,
            "Restored settings must revert the post-export divergence (proving Import actually applied restore-settings)",
          );
          page.assertNoErrors("T4-017 Settings Export/Restore UI");
        });
      });
    },
  },
  {
    id: "T4-018",
    name: "Live / (FCV-588) Non-Regression Smoke Alongside /mdc2060 in Headless Chrome CDP",
    features: [34, 35],
    timeoutMs: 35000,
    async run() {
      await withLoopbackServer(async server => {
        await withCdpHttpPage(server.url("/"), async page => {
          const check = await page.evaluate(`(() => {
            const html = document.documentElement.outerHTML;
            const canvas = document.querySelector("canvas");
            const rect = canvas ? canvas.getBoundingClientRect() : null;
            const note = Array.from(document.querySelectorAll("[role='note']")).map(n => n.textContent ?? "").join(" ");
            return {
              hasMdcLeak: /MDC-2060|KODEN J2000/.test(html),
              hasFcvTitle: /FCV-588/i.test(document.title + " " + (document.querySelector("h1")?.textContent ?? "")),
              hasCanvas: Boolean(canvas && rect && rect.width > 100 && rect.height > 100),
              hasPublicRefNote: note.includes("PUBLIC REFERENCE"),
            };
          })()`);
          assert.equal(check.hasMdcLeak, false, "FCV-588 root / must NEVER contain MDC-2060 or KODEN J2000");
          assert.equal(check.hasFcvTitle, true, "FCV-588 root / must render FURUNO FCV-588 console");
          assert.equal(check.hasCanvas, true, "FCV-588 root / must render non-zero LCD canvas");
          assert.equal(check.hasPublicRefNote, true, "FCV-588 root / must keep PUBLIC REFERENCE banner");
          page.assertNoErrors("T4-018 FCV-588 / non-regression");
        });
      });
    },
  },
];
