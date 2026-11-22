from __future__ import annotations

import hashlib
import json
import mimetypes
import threading
import time
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
OUT = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/baseline-20261114"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
HOST = "127.0.0.1"
PORT = 4176
BASE_URL = f"http://{HOST}:{PORT}/"
VIEWPORT = {"width": 1366, "height": 768}
ALLOWED = {
    "web": {".html", ".mjs", ".js", ".css", ".svg"},
    "src": {".mjs", ".js"},
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def resolve_runtime_path(url: str) -> Path | None:
    path = urlsplit(url).path
    if path == "/":
        return ROOT / "web/index.html"
    if path.startswith("/web/"):
        candidate = ROOT / "web" / unquote(path[5:])
        base = ROOT / "web"
    elif path.startswith("/src/"):
        candidate = ROOT / "src" / unquote(path[5:])
        base = ROOT / "src"
    else:
        return None
    try:
        candidate = candidate.resolve(strict=True)
        candidate.relative_to(base.resolve(strict=True))
    except (FileNotFoundError, ValueError):
        return None
    if candidate.suffix.lower() not in ALLOWED[base.name]:
        return None
    return candidate


class RuntimeHandler(BaseHTTPRequestHandler):
    server_version = "FCV588Baseline/1"

    def log_message(self, fmt: str, *args) -> None:
        return

    def _serve(self, head_only: bool) -> None:
        local = resolve_runtime_path(f"http://{HOST}:{PORT}{self.path}")
        if local is None:
            self.send_error(404)
            return
        data = local.read_bytes()
        ctype = {
            ".html": "text/html; charset=utf-8",
            ".mjs": "text/javascript; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".svg": "image/svg+xml",
        }.get(local.suffix.lower(), mimetypes.guess_type(local.name)[0] or "application/octet-stream")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Security-Policy",
                         "default-src 'self'; script-src 'self'; style-src 'self'; "
                         "img-src 'self' data:; connect-src 'none'; object-src 'none'; "
                         "base-uri 'none'; frame-ancestors 'none'")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def do_GET(self) -> None:
        self._serve(False)

    def do_HEAD(self) -> None:
        self._serve(True)

    def do_POST(self) -> None:
        self.send_error(405)


def runtime_state(page) -> dict:
    return page.evaluate("""() => {
      const text = id => document.getElementById(id)?.textContent ?? null;
      const pressed = id => document.getElementById(id)?.getAttribute('aria-pressed');
      const overlay = document.getElementById('lcd-overlay');
      const lcd = document.getElementById('lcd');
      const canvas = document.getElementById('echo-canvas');
      return {
        href: location.href,
        viewport: {width: innerWidth, height: innerHeight, dpr: devicePixelRatio},
        mode: text('mode-state')?.trim(),
        screenTop: text('screen-top')?.trim(),
        demoIndicator: text('demo-indicator')?.trim(),
        depth: text('depth-display')?.trim(),
        depthUnit: text('depth-unit')?.trim(),
        tickCount: text('tick-count')?.trim(),
        eventCount: text('event-count')?.trim(),
        statusLine: text('status-line')?.trim(),
        validationStatus: text('validation-status')?.trim(),
        overlay: {
          hidden: overlay ? overlay.hidden : null,
          title: text('dialog-title')?.trim(),
          layout: overlay?.dataset?.layout ?? null,
        },
        paused: text('btn-pause')?.includes('Tiếp tục') ?? null,
        fixtures: {
          navigation: pressed('btn-nav-fixture'),
          virtualMounting: pressed('btn-mount-fixture'),
          tankenmaruOption: pressed('btn-tankenmaru-fixture'),
          lowBattery: pressed('btn-battery-fixture'),
          systemError: pressed('btn-error-fixture'),
        },
        sourceCue: {
          title: text('source-cue-title')?.trim(),
          detail: text('source-cue-detail')?.trim(),
          hidden: document.getElementById('source-cue')?.hidden ?? null,
        },
        lcd: lcd ? (() => {
          const r = lcd.getBoundingClientRect();
          return {left:r.left, top:r.top, width:r.width, height:r.height};
        })() : null,
        canvas: canvas ? {width:canvas.width, height:canvas.height} : null,
        localStorageKeys: Object.keys(localStorage).sort(),
      };
    }""")


def wait_mode(page, target: str, steps: int) -> None:
    knob = page.locator("#mode-knob")
    knob.scroll_into_view_if_needed()
    knob.focus()
    key = "ArrowRight" if steps > 0 else "ArrowLeft"
    for _ in range(abs(steps)):
        page.keyboard.press(key)
    page.wait_for_timeout(6300)
    actual = page.locator("#mode-state").inner_text().strip()
    if actual != target:
        raise AssertionError(f"MODE commit failed: expected {target}, got {actual}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if not CHROME.is_file():
        raise RuntimeError(f"Chrome unavailable: {CHROME}")

    run_id = datetime.now().astimezone().strftime("%Y%m%dT%H%M%S%z") + "-" + uuid.uuid4().hex[:8]
    prefix = f"fcv588-current-baseline-{run_id}"
    receipt_path = OUT / f"{prefix}.json"

    httpd = ThreadingHTTPServer((HOST, PORT), RuntimeHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.15)

    console_errors: list[dict] = []
    page_errors: list[str] = []
    request_failures: list[str] = []
    loaded: list[dict] = []
    body_errors: list[str] = []
    states: dict[str, dict] = {}
    screenshots: list[dict] = []

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=str(CHROME), headless=False)
            context = browser.new_context(
                viewport=VIEWPORT,
                device_scale_factor=1,
                locale="vi-VN",
            )
            page = context.new_page()
            page.on("console", lambda m: console_errors.append(
                {"type": m.type, "text": m.text}) if m.type == "error" else None)
            page.on("pageerror", lambda e: page_errors.append(str(e)))
            page.on("requestfailed", lambda req: request_failures.append(req.url))

            def on_finished(req) -> None:
                try:
                    resp = req.response()
                    if resp is None:
                        body_errors.append(f"no response: {req.url}")
                        return
                    parsed = urlsplit(resp.url)
                    if (parsed.scheme, parsed.hostname, parsed.port) != ("http", HOST, PORT):
                        return
                    data = resp.body()
                    local = resolve_runtime_path(resp.url)
                    entry = {
                        "url": resp.url,
                        "path": parsed.path,
                        "status": resp.status,
                        "bytes": len(data),
                        "sha256": sha256_bytes(data),
                        "localPath": str(local) if local else None,
                        "localSha256": sha256_file(local) if local else None,
                    }
                    entry["matchesLocal"] = (
                        entry["localSha256"] == entry["sha256"]
                        if entry["localSha256"] else None
                    )
                    loaded.append(entry)
                except Exception as exc:
                    body_errors.append(f"{req.url}: {exc}")

            page.on("requestfinished", on_finished)
            response = page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            if response is None or response.status != 200:
                raise AssertionError("root page did not load HTTP 200")
            page.locator("#key-power").wait_for(state="visible")
            states["initialOff"] = runtime_state(page)

            page.locator("#btn-pause").click()
            page.locator("#key-power").click()
            for _ in range(4):
                page.locator("#btn-step").click()
            page.wait_for_timeout(150)
            if not page.locator("#off-screen").is_hidden():
                raise AssertionError("POWER boot did not reach powered-on LCD")
            if page.locator("#mode-state").inner_text().strip() != "LF":
                raise AssertionError("initial powered-on mode is not LF")

            def capture(label: str) -> None:
                page.evaluate("window.scrollTo(0,0)")
                page.wait_for_timeout(120)
                path = OUT / f"{prefix}-{label}.png"
                page.screenshot(path=str(path), full_page=False)
                states[label] = runtime_state(page)
                screenshots.append({
                    "label": label,
                    "path": str(path),
                    "bytes": path.stat().st_size,
                    "sha256": sha256_file(path),
                })

            capture("LF")

            page.locator("#key-menu").click()
            page.wait_for_timeout(120)
            if page.locator("#lcd-overlay").is_hidden():
                raise AssertionError("MENU did not open LCD overlay")
            capture("MENU")
            page.locator("#key-menu").click()
            page.wait_for_timeout(80)

            wait_mode(page, "DUAL", 1)
            capture("DUAL")
            wait_mode(page, "HF", 1)
            capture("HF")
            wait_mode(page, "NAV2", 2)
            capture("NAV2")
            wait_mode(page, "NAV1", 1)
            capture("NAV1")

            page.wait_for_timeout(250)
            browser.close()

        loaded_sorted = sorted(
            loaded,
            key=lambda e: (e["path"], e["sha256"], e["bytes"]),
        )
        aggregate = sha256_bytes(json.dumps(
            [{k:e[k] for k in ("path","status","bytes","sha256","matchesLocal")}
             for e in loaded_sorted],
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8"))

        receipt = {
            "schema": "fcv588-current-ui-baseline-v1",
            "createdAt": datetime.now().astimezone().isoformat(),
            "scope": "READ_ONLY_SOURCE_RUNTIME_NEW_BASELINE_ARTIFACTS_ONLY",
            "root": str(ROOT),
            "browser": {
                "engine": "Google Chrome via Playwright Python",
                "executable": str(CHROME),
                "headless": False,
                "viewport": VIEWPORT,
                "url": BASE_URL,
            },
            "server": {
                "kind": "test-owned restricted Python ThreadingHTTPServer",
                "host": HOST,
                "port": PORT,
                "servedRoots": ["web", "src"],
            },
            "browserLoadedSource": {
                "responseCount": len(loaded_sorted),
                "aggregateSha256": aggregate,
                "allMatchedLocal": bool(loaded_sorted) and all(
                    e["matchesLocal"] is True for e in loaded_sorted
                ),
                "responses": loaded_sorted,
                "bodyErrors": body_errors,
                "requestFailures": request_failures,
            },
            "consoleErrors": console_errors,
            "pageErrors": page_errors,
            "states": states,
            "screenshots": screenshots,
        }
        receipt_path.write_text(
            json.dumps(receipt, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(json.dumps({
            "receipt": str(receipt_path),
            "receiptSha256": sha256_file(receipt_path),
            "screenshots": screenshots,
            "loadedResponses": len(loaded_sorted),
            "allLoadedMatchedLocal": receipt["browserLoadedSource"]["allMatchedLocal"],
            "consoleErrors": len(console_errors),
            "pageErrors": len(page_errors),
            "bodyErrors": len(body_errors),
            "requestFailures": len(request_failures),
            "modesCaptured": [s["label"] for s in screenshots],
        }, ensure_ascii=False, indent=2))
    finally:
        httpd.shutdown()
        httpd.server_close()


if __name__ == "__main__":
    main()
