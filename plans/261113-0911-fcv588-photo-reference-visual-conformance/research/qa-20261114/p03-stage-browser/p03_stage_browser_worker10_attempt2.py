from __future__ import annotations

import hashlib
import json
import os
import socket
import subprocess
import time
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-echo-20261114"
OUT = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261114/p03-stage-browser"
)
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
NODE = Path(r"C:\nvm4w\nodejs\node.exe")
SERVER = STAGE / "tools/server.mjs"
RASTERIZER = STAGE / "web/fcv588-echo-rasterizer.mjs"
HOST = "127.0.0.1"
PORT = 4184
BASE_URL = f"http://{HOST}:{PORT}/"
PHOTO_NAMES = (
    "giaoDien.jpg", "lf.jpg", "hf.jpg", "dual.jpg",
    "zoom.jpg", "zoom2.jpg", "nav1.jpg", "nav2.jpg",
)
HASH_EXTENSIONS = {".mjs", ".js", ".css"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def write_once_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)


def write_once_json(path: Path, value) -> None:
    write_once_bytes(
        path, (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    )


def port_is_free() -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((HOST, PORT))
            return True
        except OSError:
            return False


def source_manifest() -> list[dict]:
    rows = []
    for folder in ("web", "src"):
        base = STAGE / folder
        for path in sorted(base.rglob("*")):
            if path.is_file() and path.suffix.lower() in HASH_EXTENSIONS:
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
    path = urlsplit(url).path
    if path == "/":
        return STAGE / "web/index.html"
    if path.startswith("/web/"):
        base = STAGE / "web"
        candidate = base / path[5:]
    elif path.startswith("/src/"):
        base = STAGE / "src"
        candidate = base / path[5:]
    else:
        return None
    try:
        real_base = base.resolve(strict=True)
        real = candidate.resolve(strict=True)
        real.relative_to(real_base)
    except (FileNotFoundError, ValueError):
        return None
    return real


def wait_server(process: subprocess.Popen, timeout_s: float = 8.0) -> None:
    deadline = time.time() + timeout_s
    last_error = None
    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"strict server exited early: {process.returncode}")
        try:
            with urlopen(BASE_URL, timeout=1.0) as response:
                if response.status == 200:
                    return
        except Exception as exc:
            last_error = exc
        time.sleep(0.15)
    raise RuntimeError(f"strict server not ready: {last_error}")


def deny_oem_photos() -> dict:
    rows = []
    for name in PHOTO_NAMES:
        path = f"/sources/FCV588_GiaoDienThucTeMay2016/{name}"
        url = BASE_URL.rstrip("/") + path
        row = {"name": name, "url": url, "statusCode": None,
               "status": "FAILED", "error": None}
        try:
            with urlopen(url, timeout=3) as response:
                row["statusCode"] = response.status
        except HTTPError as exc:
            row["statusCode"] = exc.code
        except URLError as exc:
            row["error"] = str(exc)
        if row["statusCode"] in (403, 404):
            row["status"] = "PASS"
        rows.append(row)
    return {
        "status": "PASS" if all(row["status"] == "PASS" for row in rows)
        else "FAILED",
        "paths": rows,
    }


def boot(page) -> None:
    page.locator("#key-power").wait_for(state="visible")
    page.locator("#btn-pause").click()
    page.locator("#key-power").click()
    for _ in range(4):
        page.locator("#btn-step").click()
    page.wait_for_timeout(160)
    if not page.locator("#off-screen").is_hidden():
        raise AssertionError("POWER boot did not reach powered-on LCD")
    if page.locator("#mode-state").inner_text().strip() != "LF":
        raise AssertionError("fresh powered-on mode is not LF")


def move_mode(page, target: str, steps: int) -> None:
    knob = page.locator("#mode-knob")
    knob.scroll_into_view_if_needed()
    knob.focus()
    key = "ArrowRight" if steps > 0 else "ArrowLeft"
    for _ in range(abs(steps)):
        page.keyboard.press(key)
    page.wait_for_timeout(6300)
    actual = page.locator("#mode-state").inner_text().strip()
    if actual != target:
        raise AssertionError(f"MODE expected {target}, got {actual}")


def select_bottom_lock(page) -> dict:
    page.locator("#key-menu").click()
    page.wait_for_timeout(80)
    for _ in range(11):
        page.locator("#pad-down").click()
    row = page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
    row_text = row.inner_text().strip()
    if "Zoom Mode" not in row_text:
        raise AssertionError(f"Zoom Mode row not reached: {row_text!r}")
    page.locator("#key-enter").click()
    page.wait_for_timeout(60)
    current = page.locator("#lcd-menu-options [aria-current='true']").inner_text().strip()
    seen = [current]
    for _ in range(4):
        if current == "Bottom Lock":
            break
        page.locator("#pad-left").click()
        page.wait_for_timeout(40)
        current = page.locator(
            "#lcd-menu-options [aria-current='true']").inner_text().strip()
        seen.append(current)
    if current != "Bottom Lock":
        raise AssertionError(f"Bottom Lock not selectable; seen={seen!r}")
    page.locator("#key-enter").click()
    page.wait_for_timeout(60)
    page.locator("#key-menu").click()
    page.wait_for_timeout(60)
    if not page.locator("#lcd-overlay").is_hidden():
        raise AssertionError("Zoom Mode menu did not close")
    return {"row": row_text, "choicesSeen": seen, "committed": current}


def select_white_palette(page) -> dict:
    page.locator("#key-menu").click()
    page.locator("#pad-right").click()
    page.wait_for_timeout(80)
    title = page.locator("#dialog-title").inner_text().strip()
    if title not in ("Display", "Display / MENU"):
        raise AssertionError(f"Display menu inaccessible: {title!r}")
    for _ in range(9):
        page.locator("#pad-down").click()
    row = page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
    before = row.inner_text().strip()
    if "Palette : Blue" not in before:
        raise AssertionError(f"default Blue palette row not found: {before!r}")
    page.locator("#key-enter").click()
    page.locator("#pad-left").click()
    option = page.locator("#lcd-menu-options [aria-current='true']").inner_text().strip()
    if option != "White":
        raise AssertionError(f"Blue -> White palette draft failed: {option!r}")
    page.locator("#key-enter").click()
    page.locator("#key-menu").click()
    page.wait_for_timeout(100)
    ink = page.evaluate("""() => ({
      caption:getComputedStyle(document.querySelector('#screen-top')).color,
      depth:getComputedStyle(document.querySelector('.depth-indicator')).color,
    })""")
    if ink != {"caption": "rgb(16, 38, 49)", "depth": "rgb(16, 38, 49)"}:
        raise AssertionError(f"White palette contrast ink mismatch: {ink}")
    return {"before": before, "committed": option, "ink": ink}


def page_state(page) -> dict:
    return page.evaluate("""() => ({
      href:location.href,
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      scrollWidth:document.documentElement.scrollWidth,
      scrollHeight:document.documentElement.scrollHeight,
      mode:document.getElementById('mode-state').textContent.trim(),
      header:document.getElementById('screen-top').textContent,
      tick:document.getElementById('tick-count').textContent.trim(),
      events:document.getElementById('event-count').textContent.trim(),
      overlayHidden:document.getElementById('lcd-overlay').hidden,
      canvas:{
        width:document.getElementById('echo-canvas').width,
        height:document.getElementById('echo-canvas').height
      },
      storageKeys:Object.keys(localStorage).sort(),
    })""")


def screenshot_once(page, path: Path, mobile: bool) -> dict:
    if path.exists():
        raise FileExistsError(f"write-once screenshot exists: {path}")
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


def new_case(browser, *, width: int, height: int, prefix: str,
             name: str, setup) -> dict:
    result = {
        "name": name,
        "viewport": {"width": width, "height": height},
        "status": "NOT_RUN",
        "consoleErrors": [],
        "pageErrors": [],
        "requestFailures": [],
        "externalRequests": [],
        "networkResponses": [],
        "bodyReadErrors": [],
        "loadedJsCss": [],
        "loadedJsCssAllMatchedStage": False,
        "objectiveFailures": [],
        "setupProof": None,
        "state": None,
        "screenshot": None,
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
        loaded = []

        page.on("console", lambda msg: result["consoleErrors"].append(
            {"type": msg.type, "text": msg.text}) if msg.type == "error" else None)
        page.on("pageerror", lambda err: result["pageErrors"].append(str(err)))
        page.on("requestfailed", lambda req: result["requestFailures"].append(req.url))
        page.on("request", lambda req: result["externalRequests"].append(req.url)
                if (urlsplit(req.url).scheme, urlsplit(req.url).hostname,
                    urlsplit(req.url).port) !=
                   (origin.scheme, origin.hostname, origin.port) else None)
        page.on("response", lambda resp: result["networkResponses"].append({
            "url": resp.url, "status": resp.status,
        }))

        def record_body(req) -> None:
            try:
                resp = req.response()
                if resp is None:
                    result["bodyReadErrors"].append(f"no response: {req.url}")
                    return
                parsed = urlsplit(resp.url)
                if (parsed.scheme, parsed.hostname, parsed.port) != (
                        origin.scheme, origin.hostname, origin.port):
                    return
                local = resolve_runtime_path(resp.url)
                if local is None or local.suffix.lower() not in HASH_EXTENSIONS:
                    return
                body = resp.body()
                body_sha = sha256_bytes(body)
                source_sha = sha256_file(local)
                loaded.append({
                    "url": resp.url,
                    "path": local.relative_to(STAGE).as_posix(),
                    "status": resp.status,
                    "bytes": len(body),
                    "bodySha256": body_sha,
                    "exactSourceSha256": source_sha,
                    "matchesExactSource": body_sha == source_sha,
                })
            except Exception as exc:
                result["bodyReadErrors"].append(f"{req.url}: {exc}")

        page.on("requestfinished", record_body)
        response = page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        if response is None or response.status != 200:
            raise AssertionError("root page did not load HTTP 200")
        initial = page_state(page)
        if initial["viewport"] != {"width": width, "height": height, "dpr": 1}:
            result["objectiveFailures"].append(
                f"viewport mismatch: {initial['viewport']}")
        if initial["canvas"] != {"width": 480, "height": 640}:
            result["objectiveFailures"].append(
                f"logical canvas mismatch: {initial['canvas']}")
        if initial["scrollWidth"] > width:
            result["objectiveFailures"].append(
                f"horizontal overflow: {initial['scrollWidth']} > {width}")
        if initial["storageKeys"]:
            result["objectiveFailures"].append(
                f"fresh context has storage keys: {initial['storageKeys']}")
        boot(page)
        result["setupProof"] = setup(page)
        state = page_state(page)
        result["state"] = state
        tag = f"{width}x{height}-{name}"
        shot_path = OUT / f"{prefix}-{tag}.png"
        result["screenshot"] = screenshot_once(
            page, shot_path, mobile=(width <= 700))
        page.wait_for_timeout(180)

        loaded.sort(key=lambda row: (
            row["path"], row["bodySha256"], row["bytes"]))
        result["loadedJsCss"] = loaded
        result["loadedJsCssAllMatchedStage"] = (
            bool(loaded) and all(row["matchesExactSource"] for row in loaded)
        )
        loaded_paths = {row["path"] for row in loaded}
        result["rasterizerLoaded"] = "web/fcv588-echo-rasterizer.mjs" in loaded_paths
        result["rasterizerBodySha256"] = next((
            row["bodySha256"] for row in loaded
            if row["path"] == "web/fcv588-echo-rasterizer.mjs"
        ), None)
        if not result["loadedJsCssAllMatchedStage"]:
            result["objectiveFailures"].append(
                "actual-loaded JS/CSS body SHA differs from staging source")
        if not result["rasterizerLoaded"]:
            result["objectiveFailures"].append(
                "new web/fcv588-echo-rasterizer.mjs was not loaded by Chrome")
        if result["rasterizerBodySha256"] != sha256_file(RASTERIZER):
            result["objectiveFailures"].append(
                "loaded rasterizer SHA differs from exact stage rasterizer")
        if result["consoleErrors"]:
            result["objectiveFailures"].append("console errors present")
        if result["pageErrors"]:
            result["objectiveFailures"].append("page errors present")
        if result["requestFailures"]:
            result["objectiveFailures"].append("request failures present")
        if result["externalRequests"]:
            result["objectiveFailures"].append("external requests present")
        if result["bodyReadErrors"]:
            result["objectiveFailures"].append("response body read errors present")
        bad = [row for row in result["networkResponses"] if row["status"] >= 400]
        if bad:
            result["objectiveFailures"].append(
                f"browser runtime HTTP errors present: {bad}")
        result["objectiveFailures"] = list(dict.fromkeys(result["objectiveFailures"]))
        result["status"] = "PASS" if not result["objectiveFailures"] else "FAILED"
    except Exception as exc:
        result["status"] = "FAILED"
        result["failure"] = {
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }
        result["objectiveFailures"].append(str(exc))
    finally:
        if context is not None:
            try:
                context.close()
            except Exception as exc:
                result["objectiveFailures"].append(f"context cleanup failed: {exc}")
                result["status"] = "FAILED"
    return result


def setup_lf(page):
    if page.locator("#mode-state").inner_text().strip() != "LF":
        raise AssertionError("LF setup not in LF")
    return {"mode": "LF", "palette": "Blue-default"}


def setup_dual(page):
    move_mode(page, "DUAL", 1)
    return {"mode": "DUAL", "palette": "Blue-default"}


def setup_hf(page):
    move_mode(page, "HF", 2)
    return {"mode": "HF", "palette": "Blue-default"}


def setup_bl(page):
    proof = select_bottom_lock(page)
    move_mode(page, "LF-ZOOM", -1)
    header = page.locator("#screen-top").text_content()
    if "BL-LF" not in header:
        raise AssertionError(f"Bottom Lock header proof missing: {header!r}")
    return {"mode": "LF-ZOOM", "palette": "Blue-default",
            "zoomMode": "Bottom Lock", "menuProof": proof, "header": header}


def setup_white(page):
    proof = select_white_palette(page)
    if page.locator("#mode-state").inner_text().strip() != "LF":
        raise AssertionError("White fixture left LF mode")
    return {"mode": "LF", "palette": "White", "menuProof": proof}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    run_id = (
        datetime.now().astimezone().strftime("%Y%m%dT%H%M%S%z")
        + "-" + uuid.uuid4().hex[:8]
    )
    prefix = f"fcv588-p03-stage-browser-{run_id}"
    receipt_path = OUT / f"{prefix}.json"
    raw_path = OUT / f"{prefix}-browser-events.json"
    manifest_path = OUT / f"{prefix}-sha256.txt"
    stdout_path = OUT / f"{prefix}-server.stdout.txt"
    stderr_path = OUT / f"{prefix}-server.stderr.txt"
    logs_path = OUT / f"{prefix}.log.txt"
    logs = []
    process = None
    browser = None
    stdout_handle = None
    stderr_handle = None

    before = source_manifest()
    receipt = {
        "schema": "fcv588-p03-stage-browser-qa-v1",
        "createdAt": datetime.now().astimezone().isoformat(),
        "stageRoot": str(STAGE),
        "outputDir": str(OUT),
        "server": {
            "path": str(SERVER),
            "sha256": sha256_file(SERVER),
            "nodePath": str(NODE),
            "port": PORT,
            "url": BASE_URL,
            "strictServerRequired": True,
            "pid": None,
            "stdout": str(stdout_path),
            "stderr": str(stderr_path),
        },
        "rasterizer": {
            "path": str(RASTERIZER),
            "sha256": sha256_file(RASTERIZER),
            "requiredBrowserPath": "web/fcv588-echo-rasterizer.mjs",
        },
        "sourceManifestBefore": {
            "files": len(before), "sha256": manifest_sha(before)
        },
        "sourceManifestAfter": None,
        "sourceTreeStable": False,
        "photoDeny": {"status": "NOT_RUN", "paths": []},
        "cases": [],
        "overallStatus": "NOT_RUN",
        "objectiveFailures": [],
        "serverCleanup": "NOT_RUN",
    }
    raw = {"cases": []}
    try:
        if not STAGE.is_dir():
            raise RuntimeError(f"stage missing: {STAGE}")
        for required in (CHROME, NODE, SERVER, RASTERIZER):
            if not required.is_file():
                raise RuntimeError(f"required file missing: {required}")
        if not port_is_free():
            raise RuntimeError(f"test-owned port occupied: {PORT}")
        stdout_handle = open(stdout_path, "xb")
        stderr_handle = open(stderr_path, "xb")
        env = dict(os.environ)
        env["PORT"] = str(PORT)
        process = subprocess.Popen(
            [str(NODE), str(SERVER)],
            cwd=str(STAGE),
            env=env,
            stdout=stdout_handle,
            stderr=stderr_handle,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        receipt["server"]["pid"] = process.pid
        wait_server(process)
        logs.append(f"STRICT_SERVER_READY pid={process.pid} {BASE_URL}")
        receipt["photoDeny"] = deny_oem_photos()
        if receipt["photoDeny"]["status"] != "PASS":
            receipt["objectiveFailures"].append("OEM /sources deny check failed")

        cases = [
            (1366, 768, "LF-Blue", setup_lf),
            (1366, 768, "DUAL-Blue", setup_dual),
            (1366, 768, "HF-Blue", setup_hf),
            (1366, 768, "LF-ZOOM-Bottom-Lock-Blue", setup_bl),
            (1366, 768, "LF-White", setup_white),
            (375, 812, "LF-Blue", setup_lf),
            (375, 812, "HF-Blue", setup_hf),
            (1920, 1080, "LF-Blue", setup_lf),
            (1920, 1080, "HF-Blue", setup_hf),
        ]
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                executable_path=str(CHROME), headless=False)
            receipt["browser"] = {
                "engine": "Google Chrome via Python Playwright",
                "version": browser.version,
                "executable": str(CHROME),
                "headless": False,
            }
            for width, height, name, setup in cases:
                logs.append(f"CASE_START {width}x{height} {name}")
                case = new_case(
                    browser, width=width, height=height,
                    prefix=prefix, name=name, setup=setup)
                receipt["cases"].append({
                    key: value for key, value in case.items()
                    if key not in ("consoleErrors", "pageErrors", "requestFailures",
                                   "externalRequests", "networkResponses",
                                   "bodyReadErrors", "loadedJsCss")
                } | {
                    "errorCounts": {
                        "console": len(case["consoleErrors"]),
                        "page": len(case["pageErrors"]),
                        "requestFailed": len(case["requestFailures"]),
                        "external": len(case["externalRequests"]),
                        "bodyRead": len(case["bodyReadErrors"]),
                    },
                    "loadedJsCssCount": len(case["loadedJsCss"]),
                    "loadedJsCssAggregateSha256": sha256_bytes(json.dumps(
                        case["loadedJsCss"], sort_keys=True,
                        separators=(",", ":")).encode("utf-8")),
                })
                raw["cases"].append({
                    "name": name,
                    "viewport": {"width": width, "height": height},
                    "consoleErrors": case["consoleErrors"],
                    "pageErrors": case["pageErrors"],
                    "requestFailures": case["requestFailures"],
                    "externalRequests": case["externalRequests"],
                    "networkResponses": case["networkResponses"],
                    "bodyReadErrors": case["bodyReadErrors"],
                    "loadedJsCss": case["loadedJsCss"],
                })
                if case["status"] != "PASS":
                    receipt["objectiveFailures"].extend(
                        f"{width}x{height} {name}: {failure}"
                        for failure in case["objectiveFailures"])
                logs.append(
                    f"CASE_END {width}x{height} {name} {case['status']}")
            browser.close()
            browser = None

        after = source_manifest()
        receipt["sourceManifestAfter"] = {
            "files": len(after), "sha256": manifest_sha(after)
        }
        receipt["sourceTreeStable"] = before == after
        if not receipt["sourceTreeStable"]:
            receipt["objectiveFailures"].append(
                "staging JS/CSS source changed during browser QA")
        receipt["objectiveFailures"] = list(dict.fromkeys(
            receipt["objectiveFailures"]))
        receipt["overallStatus"] = (
            "PASS"
            if len(receipt["cases"]) == 9
            and all(case["status"] == "PASS" for case in receipt["cases"])
            and receipt["photoDeny"]["status"] == "PASS"
            and receipt["sourceTreeStable"]
            and not receipt["objectiveFailures"]
            else "FAILED"
        )
    except Exception as exc:
        receipt["overallStatus"] = "FAILED"
        receipt["objectiveFailures"].append(str(exc))
        receipt["fatalError"] = {
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }
        logs.append(f"FATAL {exc}")
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception as exc:
                receipt["objectiveFailures"].append(
                    f"browser cleanup failed: {exc}")
        if process is not None:
            try:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=4)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=4)
                receipt["serverCleanup"] = (
                    "PASS" if process.poll() is not None else "FAILED"
                )
                logs.append(
                    f"STRICT_SERVER_STOP exit={process.returncode}")
            except Exception as exc:
                receipt["serverCleanup"] = "FAILED"
                receipt["objectiveFailures"].append(
                    f"server cleanup failed: {exc}")
                receipt["overallStatus"] = "FAILED"
        if stdout_handle is not None:
            stdout_handle.close()
        if stderr_handle is not None:
            stderr_handle.close()
        if receipt["sourceManifestAfter"] is None and STAGE.is_dir():
            try:
                after = source_manifest()
                receipt["sourceManifestAfter"] = {
                    "files": len(after), "sha256": manifest_sha(after)
                }
                receipt["sourceTreeStable"] = before == after
            except Exception as exc:
                receipt["objectiveFailures"].append(
                    f"postflight manifest failed: {exc}")
        receipt["objectiveFailures"] = list(dict.fromkeys(
            receipt["objectiveFailures"]))
        receipt["finishedAt"] = datetime.now().astimezone().isoformat()
        write_once_json(receipt_path, receipt)
        write_once_json(raw_path, raw)
        write_once_bytes(
            logs_path, ("\n".join(logs) + "\n").encode("utf-8"))
        artifact_paths = sorted(
            p for p in OUT.iterdir()
            if p.is_file() and (
                p.name.startswith(prefix)
                or p.name in ("p03_stage_browser_worker10.py", "p03_stage_browser_worker10_attempt2.py")
            )
        )
        lines = [f"{sha256_file(path)} *{path.name}" for path in artifact_paths]
        write_once_bytes(
            manifest_path, ("\n".join(lines) + "\n").encode("ascii"))
        print(json.dumps({
            "overallStatus": receipt["overallStatus"],
            "objectiveFailures": receipt["objectiveFailures"],
            "receipt": str(receipt_path),
            "receiptSha256": sha256_file(receipt_path),
            "rawEvents": str(raw_path),
            "rawEventsSha256": sha256_file(raw_path),
            "shaManifest": str(manifest_path),
            "shaManifestSha256": sha256_file(manifest_path),
            "serverCleanup": receipt["serverCleanup"],
            "photoDeny": receipt["photoDeny"]["status"],
            "sourceTreeStable": receipt["sourceTreeStable"],
            "rasterizerSha256": receipt["rasterizer"]["sha256"],
            "cases": [{
                "name": case["name"],
                "viewport": case["viewport"],
                "status": case["status"],
                "screenshotSha256": (case.get("screenshot") or {}).get("sha256"),
                "rasterizerLoaded": case.get("rasterizerLoaded"),
                "rasterizerBodySha256": case.get("rasterizerBodySha256"),
                "loadedJsCssCount": case.get("loadedJsCssCount"),
                "errorCounts": case.get("errorCounts"),
            } for case in receipt["cases"]],
        }, ensure_ascii=False, indent=2))
    return 0 if receipt["overallStatus"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
