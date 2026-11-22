from __future__ import annotations

import hashlib
import json
import mimetypes
import socket
import threading
import time
import traceback
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-visual-20261114"
OUT = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114/stage-browser"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
HOST = "127.0.0.1"
PORT = 4177
BASE_URL = f"http://{HOST}:{PORT}/"
VIEWPORTS = ((1366, 768), (375, 812), (1920, 1080))
PHOTO_NAMES = ("giaoDien.jpg", "lf.jpg", "hf.jpg", "dual.jpg",
               "zoom.jpg", "zoom2.jpg", "nav1.jpg", "nav2.jpg")
ALLOWED = {
    "web": {".html", ".mjs", ".js", ".css", ".svg"},
    "src": {".mjs", ".js"},
}
SOURCE_HASH_EXTENSIONS = {".mjs", ".js", ".css"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def js_css_manifest() -> list[dict]:
    rows = []
    for folder in ("web", "src"):
        base = STAGE / folder
        for path in sorted(base.rglob("*")):
            if path.is_file() and path.suffix.lower() in SOURCE_HASH_EXTENSIONS:
                rows.append({
                    "path": path.relative_to(STAGE).as_posix(),
                    "bytes": path.stat().st_size,
                    "sha256": sha256_file(path),
                })
    return rows


def manifest_sha(rows: list[dict]) -> str:
    return sha256_bytes(json.dumps(
        rows, sort_keys=True, separators=(",", ":")
    ).encode("utf-8"))


def resolve_runtime_path(url: str) -> Path | None:
    parsed = urlsplit(url)
    path = parsed.path
    if path == "/":
        return STAGE / "web/index.html"
    if path.startswith("/web/"):
        base = STAGE / "web"
        candidate = base / unquote(path[5:])
    elif path.startswith("/src/"):
        base = STAGE / "src"
        candidate = base / unquote(path[5:])
    else:
        return None
    try:
        real_base = base.resolve(strict=True)
        real_candidate = candidate.resolve(strict=True)
        real_candidate.relative_to(real_base)
    except (FileNotFoundError, ValueError):
        return None
    if real_candidate.suffix.lower() not in ALLOWED[base.name]:
        return None
    return real_candidate


class RuntimeHandler(BaseHTTPRequestHandler):
    server_version = "FCV588StageBrowserQA/1"

    def log_message(self, fmt: str, *args) -> None:
        return

    def _serve(self, head_only: bool) -> None:
        local = resolve_runtime_path(f"http://{HOST}:{PORT}{self.path}")
        if local is None:
            self.send_response(404)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if not head_only:
                self.wfile.write(b"Not found")
            return
        data = local.read_bytes()
        ctype = {
            ".html": "text/html; charset=utf-8",
            ".mjs": "text/javascript; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".svg": "image/svg+xml",
        }.get(local.suffix.lower(),
              mimetypes.guess_type(local.name)[0] or "application/octet-stream")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Security-Policy",
                         "default-src 'self'; script-src 'self'; style-src 'self'; "
                         "img-src 'self' data:; connect-src 'none'; object-src 'none'; "
                         "base-uri 'none'; frame-ancestors 'none'")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def do_GET(self) -> None:
        self._serve(False)

    def do_HEAD(self) -> None:
        self._serve(True)

    def do_POST(self) -> None:
        self.send_response(405)
        self.end_headers()


def port_is_free() -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((HOST, PORT))
        except OSError:
            return False
    return True


def runtime_state(page) -> dict:
    return page.evaluate("""() => {
      const text = id => document.getElementById(id)?.textContent?.trim() ?? null;
      const overlay = document.getElementById('lcd-overlay');
      const lcd = document.getElementById('lcd');
      const frame = document.querySelector('.device-frame');
      const body = document.documentElement;
      const rect = el => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {left:r.left, top:r.top, right:r.right, bottom:r.bottom,
                width:r.width, height:r.height};
      };
      return {
        href: location.href,
        viewport: {width:innerWidth, height:innerHeight, dpr:devicePixelRatio},
        scroll: {x:scrollX, y:scrollY, width:body.scrollWidth, height:body.scrollHeight},
        mode: text('mode-state'),
        screenTop: text('screen-top'),
        depth: text('depth-display'),
        depthUnit: text('depth-unit'),
        tickCount: text('tick-count'),
        eventCount: text('event-count'),
        statusLine: text('status-line'),
        paused: text('btn-pause')?.includes('Tiếp tục') ?? null,
        overlay: {
          hidden: overlay ? overlay.hidden : null,
          title: text('dialog-title'),
          layout: overlay?.dataset?.layout ?? null,
        },
        sourceCue: {
          hidden: document.getElementById('source-cue')?.hidden ?? null,
          title: text('source-cue-title'),
          detail: text('source-cue-detail'),
        },
        geometry: {lcd:rect(lcd), deviceFrame:rect(frame)},
        canvas: (() => {
          const c=document.getElementById('echo-canvas');
          return c ? {width:c.width,height:c.height} : null;
        })(),
        localStorageKeys: Object.keys(localStorage).sort(),
      };
    }""")


def move_to_mode(page, target: str, steps: int) -> None:
    knob = page.locator("#mode-knob")
    knob.scroll_into_view_if_needed()
    knob.focus()
    key = "ArrowRight" if steps > 0 else "ArrowLeft"
    for _ in range(abs(steps)):
        page.keyboard.press(key)
    page.wait_for_timeout(6300)
    actual = page.locator("#mode-state").inner_text().strip()
    if actual != target:
        raise AssertionError(f"MODE commit expected {target}, got {actual}")


def screenshot_viewport(page, path: Path, *, mobile: bool) -> dict:
    if mobile:
        page.locator(".device-frame").scroll_into_view_if_needed()
    else:
        page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(120)
    page.screenshot(path=str(path), full_page=False)
    return {
        "path": str(path),
        "bytes": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def boot_clean_page(page) -> None:
    page.locator("#key-power").wait_for(state="visible")
    page.locator("#btn-pause").click()
    page.locator("#key-power").click()
    for _ in range(4):
        page.locator("#btn-step").click()
    page.wait_for_timeout(150)
    if not page.locator("#off-screen").is_hidden():
        raise AssertionError("POWER boot did not reach powered-on LCD")
    if page.locator("#mode-state").inner_text().strip() != "LF":
        raise AssertionError("fresh powered-on mode is not LF")


def run_viewport(browser, width: int, height: int, prefix: str) -> dict:
    label = f"{width}x{height}"
    result = {
        "viewport": {"width": width, "height": height},
        "status": "NOT_RUN",
        "states": {},
        "screenshots": [],
        "consoleErrors": [],
        "pageErrors": [],
        "requestFailures": [],
        "networkResponses": [],
        "externalRequests": [],
        "loadedJsCss": [],
        "loadedJsCssAggregateSha256": None,
        "loadedJsCssAllMatchedStage": False,
        "failure": None,
    }
    context = None
    try:
        context = browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=1,
            locale="vi-VN",
        )
        page = context.new_page()
        origin = urlsplit(BASE_URL)
        body_errors: list[str] = []
        loaded: list[dict] = []
        result["bodyErrors"] = body_errors

        page.on("console", lambda m: result["consoleErrors"].append(
            {"type":m.type,"text":m.text}) if m.type == "error" else None)
        page.on("pageerror", lambda e: result["pageErrors"].append(str(e)))
        page.on("requestfailed", lambda req: result["requestFailures"].append(req.url))
        page.on("request", lambda req: result["externalRequests"].append(req.url)
                if (urlsplit(req.url).scheme, urlsplit(req.url).hostname,
                    urlsplit(req.url).port) !=
                   (origin.scheme, origin.hostname, origin.port) else None)
        page.on("response", lambda resp: result["networkResponses"].append({
            "url":resp.url,"status":resp.status,
        }))

        def record_finished(req) -> None:
            try:
                resp = req.response()
                if resp is None:
                    body_errors.append(f"no response for {req.url}")
                    return
                parsed = urlsplit(resp.url)
                if (parsed.scheme, parsed.hostname, parsed.port) != (
                        origin.scheme, origin.hostname, origin.port):
                    return
                local = resolve_runtime_path(resp.url)
                if local is None or local.suffix.lower() not in SOURCE_HASH_EXTENSIONS:
                    return
                raw = resp.body()
                local_sha = sha256_file(local)
                loaded.append({
                    "url":resp.url,
                    "path":local.relative_to(STAGE).as_posix(),
                    "status":resp.status,
                    "bytes":len(raw),
                    "sha256":sha256_bytes(raw),
                    "stageSha256":local_sha,
                    "matchesStage":sha256_bytes(raw) == local_sha,
                })
            except Exception as exc:
                body_errors.append(f"{req.url}: {exc}")

        page.on("requestfinished", record_finished)
        response = page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        if response is None or response.status != 200:
            raise AssertionError("root page did not load HTTP 200")
        initial = runtime_state(page)
        if initial["viewport"] != {"width":width,"height":height,"dpr":1}:
            raise AssertionError(f"actual viewport mismatch: {initial['viewport']}")
        if initial["canvas"] != {"width":480,"height":640}:
            raise AssertionError(f"logical canvas mismatch: {initial['canvas']}")
        result["initialState"] = initial
        boot_clean_page(page)

        def capture(state_label: str, expected_mode: str,
                    *, menu_expected: bool = False) -> None:
            item = {"status":"NOT_RUN","expectedMode":expected_mode}
            result["states"][state_label] = item
            try:
                state = runtime_state(page)
                if state["mode"] != expected_mode:
                    raise AssertionError(
                        f"{state_label}: expected mode {expected_mode}, got {state['mode']}")
                if menu_expected:
                    if state["overlay"]["hidden"] is not False:
                        raise AssertionError("MENU overlay is hidden")
                    if not state["overlay"]["title"]:
                        raise AssertionError("MENU overlay title is empty")
                else:
                    if state["overlay"]["hidden"] is not True:
                        raise AssertionError(
                            f"{state_label}: unexpected overlay {state['overlay']}")
                shot_path = OUT / f"{prefix}-{label}-{state_label}.png"
                shot = screenshot_viewport(page, shot_path, mobile=width <= 700)
                item.update({"status":"PASS","state":runtime_state(page),
                             "screenshot":shot})
                result["screenshots"].append(
                    {"label":state_label, **shot})
            except Exception as exc:
                item.update({"status":"FAILED","error":str(exc),
                             "traceback":traceback.format_exc()})
                raise

        sequence_failed = False
        try:
            capture("LF", "LF")
            page.locator("#key-menu").scroll_into_view_if_needed()
            page.locator("#key-menu").click()
            page.wait_for_timeout(120)
            capture("MENU", "LF", menu_expected=True)
            page.locator("#key-menu").click()
            page.wait_for_timeout(80)
            move_to_mode(page, "DUAL", 1)
            capture("DUAL", "DUAL")
            move_to_mode(page, "HF", 1)
            capture("HF", "HF")
            move_to_mode(page, "NAV2", 2)
            capture("NAV2", "NAV2")
            move_to_mode(page, "NAV1", 1)
            capture("NAV1", "NAV1")
        except Exception as exc:
            sequence_failed = True
            result["failure"] = {
                "error":str(exc),
                "traceback":traceback.format_exc(),
            }
            for name in ("LF","MENU","DUAL","HF","NAV2","NAV1"):
                result["states"].setdefault(name, {
                    "status":"NOT_RUN",
                    "error":"prior viewport sequence failure",
                })

        page.wait_for_timeout(200)
        loaded_sorted = sorted(
            loaded, key=lambda row:(row["path"],row["sha256"],row["bytes"]))
        result["loadedJsCss"] = loaded_sorted
        result["loadedJsCssAggregateSha256"] = sha256_bytes(json.dumps(
            [{k:r[k] for k in ("path","status","bytes","sha256","matchesStage")}
             for r in loaded_sorted],
            sort_keys=True, separators=(",", ":")
        ).encode("utf-8"))
        result["loadedJsCssAllMatchedStage"] = (
            bool(loaded_sorted) and all(r["matchesStage"] for r in loaded_sorted))
        bad_http = [r for r in result["networkResponses"] if r["status"] >= 400]
        all_states_pass = all(
            result["states"].get(name,{}).get("status") == "PASS"
            for name in ("LF","MENU","DUAL","HF","NAV2","NAV1"))
        clean = (
            all_states_pass
            and result["loadedJsCssAllMatchedStage"]
            and not result["consoleErrors"]
            and not result["pageErrors"]
            and not result["requestFailures"]
            and not result["externalRequests"]
            and not body_errors
            and not bad_http
            and not sequence_failed
        )
        result["badHttpResponses"] = bad_http
        result["status"] = "PASS" if clean else "FAILED"
    except Exception as exc:
        result["status"] = "FAILED"
        result["failure"] = {
            "error":str(exc),
            "traceback":traceback.format_exc(),
        }
    finally:
        if context is not None:
            try:
                context.close()
            except Exception as exc:
                result.setdefault("cleanupErrors",[]).append(str(exc))
                result["status"] = "FAILED"
    return result


def test_photo_denials() -> dict:
    rows = []
    for name in PHOTO_NAMES:
        path = f"/sources/FCV588_GiaoDienThucTeMay2016/{name}"
        url = BASE_URL.rstrip("/") + path
        row = {"name":name,"path":path,"url":url,"statusCode":None,
               "status":"FAILED","error":None}
        try:
            with urlopen(url, timeout=5) as resp:
                row["statusCode"] = resp.status
                row["status"] = "PASS" if resp.status in (403,404) else "FAILED"
        except HTTPError as exc:
            row["statusCode"] = exc.code
            row["status"] = "PASS" if exc.code in (403,404) else "FAILED"
        except URLError as exc:
            row["error"] = str(exc)
        rows.append(row)
    return {
        "status":"PASS" if all(r["status"]=="PASS" for r in rows) else "FAILED",
        "paths":rows,
    }


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    run_id = (datetime.now().astimezone().strftime("%Y%m%dT%H%M%S%z")
              + "-" + uuid.uuid4().hex[:8])
    prefix = f"fcv588-stage-browser-qa-{run_id}"
    receipt_path = OUT / f"{prefix}.json"
    log_path = OUT / f"{prefix}.log.txt"
    logs: list[str] = []
    receipt = {
        "schema":"fcv588-stage-browser-qa-v1",
        "createdAt":datetime.now().astimezone().isoformat(),
        "scope":"STAGING_READ_ONLY_SOURCE_RUNTIME_NEW_QA_ARTIFACTS_ONLY",
        "stageRoot":str(STAGE),
        "outputDir":str(OUT),
        "server":{"host":HOST,"port":PORT,"url":BASE_URL,
                  "kind":"test-owned restricted Python ThreadingHTTPServer"},
        "browser":{"executable":str(CHROME),"headless":False},
        "overallStatus":"NOT_RUN",
        "httpPhotoDeny":{"status":"NOT_RUN","paths":[]},
        "viewports":[],
        "sourceManifestBefore":None,
        "sourceManifestAfter":None,
        "sourceTreeStable":False,
        "fatalError":None,
    }
    httpd = None
    browser = None
    try:
        if not STAGE.is_dir():
            raise RuntimeError(f"staging missing: {STAGE}")
        if not CHROME.is_file():
            raise RuntimeError(f"Chrome unavailable: {CHROME}")
        if not port_is_free():
            raise RuntimeError(f"test-owned port not free: {PORT}")
        before = js_css_manifest()
        receipt["sourceManifestBefore"] = {
            "files":len(before),"sha256":manifest_sha(before),"entries":before}
        httpd = ThreadingHTTPServer((HOST, PORT), RuntimeHandler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        time.sleep(0.15)
        logs.append(f"SERVER_READY {BASE_URL}")
        receipt["httpPhotoDeny"] = test_photo_denials()

        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                executable_path=str(CHROME), headless=False)
            receipt["browser"]["version"] = browser.version
            for width,height in VIEWPORTS:
                logs.append(f"VIEWPORT_START {width}x{height}")
                vp = run_viewport(browser,width,height,prefix)
                receipt["viewports"].append(vp)
                logs.append(f"VIEWPORT_END {width}x{height} {vp['status']}")
            browser.close()
            browser = None

        after = js_css_manifest()
        receipt["sourceManifestAfter"] = {
            "files":len(after),"sha256":manifest_sha(after),"entries":after}
        receipt["sourceTreeStable"] = before == after
        vp_statuses = [v["status"] for v in receipt["viewports"]]
        if (receipt["httpPhotoDeny"]["status"]=="PASS"
                and receipt["sourceTreeStable"]
                and vp_statuses == ["PASS","PASS","PASS"]):
            receipt["overallStatus"] = "PASS"
        else:
            receipt["overallStatus"] = "FAILED"
    except Exception as exc:
        receipt["overallStatus"] = "FAILED"
        receipt["fatalError"] = {
            "error":str(exc),"traceback":traceback.format_exc()}
        logs.append(f"FATAL {exc}")
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception as exc:
                logs.append(f"BROWSER_CLEANUP_ERROR {exc}")
        if httpd is not None:
            try:
                httpd.shutdown()
                httpd.server_close()
                logs.append("SERVER_SHUTDOWN PASS")
            except Exception as exc:
                logs.append(f"SERVER_SHUTDOWN FAILED {exc}")
                receipt["overallStatus"] = "FAILED"
        if receipt["sourceManifestAfter"] is None and STAGE.is_dir():
            try:
                after = js_css_manifest()
                receipt["sourceManifestAfter"] = {
                    "files":len(after),"sha256":manifest_sha(after),"entries":after}
                before_entries=(receipt.get("sourceManifestBefore") or {}).get("entries")
                receipt["sourceTreeStable"] = before_entries == after
            except Exception as exc:
                logs.append(f"POST_MANIFEST_ERROR {exc}")
        receipt["finishedAt"] = datetime.now().astimezone().isoformat()
        receipt_path.write_text(json.dumps(
            receipt, ensure_ascii=False, indent=2), encoding="utf-8")
        logs.append(f"RECEIPT {receipt_path}")
        logs.append(f"RECEIPT_SHA256 {sha256_file(receipt_path)}")
        log_path.write_text("\n".join(logs)+"\n",encoding="utf-8")
        print(json.dumps({
            "overallStatus":receipt["overallStatus"],
            "receipt":str(receipt_path),
            "receiptSha256":sha256_file(receipt_path),
            "log":str(log_path),
            "logSha256":sha256_file(log_path),
            "httpPhotoDeny":receipt["httpPhotoDeny"]["status"],
            "sourceTreeStable":receipt["sourceTreeStable"],
            "sourceManifestSha256":(
                receipt["sourceManifestAfter"] or {}).get("sha256"),
            "viewports":[{
                "viewport":v["viewport"],
                "status":v["status"],
                "screenshots":len(v["screenshots"]),
                "loadedJsCss":len(v["loadedJsCss"]),
                "loadedJsCssAllMatchedStage":v["loadedJsCssAllMatchedStage"],
                "consoleErrors":len(v["consoleErrors"]),
                "pageErrors":len(v["pageErrors"]),
                "requestFailures":len(v["requestFailures"]),
                "externalRequests":len(v["externalRequests"]),
                "bodyErrors":len(v.get("bodyErrors",[])),
            } for v in receipt["viewports"]],
        },ensure_ascii=False,indent=2))
    return 0 if receipt["overallStatus"]=="PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
