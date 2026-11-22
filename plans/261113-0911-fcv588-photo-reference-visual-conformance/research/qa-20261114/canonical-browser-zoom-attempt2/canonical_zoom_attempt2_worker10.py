from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import socket
import threading
import time
import traceback
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
OUT = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/"
    "qa-20261114/canonical-browser-zoom-attempt2"
)
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
HOST = "127.0.0.1"
PORT = 4181
BASE_URL = f"http://{HOST}:{PORT}/"
VIEWPORT = {"width": 1366, "height": 768}
CHOICES = ("Bottom Lock", "Bottom Zoom", "Marker Zoom")
MODES = ("LF-ZOOM", "HF-ZOOM")
ALLOWED = {
    "web": {".html", ".mjs", ".js", ".css", ".svg"},
    "src": {".mjs", ".js"},
}
HASH_EXT = {".mjs", ".js", ".css"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def write_once(path: Path, data: bytes) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)


def resolve_runtime(url: str) -> Path | None:
    path = urlsplit(url).path
    if path == "/":
        return ROOT / "web/index.html"
    if path.startswith("/web/"):
        base = ROOT / "web"
        candidate = base / unquote(path[5:])
    elif path.startswith("/src/"):
        base = ROOT / "src"
        candidate = base / unquote(path[5:])
    else:
        return None
    try:
        real_base = base.resolve(strict=True)
        real = candidate.resolve(strict=True)
        real.relative_to(real_base)
    except (FileNotFoundError, ValueError):
        return None
    if real.suffix.lower() not in ALLOWED[base.name]:
        return None
    return real


class Handler(BaseHTTPRequestHandler):
    server_version = "FCV588CanonicalZoom/1"

    def log_message(self, fmt: str, *args) -> None:
        return

    def _serve(self, head_only: bool) -> None:
        local = resolve_runtime(f"http://{HOST}:{PORT}{self.path}")
        if local is None:
            self.send_response(404)
            self.end_headers()
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


def port_free() -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((HOST, PORT))
        except OSError:
            return False
    return True


def source_manifest() -> list[dict]:
    rows = []
    for folder in ("web", "src"):
        for path in sorted((ROOT / folder).rglob("*")):
            if path.is_file() and path.suffix.lower() in HASH_EXT:
                rows.append({
                    "path": path.relative_to(ROOT).as_posix(),
                    "bytes": path.stat().st_size,
                    "sha256": sha256_file(path),
                })
    return rows


def manifest_sha(rows: list[dict]) -> str:
    return sha256_bytes(json.dumps(
        rows, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def boot(page) -> None:
    page.locator("#btn-pause").click()
    page.locator("#key-power").click()
    for _ in range(4):
        page.locator("#btn-step").click()
    page.wait_for_timeout(160)
    if not page.locator("#off-screen").is_hidden():
        raise AssertionError("boot failed")
    if page.locator("#mode-state").inner_text().strip() != "LF":
        raise AssertionError("fresh mode is not LF")


def select_zoom_mode(page, desired: str) -> dict:
    page.locator("#key-menu").click()
    page.wait_for_timeout(100)
    for _ in range(11):
        page.locator("#pad-down").click()
    selected = page.locator("#dialog-content [aria-current='true']")
    entry_id = selected.get_attribute("data-entry-id")
    row_text = selected.inner_text().strip()
    if entry_id != "sounder.zoomMode":
        raise AssertionError(
            f"Zoom Mode menu navigation failed: id={entry_id!r}, text={row_text!r}")
    page.locator("#key-enter").click()
    page.wait_for_timeout(80)
    option = page.locator("#lcd-menu-options [aria-current='true']")
    current = option.inner_text().strip()
    seen = [current]
    for _ in range(4):
        if current == desired:
            break
        page.locator("#pad-right").click()
        page.wait_for_timeout(50)
        current = page.locator(
            "#lcd-menu-options [aria-current='true']").inner_text().strip()
        seen.append(current)
    if current != desired:
        raise AssertionError(
            f"cannot select {desired!r}; current={current!r}, seen={seen!r}")
    page.locator("#key-enter").click()
    page.wait_for_timeout(80)
    page.locator("#key-menu").click()
    page.wait_for_timeout(80)
    if not page.locator("#lcd-overlay").is_hidden():
        raise AssertionError("menu did not close after zoom commit")
    return {"rowText": row_text, "choiceSeen": seen, "committed": desired}


def select_display_mode(page, target: str) -> None:
    knob = page.locator("#mode-knob")
    knob.scroll_into_view_if_needed()
    knob.focus()
    steps = -1 if target == "LF-ZOOM" else 3
    key = "ArrowLeft" if steps < 0 else "ArrowRight"
    for _ in range(abs(steps)):
        page.keyboard.press(key)
    page.wait_for_timeout(6300)
    actual = page.locator("#mode-state").inner_text().strip()
    if actual != target:
        raise AssertionError(f"mode expected {target}, got {actual}")


def expected_header(mode: str, zoom: str) -> str:
    prefix = {
        "Bottom Lock": "BL",
        "Bottom Zoom": "BZ",
        "Marker Zoom": "MZ",
    }[zoom]
    freq = "LF" if mode == "LF-ZOOM" else "HF"
    return f"AUTO_R   G:AF   {prefix}-{freq}   x1"


def run_case(browser, prefix: str, mode: str, zoom: str) -> dict:
    label = f"{mode}-{zoom.replace(' ', '-')}"
    result = {
        "label": label,
        "mode": mode,
        "zoomMode": zoom,
        "status": "NOT_RUN",
        "consoleErrors": [],
        "pageErrors": [],
        "requestFailures": [],
        "externalRequests": [],
        "bodyErrors": [],
        "loadedBodies": [],
        "failure": None,
    }
    context = None
    try:
        context = browser.new_context(
            viewport=VIEWPORT, device_scale_factor=1, locale="vi-VN")
        page = context.new_page()
        origin = urlsplit(BASE_URL)
        loaded = []
        page.on("console", lambda m: result["consoleErrors"].append(
            {"type":m.type,"text":m.text}) if m.type == "error" else None)
        page.on("pageerror", lambda e: result["pageErrors"].append(str(e)))
        page.on("requestfailed", lambda req: result["requestFailures"].append(req.url))
        page.on("request", lambda req: result["externalRequests"].append(req.url)
                if (urlsplit(req.url).scheme, urlsplit(req.url).hostname,
                    urlsplit(req.url).port) !=
                   (origin.scheme, origin.hostname, origin.port) else None)

        def record(req) -> None:
            try:
                resp = req.response()
                if resp is None:
                    result["bodyErrors"].append(f"no response: {req.url}")
                    return
                parsed = urlsplit(resp.url)
                if (parsed.scheme, parsed.hostname, parsed.port) != (
                        origin.scheme, origin.hostname, origin.port):
                    return
                local = resolve_runtime(resp.url)
                if local is None or local.suffix.lower() not in HASH_EXT:
                    return
                body = resp.body()
                body_sha = sha256_bytes(body)
                source_sha = sha256_file(local)
                loaded.append({
                    "path":local.relative_to(ROOT).as_posix(),
                    "bodySha256":body_sha,
                    "sourceSha256":source_sha,
                    "matchesSource":body_sha == source_sha,
                })
            except Exception as exc:
                result["bodyErrors"].append(f"{req.url}: {exc}")

        page.on("requestfinished", record)
        response = page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        if response is None or response.status != 200:
            raise AssertionError("root load failed")
        boot(page)
        result["menuProof"] = select_zoom_mode(page, zoom)
        select_display_mode(page, mode)
        header_node = page.locator("#screen-top")
        header_text_content = header_node.text_content()
        header_inner_text = header_node.inner_text().strip()
        wanted = expected_header(mode, zoom)
        if header_text_content != wanted:
            raise AssertionError(
                f"textContent expected {wanted!r}, got {header_text_content!r}")
        normalized_expected = " ".join(wanted.split())
        normalized_inner = " ".join(header_inner_text.split())
        if normalized_inner != normalized_expected:
            raise AssertionError(
                f"semantic header expected {normalized_expected!r}, got {normalized_inner!r}")
        shot = OUT / f"{prefix}-{label}.png"
        if shot.exists():
            raise FileExistsError(f"write-once screenshot exists: {shot}")
        page.evaluate("window.scrollTo(0,0)")
        page.wait_for_timeout(120)
        page.screenshot(path=str(shot), full_page=False)
        result["screenshot"] = {
            "path":str(shot),
            "bytes":shot.stat().st_size,
            "sha256":sha256_file(shot),
        }
        result["proof"] = {
            "modeActual": page.locator("#mode-state").inner_text().strip(),
            "headerTextContent": header_text_content,
            "headerInnerText": header_inner_text,
            "headerExpectedTextContent": wanted,
            "headerNormalizedExpected": normalized_expected,
            "headerNormalizedInnerText": normalized_inner,
            "overlayHidden": page.locator("#lcd-overlay").is_hidden(),
            "tickCount": page.locator("#tick-count").inner_text().strip(),
            "eventCount": page.locator("#event-count").inner_text().strip(),
        }
        loaded = sorted(loaded, key=lambda x:(x["path"],x["bodySha256"]))
        result["loadedBodies"] = loaded
        result["loadedBodiesAllMatchedSource"] = (
            bool(loaded) and all(x["matchesSource"] for x in loaded))
        failures = []
        if not result["loadedBodiesAllMatchedSource"]:
            failures.append("loaded body/source SHA mismatch")
        if result["consoleErrors"]:
            failures.append("console errors")
        if result["pageErrors"]:
            failures.append("page errors")
        if result["requestFailures"]:
            failures.append("request failures")
        if result["externalRequests"]:
            failures.append("external requests")
        if result["bodyErrors"]:
            failures.append("body read errors")
        result["objectiveFailures"] = failures
        result["status"] = "PASS" if not failures else "FAILED"
    except Exception as exc:
        result["status"] = "FAILED"
        result["failure"] = {
            "error":str(exc),
            "traceback":traceback.format_exc(),
        }
        result["objectiveFailures"] = [str(exc)]
    finally:
        if context is not None:
            context.close()
    return result


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    run_id = (datetime.now().astimezone().strftime("%Y%m%dT%H%M%S%z")
              + "-" + uuid.uuid4().hex[:8])
    prefix = f"fcv588-canonical-zoom-attempt2-{run_id}"
    receipt_path = OUT / f"{prefix}.json"
    log_path = OUT / f"{prefix}.log.txt"
    manifest_path = OUT / f"{prefix}-sha256.txt"
    logs = []
    before = source_manifest()
    receipt = {
        "schema":"fcv588-canonical-zoom-attempt2-qa-v1",
        "createdAt":datetime.now().astimezone().isoformat(),
        "root":str(ROOT),
        "viewport":VIEWPORT,
        "browser":{"executable":str(CHROME),"headless":False},
        "server":{"host":HOST,"port":PORT,"url":BASE_URL},
        "sourceManifestBefore":{
            "files":len(before),"sha256":manifest_sha(before)},
        "cases":[],
        "sourceTreeStable":False,
        "objectiveFailures":[],
        "overallStatus":"NOT_RUN",
    }
    httpd = None
    browser = None
    try:
        if not CHROME.is_file():
            raise RuntimeError("Chrome unavailable")
        if not port_free():
            raise RuntimeError(f"port occupied: {PORT}")
        httpd = ThreadingHTTPServer((HOST, PORT), Handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        time.sleep(0.15)
        logs.append(f"SERVER_READY {BASE_URL}")
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                executable_path=str(CHROME), headless=False)
            receipt["browser"]["version"] = browser.version
            for zoom in CHOICES:
                for mode in MODES:
                    case = run_case(browser, prefix, mode, zoom)
                    receipt["cases"].append(case)
                    logs.append(
                        f"CASE {mode} / {zoom} => {case['status']}")
                    if case["status"] != "PASS":
                        receipt["objectiveFailures"].extend(
                            f"{mode}/{zoom}: {x}"
                            for x in case.get("objectiveFailures", []))
            browser.close()
            browser = None
        after = source_manifest()
        receipt["sourceManifestAfter"] = {
            "files":len(after),"sha256":manifest_sha(after)}
        receipt["sourceTreeStable"] = before == after
        if not receipt["sourceTreeStable"]:
            receipt["objectiveFailures"].append(
                "canonical JS/CSS source changed during zoom QA")
        receipt["overallStatus"] = (
            "PASS"
            if len(receipt["cases"]) == 6
            and all(c["status"] == "PASS" for c in receipt["cases"])
            and receipt["sourceTreeStable"]
            and not receipt["objectiveFailures"]
            else "FAILED"
        )
    except Exception as exc:
        receipt["overallStatus"] = "FAILED"
        receipt["objectiveFailures"].append(str(exc))
        receipt["fatalError"] = {
            "error":str(exc),"traceback":traceback.format_exc()}
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception as exc:
                receipt["objectiveFailures"].append(f"browser cleanup: {exc}")
        if httpd is not None:
            try:
                httpd.shutdown()
                httpd.server_close()
                logs.append("SERVER_SHUTDOWN PASS")
            except Exception as exc:
                receipt["objectiveFailures"].append(f"server cleanup: {exc}")
                receipt["overallStatus"] = "FAILED"
        receipt["finishedAt"] = datetime.now().astimezone().isoformat()
        data = (json.dumps(receipt,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
        write_once(receipt_path,data)
        logs.append(f"RECEIPT_SHA256 {sha256_bytes(data)}")
        write_once(log_path,("\n".join(logs)+"\n").encode("utf-8"))
        artifacts = sorted(
            p for p in OUT.iterdir()
            if p.is_file() and (p.name.startswith(prefix)
                                or p.name in ("canonical_zoom_attempt2_worker10.py","build_attempt2_harness.py")))
        lines = [f"{sha256_file(p)} *{p.name}" for p in artifacts]
        write_once(manifest_path,("\n".join(lines)+"\n").encode("ascii"))
        print(json.dumps({
            "overallStatus":receipt["overallStatus"],
            "objectiveFailures":receipt["objectiveFailures"],
            "receipt":str(receipt_path),
            "receiptSha256":sha256_file(receipt_path),
            "manifest":str(manifest_path),
            "manifestSha256":sha256_file(manifest_path),
            "cases":[{
                "mode":c["mode"],"zoomMode":c["zoomMode"],
                "status":c["status"],
                "screenshot":c.get("screenshot",{}).get("sha256"),
                "headerTextContent":c.get("proof",{}).get("headerTextContent"),
                "headerInnerText":c.get("proof",{}).get("headerInnerText"),
            } for c in receipt["cases"]],
        },ensure_ascii=False,indent=2))
    return 0 if receipt["overallStatus"]=="PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
