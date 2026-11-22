"""V52 -- source-bound actual Chrome-loaded response bodies, no simulator edits.

The runner owns one loopback server and one headless Chrome process, closes both,
and never interprets synthetic software tests as OEM/hardware acceptance.
Uses DevTools Network.getResponseBody AND Playwright Response.body separately.
"""
from __future__ import annotations

import base64
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import traceback
from datetime import datetime, timezone
from urllib.request import urlopen
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

EVIDENCE = Path(__file__).resolve().parent
ROOT = EVIDENCE.parents[2]
PORT = 4261
BASE = f"http://127.0.0.1:{PORT}/"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
V50 = ROOT / "docs/qa/FCV588_V50_FINAL_INTEGRITY_20261019.json"
POST = ROOT / "docs/qa/FCV588_V50_POSTRECEIPT_READBACK_20261019.json"
LEDGER = ROOT / "docs/evidence/fcv588-public-implementation-status.json"
SERVER = ROOT / "tools/server.mjs"
SERVER_LOG = EVIDENCE / "V52_OWNED_SERVER_20261022.log"
RESULT = EVIDENCE / "V52_FULL_LOADED_RESPONSE_20261022.json"
FAIL = EVIDENCE / "V52_FULL_LOADED_RESPONSE_ORIGINAL_STOP_20261022.txt"
EXPECTED_FINAL = "88b6633a7bd8b68e0e3f048319095eb4d1d783e7f91d74fefad05e59770fd36a"
EXPECTED_POST = "1c95c486994004457f16f71fb75f885449f9b3ba00ea75ca348275016fcbb31b"
VIEWPORTS = [(1366, 768), (1920, 1080)]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_path(path: Path) -> str:
    with path.open("rb") as stream:
        digest = hashlib.sha256()
        for block in iter(lambda: stream.read(1048576), b""):
            digest.update(block)
        return digest.hexdigest()


def require(value, message):
    if not value:
        raise RuntimeError(message)


def new_file(path: Path, raw: bytes):
    with path.open("xb") as stream:
        stream.write(raw)


def json_file(path: Path, obj):
    new_file(path, (json.dumps(obj, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))


def preflight():
    require(ROOT.is_dir() and CHROME.is_file(), "Expected C-only canonical root/Chrome missing")
    require(not RESULT.exists() and not FAIL.exists() and not SERVER_LOG.exists(), "Write-once evidence target already exists")
    require(sha_path(V50) == EXPECTED_FINAL, "STOP: canonical V50 seal drift")
    require(sha_path(POST) == EXPECTED_POST, "STOP: canonical V50 independent receipt drift")
    final = json.loads(V50.read_text(encoding="utf-8"))
    expected = final["runtimeSourceSHA"]
    require(len(expected) == 37, "Unexpected runtime map length")
    for rel, digest in expected.items():
        require(sha_path(ROOT / rel) == digest, "STOP runtime mismatch: " + rel)
    post = json.loads(POST.read_text(encoding="utf-8"))
    require(post["sealedFinalSHA"] == EXPECTED_FINAL, "STOP: postreceipt linkage")
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    require(ledger["releaseApproval"] == "HOLD" and ledger["hardwareValidated"] is False, "STOP release gate drift")
    require(len(ledger["operatorRows"]) == 64 and len(ledger["teacherRows"]) == 1, "STOP feature-row drift")
    require(all(e["claimDecision"] == "HOLD" for e in ledger["operatorRows"] + ledger["teacherRows"]), "STOP claim HOLD drift")
    require(SERVER.is_file(), "canonical local server missing")
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(.3)
        require(sock.connect_ex(("127.0.0.1", PORT)) != 0, "PORT already occupied; do not take ownership")
    return final, expected, sha_path(SERVER)


def owned_server():
    with SERVER_LOG.open("xb") as stream:
        proc = subprocess.Popen(
            ["node", "tools/server.mjs"],
            cwd=str(ROOT),
            stdout=stream,
            stderr=subprocess.STDOUT,
            env={**os.environ, "PORT": str(PORT)},
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    for _ in range(65):
        require(proc.poll() is None, "Owned localhost server exited before readiness")
        try:
            with urlopen(BASE, timeout=.7) as r:
                if r.status == 200:
                    return proc
        except OSError:
            time.sleep(.12)
    raise TimeoutError("Owned localhost server did not become ready")


def run_viewport(browser, size, expected):
    width, height = size
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        locale="vi-VN",
        reduced_motion="reduce",
        service_workers="block",
    )
    page = context.new_page()
    cdp = context.new_cdp_session(page)
    cdp.send("Network.enable", {
        "maxTotalBufferSize": 48 * 1024 * 1024,
        "maxResourceBufferSize": 4 * 1024 * 1024,
    })
    received = {}
    completed = set()
    failures = []
    playwright_loaded = {}

    def on_response(event):
        received[event["requestId"]] = {
            "url": event["response"].get("url"),
            "status": event["response"].get("status"),
            "mime": event["response"].get("mimeType"),
            "type": event.get("type"),
            "fromDiskCache": event["response"].get("fromDiskCache"),
        }

    def on_failed(event):
        failures.append({"requestId": event.get("requestId"), "text": event.get("errorText")})

    def on_playwright_finished(request):
        try:
            response = request.response()
            require(response is not None and response.status == 200, "non-200 response")
            url = urlsplit(request.url)
            require((url.scheme, url.hostname, url.port) == ("http", "127.0.0.1", PORT), "external request")
            rel = "web/index.html" if url.path == "/" else url.path.lstrip("/")
            require(rel in expected, "unexpected browser loaded resource " + rel)
            payload = response.body()  # Actual browser-loaded bytes from Chrome
            actual = sha(payload)
            require(actual == expected[rel], "Playwright response.body SHA mismatch " + rel)
            require(len(payload) == (ROOT / rel).stat().st_size, "Playwright response size mismatch " + rel)
            require(rel not in playwright_loaded, "unexpected duplicate request for " + rel)
            playwright_loaded[rel] = {"sha256": actual, "bytes": len(payload)}
        except Exception as err:
            failures.append({"request": request.url, "playwrightBodyError": str(err)})

    cdp.on("Network.responseReceived", on_response)
    cdp.on("Network.loadingFinished", lambda e: completed.add(e.get("requestId")))
    cdp.on("Network.loadingFailed", on_failed)
    page.on("requestfinished", on_playwright_finished)
    page.on("pageerror", lambda e: failures.append({"pageError": str(e)}))
    page.on("console", lambda m: failures.append({"consoleError": m.text}) if m.type == "error" else None)
    page.on("requestfailed", lambda req: failures.append({"requestFailed": req.url}))

    try:
        response = page.goto(BASE, wait_until="networkidle", timeout=30000)
        require(response and response.status == 200, "main page not HTTP200")
        page.locator("#key-power").wait_for(state="visible", timeout=10000)
        page.wait_for_timeout(250)  # Allow favicon request after first load, if issued.
        measured = page.evaluate("""() => ({
            innerWidth, innerHeight, dpr: devicePixelRatio,
            href: location.href, readyState: document.readyState,
            d15OutsideLcd: !document.querySelector('#lcd').contains(
                document.querySelector('#operator-guidance-announcement'))
        })""")
        require([measured["innerWidth"], measured["innerHeight"]] == [width, height], "incorrect automated browser viewport")
        require(measured["d15OutsideLcd"] is True, "D15 leaked into operator LCD")
        require(not failures, "browser/capture errors: " + json.dumps(failures))
        require(len(playwright_loaded) == 35, f"Actual Playwright body count {len(playwright_loaded)}/35")
        cdp_loaded = {}
        for request_id, info in received.items():
            url = urlsplit(info["url"])
            require((url.scheme, url.hostname, url.port) == ("http", "127.0.0.1", PORT), "external Chrome CDP request")
            require(info["status"] == 200, "CDP HTTP not200 " + info["url"])
            require(request_id in completed, "CDP request not completed " + info["url"])
            rel = "web/index.html" if url.path == "/" else url.path.lstrip("/")
            require(rel in expected, "unexpected CDP resource " + rel)
            encoded = cdp.send("Network.getResponseBody", {"requestId": request_id})
            body = (base64.b64decode(encoded["body"]) if encoded["base64Encoded"]
                    else encoded["body"].encode("utf-8"))
            actual = sha(body)
            require(actual == expected[rel], "CDP Network.getResponseBody SHA drift " + rel)
            require(actual == playwright_loaded[rel]["sha256"], "CDP vs Playwright body mismatch " + rel)
            require(len(body) == playwright_loaded[rel]["bytes"], "CDP vs Playwright body size mismatch " + rel)
            require(rel not in cdp_loaded, "unexpected duplicate Chrome body " + rel)
            cdp_loaded[rel] = {
                "path": rel, "actualBodySHA256": actual, "actualBodyBytes": len(body),
                "cdpBase64Encoded": encoded["base64Encoded"],
                "playwrightBodySha256": playwright_loaded[rel]["sha256"],
                "v50ExpectedSHA256": expected[rel],
            }
        require(len(cdp_loaded) == 35, f"CDP bodies captured {len(cdp_loaded)}/35")
        require(set(cdp_loaded) == set(playwright_loaded), "CDP/Playwright path mismatch")
        screenshot = EVIDENCE / f"V52_CHROME_CDP_AUTOMATED_{width}x{height}_20261022.png"
        require(not screenshot.exists(), "Write-once screenshot exists")
        pixels = page.screenshot(path=str(screenshot), full_page=False)
        require(pixels, "PNG not produced")
        return {
            "viewport": [width, height],
            "kind": "HEADLESS_CHROME_AUTOMATED_NOT_COS_ATTACHED",
            "actualBrowser": browser.version,
            "measurements": measured,
            "http200Count": len(received),
            "finishedRequestCount": len(completed),
            "playwrightResponseBodyMatchCount": len(playwright_loaded),
            "cdpNetworkGetResponseBodyMatchCount": len(cdp_loaded),
            "allExpectedLoaded": sorted(set(cdp_loaded)) == sorted({*cdp_loaded}),
            "allSourceBound": True,
            "requests": [cdp_loaded[k] for k in sorted(cdp_loaded)],
            "screenshot": {"name": screenshot.name, "sha256": sha(pixels), "bytes": len(pixels)},
            "errors": failures,
        }
    finally:
        cdp.detach()
        context.close()


def execute():
    source_receipt, expected, server_sha = preflight()
    result = {
        "milestone": "V52_REAL_CHROME_CDP_LOADED_BODY",
        "status": "PENDING",
        "utc": datetime.now(timezone.utc).isoformat(),
        "canonical": str(ROOT),
        "finalV50SHA256": EXPECTED_FINAL,
        "independentV50PostSHA256": EXPECTED_POST,
        "runnerSourceSHA256": sha_path(Path(__file__).resolve()),
        "browserRunner": "Python Playwright "+importlib.metadata.version("playwright"),
        "chromeExecutable": str(CHROME),
        "serverSourceSHA256Before": server_sha,
        "port": PORT,
        "sourceSHA37": "37/37_MATCH_PRE",
        "browserRuns": [],
        "phase6": "OPEN",
        "claimHold": 65,
        "installedFirmware": "UNKNOWN",
        "releaseApproval": "HOLD",
        "hardwareValidated": False,
        "spokenNarratorNvdaQA": "NOT_RUN",
        "genuineOSBlurPowerHold": "NOT_RUN",
    }
    server = None
    try:
        server = owned_server()
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=str(CHROME),
                headless=True,
                args=["--no-first-run", "--disable-background-networking"],
            )
            try:
                for dimensions in VIEWPORTS:
                    result["browserRuns"].append(run_viewport(browser, dimensions, expected))
            finally:
                browser.close()
    finally:
        if server is not None:
            if server.poll() is None:
                server.terminate()
                try:
                    server.wait(timeout=7)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait(timeout=7)
    for rel, digest in expected.items():
        require(sha_path(ROOT / rel) == digest, "postbrowser canonical runtime drift " + rel)
    require(sha_path(SERVER) == server_sha, "server source changed unexpectedly")
    require(sha_path(V50) == EXPECTED_FINAL and sha_path(POST) == EXPECTED_POST,
            "historical receipt changed during QA")
    result["sourceSHA37"] = "37/37_MATCH_PRE_POST"
    result["serverStopped"] = server is not None and server.poll() is not None
    require(result["serverStopped"], "Owned server cleanup unknown")
    require(len(result["browserRuns"]) == 2, "Missing viewport")
    require(all(x["cdpNetworkGetResponseBodyMatchCount"] == 35
                and x["playwrightResponseBodyMatchCount"] == 35
                for x in result["browserRuns"]), "CDP and Playwright mismatch")
    result["status"] = "PASS_70_OF_70_ACTUAL_LOADED_BODIES_SOURCE_BOUND"
    json_file(RESULT, result)
    print("V52_CDP_RESULT", result["status"])
    print("BROWSER_VERSIONS", [x["actualBrowser"] for x in result["browserRuns"]])
    print("NETWORK_CDP", [x["cdpNetworkGetResponseBodyMatchCount"] for x in result["browserRuns"]])
    print("PLAYWRIGHT_BODY", [x["playwrightResponseBodyMatchCount"] for x in result["browserRuns"]])
    print("TARGETS", [
        {r["path"]: r["actualBodySHA256"] for r in x["requests"]
         if r["path"] in ("web/styles.css", "web/app.mjs", "src/devices/fcv588/model.mjs")}
        for x in result["browserRuns"]
    ])
    print("RESULT_SHA256", sha_path(RESULT))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(execute())
    except Exception:
        error = traceback.format_exc()
        if not FAIL.exists():
            new_file(FAIL, error.encode("utf-8"))
        sys.stderr.write(error)
        sys.exit(2)
