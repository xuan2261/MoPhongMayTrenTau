import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {existsSync, statSync} from "node:fs";
import {mkdtemp, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {E2eTargetError, requireWorkspaceFile} from "./module-loader.mjs";

const delay = ms => new Promise(resolve => {
  const t = setTimeout(resolve, ms);
  if (typeof t.unref === "function") t.unref();
});

export function findChromiumBinary() {
  const envBin = process.env.CHROME_BIN;
  if (envBin && existsSync(envBin)) return envBin;
  const candidates = process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      ]
    : [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
      ];
  return candidates.find(candidate => existsSync(candidate)) ?? null;
}

/**
 * Anti-cheat Canvas 2D pixel entropy & frame-hash oracle executed inside Chrome.
 * Works identically across dark (DAY/NIGHT/GREEN) and light (WHITE) palettes.
 */
export const CANVAS_PIXEL_ORACLE_EXPR = `((selector = 'canvas[width="480"][height="640"], canvas') => {
  const canvas = document.querySelector(selector);
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const buckets = new Set();
  let nonBlack = 0;
  const bgIdx = (4 * width + 4) * 4;
  const bgR = data[bgIdx] ?? 0;
  const bgG = data[bgIdx + 1] ?? 0;
  const bgB = data[bgIdx + 2] ?? 0;
  let ppiCircleNonBg = 0;
  let hash = 2166136261 >>> 0;
  const cx = width * 0.5;
  const cy = height * 0.48;
  const r2 = (width * 0.42) ** 2;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 8 || g > 8 || b > 8) nonBlack++;
      buckets.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
      const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      if (dist > 45 && ((x - cx) ** 2 + (y - cy) ** 2) <= r2) ppiCircleNonBg++;
      if ((x % 16 === 0) && (y % 16 === 0)) {
        hash = Math.imul(hash ^ (r ^ (g << 1) ^ (b << 2)), 16777619) >>> 0;
      }
    }
  }
  const rect = canvas.getBoundingClientRect();
  return {
    width,
    height,
    renderedWidth: Math.round(rect.width),
    renderedHeight: Math.round(rect.height),
    uniqueColors: buckets.size,
    nonBlack,
    ppiCircleNonBg,
    frameHash: hash,
  };
})`;

function isAllowedRequestUrl(reqUrl, allowedOrigin) {
  if (!reqUrl || typeof reqUrl !== "string") return true;
  if (
    reqUrl.startsWith("file:") ||
    reqUrl.startsWith("data:") ||
    reqUrl.startsWith("about:") ||
    reqUrl.startsWith("blob:")
  ) {
    return true;
  }
  if (!allowedOrigin) return false;
  try {
    return new URL(reqUrl).origin === new URL(allowedOrigin).origin;
  } catch {
    return false;
  }
}

function buildElementLookupJs(selectorOrLocatorExpr) {
  if (selectorOrLocatorExpr && typeof selectorOrLocatorExpr === "object" && typeof selectorOrLocatorExpr.locatorExpr === "string") {
    return `(${selectorOrLocatorExpr.locatorExpr})`;
  }
  if (typeof selectorOrLocatorExpr === "string") {
    const trimmed = selectorOrLocatorExpr.trim();
    if (!trimmed) {
      throw new TypeError("Element selector or locator expression must be a non-empty string");
    }
    if (trimmed.startsWith("(")) {
      return trimmed;
    }
    return `document.querySelector(${JSON.stringify(trimmed)})`;
  }
  throw new TypeError("Element target must be a CSS selector string, parenthesized locator expression, or {locatorExpr}");
}

async function terminateChrome(child) {
  if (!child || !child.pid || child.exitCode !== null || child.signalCode !== null) return;
  try {
    child.kill("SIGTERM");
  } catch {
    return;
  }
  const exited = await Promise.race([
    once(child, "exit").then(() => true),
    delay(1000).then(() => false),
  ]);
  if (!exited && child.exitCode === null && child.signalCode === null) {
    try {
      child.kill("SIGKILL");
    } catch {
      return;
    }
    await Promise.race([once(child, "exit"), delay(1500)]);
  }
}

export async function launchCdpSession({
  browserBin = findChromiumBinary(),
  viewport = {width: 1440, height: 960, deviceScaleFactor: 1, mobile: false},
  startupTimeoutMs = 15000,
  commandTimeoutMs = 15000,
  allowedOrigin = null,
} = {}) {
  if (!browserBin) {
    throw new E2eTargetError(
      "E2E_BROWSER_MISSING",
      "No local Chrome/Chromium binary found for CDP verification",
      {},
    );
  }

  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "mdc2060-e2e-cdp-"));
  const args = [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--mute-audio",
    `--window-size=${viewport.width},${viewport.height}`,
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ];

  const chrome = spawn(browserBin, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let ws = null;
  let closed = false;
  let stderrLog = "";
  let spawnError = null;
  let startupReject = null;
  const pending = new Map();
  let nextCmdId = 1;
  const loadWaiters = new Set();

  const pageErrors = [];
  const consoleErrors = [];
  const httpErrors = [];
  const networkErrors = [];
  const externalNetworkRequests = [];

  function rejectAllPending(reason) {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(reason);
    }
    pending.clear();
    for (const waiter of loadWaiters) {
      clearTimeout(waiter.timer);
      waiter.reject(reason);
    }
    loadWaiters.clear();
  }

  chrome.once("error", err => {
    spawnError = err;
    const wrapped = new Error(`Failed to spawn Chrome binary (${browserBin}): ${err.message}`, {cause: err});
    if (startupReject) {
      startupReject(wrapped);
    } else {
      rejectAllPending(wrapped);
    }
  });

  async function cleanup() {
    if (closed) return;
    closed = true;
    rejectAllPending(new Error("CDP session closed"));
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      try {
        ws.close();
      } catch {
        // Ignore ws close errors during teardown
      }
    }
    await terminateChrome(chrome);
    await rm(userDataDir, {recursive: true, force: true, maxRetries: 5, retryDelay: 100}).catch(() => {});
  }

  try {
    const devToolsWsUrl = await new Promise((resolve, reject) => {
      if (spawnError) {
        reject(new Error(`Failed to spawn Chrome binary (${browserBin}): ${spawnError.message}`, {cause: spawnError}));
        return;
      }
      let settled = false;
      const cleanupStartupListeners = () => {
        clearTimeout(timer);
        chrome.stderr.off("data", onData);
        chrome.off("exit", onEarlyExit);
        startupReject = null;
      };
      const finishResolve = value => {
        if (settled) return;
        settled = true;
        cleanupStartupListeners();
        resolve(value);
      };
      const finishReject = err => {
        if (settled) return;
        settled = true;
        cleanupStartupListeners();
        reject(err);
      };

      const timer = setTimeout(() => {
        finishReject(new Error(`Timed out waiting for Chrome DevTools endpoint (${startupTimeoutMs}ms). stderr=${stderrLog}`));
      }, startupTimeoutMs);
      if (typeof timer.unref === "function") timer.unref();

      const onData = chunk => {
        stderrLog += String(chunk);
        const match = stderrLog.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) {
          finishResolve(match[1]);
        }
      };
      const onEarlyExit = (code, signal) => {
        finishReject(new Error(`Chrome exited early during startup (code=${code}, signal=${signal}). stderr=${stderrLog}`));
      };

      startupReject = finishReject;
      chrome.stderr.on("data", onData);
      chrome.once("exit", onEarlyExit);
    });

    const debugPort = new URL(devToolsWsUrl).port;
    const listRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    if (!listRes.ok) {
      throw new Error(`Failed to fetch Chrome targets list: HTTP ${listRes.status}`);
    }
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === "page" && t.webSocketDebuggerUrl);
    if (!pageTarget) {
      throw new Error(`No page target found in Chrome DevTools list: ${JSON.stringify(targets)}`);
    }

    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out connecting to Chrome CDP WebSocket")), startupTimeoutMs);
      if (typeof timer.unref === "function") timer.unref();
      const onOpen = () => {
        clearTimeout(timer);
        resolve();
      };
      const onError = evt => {
        clearTimeout(timer);
        reject(new Error(`Chrome CDP WebSocket connection failed: ${evt?.message ?? "error"}`));
      };
      ws.addEventListener("open", onOpen, {once: true});
      ws.addEventListener("error", onError, {once: true});
    });

    chrome.once("exit", (code, signal) => {
      rejectAllPending(new Error(`Chrome process exited unexpectedly (code=${code}, signal=${signal})`));
    });
    ws.addEventListener("close", () => {
      rejectAllPending(new Error("Chrome CDP WebSocket closed"));
    });
    ws.addEventListener("error", () => {
      rejectAllPending(new Error("Chrome CDP WebSocket error"));
    });
    ws.addEventListener("message", evt => {
      let msg;
      try {
        msg = JSON.parse(String(evt.data));
      } catch {
        return;
      }
      if (msg.id !== undefined) {
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.error) {
          entry.reject(new Error(`CDP ${entry.method} failed: ${msg.error.message} (${msg.error.code})`));
        } else {
          entry.resolve(msg.result ?? {});
        }
        return;
      }
      if (msg.method === "Page.loadEventFired") {
        for (const waiter of Array.from(loadWaiters)) {
          loadWaiters.delete(waiter);
          clearTimeout(waiter.timer);
          waiter.resolve();
        }
      } else if (msg.method === "Runtime.exceptionThrown") {
        const det = msg.params?.exceptionDetails;
        pageErrors.push(det?.exception?.description ?? det?.text ?? JSON.stringify(det));
      } else if (msg.method === "Runtime.consoleAPICalled") {
        if (msg.params?.type === "error") {
          const text = (msg.params.args ?? []).map(a => a.description ?? a.value ?? "").join(" ");
          consoleErrors.push(text || "console.error");
        }
      } else if (msg.method === "Log.entryAdded") {
        if (msg.params?.entry?.level === "error") {
          consoleErrors.push(msg.params.entry.text ?? JSON.stringify(msg.params.entry));
        }
      } else if (msg.method === "Network.requestWillBeSent") {
        const reqUrl = msg.params?.request?.url;
        if (!isAllowedRequestUrl(reqUrl, allowedOrigin)) {
          externalNetworkRequests.push(reqUrl);
        }
      } else if (msg.method === "Network.responseReceived") {
        const resp = msg.params?.response;
        if (resp && Number(resp.status) >= 400) {
          httpErrors.push({url: resp.url, status: resp.status, statusText: resp.statusText});
        }
      } else if (msg.method === "Network.loadingFailed") {
        if (!msg.params?.canceled) {
          networkErrors.push({
            requestId: msg.params?.requestId,
            errorText: msg.params?.errorText,
            blockedReason: msg.params?.blockedReason ?? null,
          });
        }
      }
    });

    const send = (method, params = {}, timeoutMs = commandTimeoutMs) => {
      if (closed || !ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error(`Cannot send CDP ${method}: session is not open`));
      }
      const id = nextCmdId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP ${method} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        if (typeof timer.unref === "function") timer.unref();
        pending.set(id, {method, resolve, reject, timer});
        ws.send(JSON.stringify({id, method, params}));
      });
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");
    await send("Network.enable");
    await send("Emulation.setDeviceMetricsOverride", viewport);

    const evaluate = async (expression, {awaitPromise = true, timeoutMs = commandTimeoutMs} = {}) => {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise,
      }, timeoutMs);
      if (res.exceptionDetails) {
        const msg = res.exceptionDetails.exception?.description ?? res.exceptionDetails.text ?? "Evaluation exception";
        throw new Error(`Page evaluation error: ${msg}`);
      }
      return res.result?.value;
    };

    const navigate = async (url, {timeoutMs = 15000} = {}) => {
      let waiter = null;
      const loadPromise = new Promise((resolve, reject) => {
        waiter = {
          resolve,
          reject,
          timer: setTimeout(() => {
            loadWaiters.delete(waiter);
            reject(new Error(`Navigation to ${url} timed out waiting for loadEventFired (${timeoutMs}ms)`));
          }, timeoutMs),
        };
        if (typeof waiter.timer.unref === "function") waiter.timer.unref();
        loadWaiters.add(waiter);
      });
      // Prevent Node UnhandledPromiseRejection if loadPromise rejects before await loadPromise
      // (e.g., WebSocket drops mid-send). Does not suppress rejection when loadPromise is awaited.
      loadPromise.catch(() => {});

      const disarmWaiter = () => {
        if (!waiter) return;
        loadWaiters.delete(waiter);
        clearTimeout(waiter.timer);
        waiter = null;
      };

      let navRes;
      try {
        navRes = await send("Page.navigate", {url}, timeoutMs);
        if (navRes?.errorText) {
          throw new Error(`Navigation to ${url} failed: ${navRes.errorText}`);
        }
      } catch (err) {
        disarmWaiter();
        throw err;
      }

      try {
        await loadPromise;
      } finally {
        disarmWaiter();
      }
      await delay(120);
      return navRes;
    };

    const waitForCondition = async (predicateExpr, {timeoutMs = 5000, pollMs = 50, label = "condition"} = {}) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const ok = await evaluate(`Boolean(${predicateExpr})`);
        if (ok) return true;
        await delay(pollMs);
      }
      throw new Error(`Timed out waiting for ${label} after ${timeoutMs}ms`);
    };

    const clickSelector = async selector => {
      const clicked = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`clickSelector failed: no element matches ${selector}`);
      return true;
    };

    const dispatchKey = async (type, opts = {}) => send("Input.dispatchKeyEvent", {type, ...opts});

    const dispatchMouse = async (type, opts = {}) => send("Input.dispatchMouseEvent", {type, ...opts});

    /**
     * Authentically holds an element via real Chromium CDP mouse events (mouseMoved -> mousePressed -> hold -> mouseReleased)
     * at its visible bounding-box center. Generates trusted PointerEvents with isPrimary=true and active pointerId
     * so web/hold-input.mjs setPointerCapture succeeds identically to a physical mouse press.
     */
    const holdElementMouse = async (selectorOrLocatorExpr, durationMs = 150) => {
      if (!Number.isFinite(durationMs) || durationMs < 0) {
        throw new RangeError(`holdElementMouse durationMs must be finite >= 0, got ${durationMs}`);
      }
      const lookupJs = buildElementLookupJs(selectorOrLocatorExpr);
      const targetInfo = await evaluate(`(() => {
        const el = ${lookupJs};
        if (!el) return {found: false, reason: "not_found"};
        el.scrollIntoView({block: "center", inline: "center", behavior: "instant"});
        const rect = el.getBoundingClientRect();
        if (!(rect.width > 0 && rect.height > 0)) {
          return {found: false, reason: "zero_size", width: rect.width, height: rect.height};
        }
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
          return {found: false, reason: "out_of_viewport", x, y};
        }
        const hit = document.elementFromPoint(x, y);
        const hitOk = Boolean(hit && (hit === el || el.contains(hit)));
        return {found: true, x, y, width: rect.width, height: rect.height, hitOk};
      })()`);
      if (!targetInfo?.found) {
        throw new Error(`holdElementMouse failed (${targetInfo?.reason ?? "unknown"}): ${JSON.stringify(targetInfo)}`);
      }
      if (!targetInfo.hitOk) {
        throw new Error(`holdElementMouse target occluded at (${targetInfo.x}, ${targetInfo.y})`);
      }

      await dispatchMouse("mouseMoved", {
        x: targetInfo.x,
        y: targetInfo.y,
        button: "none",
        buttons: 0,
      });
      await dispatchMouse("mousePressed", {
        x: targetInfo.x,
        y: targetInfo.y,
        button: "left",
        buttons: 1,
        clickCount: 1,
        pointerType: "mouse",
      });
      try {
        await new Promise(resolve => setTimeout(resolve, durationMs));
      } finally {
        await dispatchMouse("mouseReleased", {
          x: targetInfo.x,
          y: targetInfo.y,
          button: "left",
          buttons: 0,
          clickCount: 1,
          pointerType: "mouse",
        });
      }
      return targetInfo;
    };

    /**
     * Authentically holds a focused element via real Chromium CDP keyboard events (rawKeyDown -> hold -> keyUp),
     * exercising web/hold-input.mjs onKeyDown + document capture keyup.
     */
    const holdElementKey = async (selectorOrLocatorExpr, key = "Enter", durationMs = 150) => {
      if (!Number.isFinite(durationMs) || durationMs < 0) {
        throw new RangeError(`holdElementKey durationMs must be finite >= 0, got ${durationMs}`);
      }
      const lookupJs = buildElementLookupJs(selectorOrLocatorExpr);
      const focused = await evaluate(`(() => {
        const el = ${lookupJs};
        if (!el || typeof el.focus !== "function") return false;
        el.scrollIntoView({block: "center", inline: "center", behavior: "instant"});
        el.focus();
        return document.activeElement === el;
      })()`);
      if (!focused) {
        throw new Error("holdElementKey failed: target element not found or could not receive focus");
      }
      const keyDescriptors = {
        Enter: {key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13},
        " ": {key: " ", code: "Space", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32},
        Space: {key: " ", code: "Space", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32},
      };
      const desc = keyDescriptors[key] ?? {key};
      await dispatchKey("rawKeyDown", desc);
      try {
        await new Promise(resolve => setTimeout(resolve, durationMs));
      } finally {
        await dispatchKey("keyUp", desc);
      }
      return true;
    };

    const captureScreenshot = async (outPath, {format = "png", fullPage = false} = {}) => {
      const res = await send("Page.captureScreenshot", {format, captureBeyondViewport: fullPage});
      const buf = Buffer.from(res.data, "base64");
      if (outPath) await writeFile(outPath, buf);
      return buf;
    };

    const inspectCanvas = async (selector = 'canvas[width="480"][height="640"], canvas') =>
      evaluate(`${CANVAS_PIXEL_ORACLE_EXPR}(${JSON.stringify(selector)})`);

    const errors = () => ({
      pageErrors: [...pageErrors],
      consoleErrors: [...consoleErrors],
      httpErrors: [...httpErrors],
      networkErrors: [...networkErrors],
      externalNetworkRequests: [...externalNetworkRequests],
    });

    const clearErrors = () => {
      pageErrors.length = 0;
      consoleErrors.length = 0;
      httpErrors.length = 0;
      networkErrors.length = 0;
      externalNetworkRequests.length = 0;
    };

    const assertNoErrors = (contextLabel = "browser page") => {
      const snap = errors();
      assert.deepEqual(snap.pageErrors, [], `${contextLabel}: unexpected pageErrors`);
      assert.deepEqual(snap.consoleErrors, [], `${contextLabel}: unexpected consoleErrors`);
      assert.deepEqual(snap.httpErrors, [], `${contextLabel}: unexpected httpErrors`);
      assert.deepEqual(snap.networkErrors, [], `${contextLabel}: unexpected networkErrors`);
      assert.deepEqual(snap.externalNetworkRequests, [], `${contextLabel}: unexpected externalNetworkRequests`);
    };

    return {
      send,
      navigate,
      evaluate,
      waitForCondition,
      clickSelector,
      dispatchKey,
      dispatchMouse,
      holdElementMouse,
      holdElementKey,
      captureScreenshot,
      inspectCanvas,
      errors,
      clearErrors,
      assertNoErrors,
      delay,
      close: cleanup,
    };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

/**
 * Preflights HTTP 200 BEFORE spawning Chrome so missing routes fail fast with E2E_HTTP_STATUS.
 */
export async function withCdpHttpPage(url, fn, opts = {}) {
  const preflightRes = await fetch(url, {redirect: "manual"});
  const preflightText = await preflightRes.text();
  if (preflightRes.status !== 200) {
    throw new E2eTargetError(
      "E2E_HTTP_STATUS",
      `Preflight GET ${url} returned HTTP ${preflightRes.status} (expected 200)`,
      {url, status: preflightRes.status},
    );
  }
  const allowedOrigin = new URL(url).origin;
  const page = await launchCdpSession({...opts, allowedOrigin});
  try {
    await page.navigate(url);
    return await fn(page, {status: preflightRes.status, headers: preflightRes.headers, text: preflightText});
  } finally {
    await page.close();
  }
}

/**
 * Preflights file existence & non-empty BEFORE spawning Chrome so missing standalone HTML fails fast.
 */
export async function withCdpFilePage(relOrAbsPath, fn, opts = {}) {
  const fileInfo = path.isAbsolute(relOrAbsPath)
    ? (() => {
        if (!existsSync(relOrAbsPath)) {
          throw new E2eTargetError(
            "E2E_MISSING_FILE",
            `Required file for file:// Chrome test not found: ${relOrAbsPath}`,
            {absPath: relOrAbsPath},
          );
        }
        const info = statSync(relOrAbsPath);
        if (!info.isFile()) {
          throw new E2eTargetError(
            "E2E_MISSING_FILE",
            `Required path for file:// Chrome test is not a regular file: ${relOrAbsPath}`,
            {absPath: relOrAbsPath},
          );
        }
        if (info.size === 0) {
          throw new E2eTargetError(
            "E2E_MISSING_FILE",
            `Required file for file:// Chrome test is empty (0 bytes): ${relOrAbsPath}`,
            {absPath: relOrAbsPath, size: info.size},
          );
        }
        return {absPath: relOrAbsPath, size: info.size};
      })()
    : await requireWorkspaceFile(relOrAbsPath, {
        nonEmpty: true,
        hint: "Build via npm run build:standalone:mdc2060",
      });
  const fileUrl = pathToFileURL(fileInfo.absPath).href;
  const page = await launchCdpSession({...opts, allowedOrigin: null});
  try {
    await page.navigate(fileUrl);
    return await fn(page, fileInfo);
  } finally {
    await page.close();
  }
}
