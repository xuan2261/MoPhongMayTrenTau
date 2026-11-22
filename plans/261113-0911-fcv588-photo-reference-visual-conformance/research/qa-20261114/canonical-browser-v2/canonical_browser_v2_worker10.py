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
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT
OUT = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114/canonical-browser-v2"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
HOST = "127.0.0.1"
PORT = 4179
BASE_URL = f"http://{HOST}:{PORT}/"
VIEWPORTS = ((1366, 768), (375, 812), (1920, 1080))
STATES = ("LF", "MENU", "DUAL", "HF", "NAV2", "NAV1")
PHOTO_NAMES = ("giaoDien.jpg", "lf.jpg", "hf.jpg", "dual.jpg",
               "zoom.jpg", "zoom2.jpg", "nav1.jpg", "nav2.jpg")
ALLOWED = {
    "web": {".html", ".mjs", ".js", ".css", ".svg"},
    "src": {".mjs", ".js"},
}
HASH_EXTENSIONS = {".mjs", ".js", ".css"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def write_once_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    fd = os.open(path, flags)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
    except Exception:
        try:
            os.close(fd)
        except OSError:
            pass
        raise


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
    payload = json.dumps(rows, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256_bytes(payload)


def resolve_runtime_path(url: str) -> Path | None:
    path = urlsplit(url).path
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
    server_version = "FCV588StageBrowserV2/1"

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
      const depth = document.querySelector('.depth-indicator');
      const rect = el => {
        if (!el) return null;
        const r=el.getBoundingClientRect();
        return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,
                width:r.width,height:r.height};
      };
      const depthStyle = depth ? getComputedStyle(depth) : null;
      return {
        href: location.href,
        viewport: {width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
        scroll: {x:scrollX,y:scrollY,width:document.documentElement.scrollWidth,
                 height:document.documentElement.scrollHeight},
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
        depthIndicator: {
          hidden: depth?.hidden ?? null,
          dataView: depth?.dataset?.view ?? null,
          display: depthStyle?.display ?? null,
          left: depthStyle?.left ?? null,
          right: depthStyle?.right ?? null,
          maxWidth: depthStyle?.maxWidth ?? null,
          rect: rect(depth),
        },
        geometry: {lcd:rect(lcd),deviceFrame:rect(frame)},
        canvas: (() => {
          const c=document.getElementById('echo-canvas');
          return c?{width:c.width,height:c.height}:null;
        })(),
        localStorageKeys: Object.keys(localStorage).sort(),
      };
    }""")


def expected_header(mode: str) -> str:
    return {
        "LF": "AUTO_R   G:AF   LF   x1",
        "DUAL": "AUTO_R   G:AF   LF/HF   x1",
        "HF": "AUTO_R   G:AF   HF   x1",
        "NAV1": "",
        "NAV2": "",
    }[mode]


def proof_state(label: str, state: dict) -> dict:
    mode = "LF" if label == "MENU" else label
    failures = []
    header_expected = expected_header(mode)
    if state["screenTop"] != header_expected:
        failures.append(
            f"HEADER {label}: expected {header_expected!r}, got {state['screenTop']!r}")
    if state["mode"] != mode:
        failures.append(f"MODE {label}: expected {mode}, got {state['mode']}")
    if label == "MENU":
        if state["overlay"]["hidden"] is not False:
            failures.append("MENU overlay hidden")
        if not state["overlay"]["title"]:
            failures.append("MENU title empty")
    elif state["overlay"]["hidden"] is not True:
        failures.append(f"{label}: unexpected overlay {state['overlay']}")
    if mode in ("NAV1", "NAV2"):
        d = state["depthIndicator"]
        if d["dataView"] != mode:
            failures.append(
                f"{mode}: depth data-view expected {mode}, got {d['dataView']}")
        if mode == "NAV1" and d["hidden"] is not False:
            failures.append("NAV1: global left depth should be visible")
        if mode == "NAV2" and d["hidden"] is not True:
            failures.append("NAV2: duplicate global depth should be hidden")
        cue_title = state["sourceCue"]["title"] or ""
        if f"MODE {mode}" not in cue_title:
            failures.append(f"{mode}: source cue does not prove current mode: {cue_title!r}")
    return {
        "status": "PASS" if not failures else "FAILED",
        "headerExpected": header_expected,
        "headerActual": state["screenTop"],
        "navDepthIndicator": state["depthIndicator"] if mode in ("NAV1","NAV2") else None,
        "sourceCue": state["sourceCue"],
        "failures": failures,
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
        raise AssertionError(f"MODE commit expected {target}, got {actual}")


def screenshot_once(page, path: Path, mobile: bool) -> dict:
    if path.exists():
        raise FileExistsError(f"write-once screenshot exists: {path}")
    if mobile:
        page.locator(".device-frame").scroll_into_view_if_needed()
    else:
        page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(140)
    page.screenshot(path=str(path), full_page=False)
    return {"path":str(path),"bytes":path.stat().st_size,"sha256":sha256_file(path)}


def run_viewport(browser, width: int, height: int, prefix: str) -> dict:
    tag = f"{width}x{height}"
    result = {
        "viewport":{"width":width,"height":height},
        "status":"NOT_RUN",
        "states":{},
        "screenshots":[],
        "loadedBodies":[],
        "loadedBodiesAllMatchedExactSource":False,
        "loadedBodiesAggregateSha256":None,
        "consoleErrors":[],
        "pageErrors":[],
        "requestFailures":[],
        "externalRequests":[],
        "networkResponses":[],
        "bodyReadErrors":[],
        "badHttpResponses":[],
        "objectiveFailures":[],
        "failure":None,
    }
    context = None
    try:
        context = browser.new_context(
            viewport={"width":width,"height":height},
            device_scale_factor=1, locale="vi-VN")
        page = context.new_page()
        origin = urlsplit(BASE_URL)
        loaded = []

        page.on("console", lambda m: result["consoleErrors"].append(
            {"type":m.type,"text":m.text}) if m.type == "error" else None)
        page.on("pageerror", lambda e: result["pageErrors"].append(str(e)))
        page.on("requestfailed", lambda req: result["requestFailures"].append(req.url))
        page.on("request", lambda req: result["externalRequests"].append(req.url)
                if (urlsplit(req.url).scheme,urlsplit(req.url).hostname,urlsplit(req.url).port)
                != (origin.scheme,origin.hostname,origin.port) else None)
        page.on("response", lambda resp: result["networkResponses"].append(
            {"url":resp.url,"status":resp.status}))

        def record_body(req) -> None:
            try:
                resp = req.response()
                if resp is None:
                    result["bodyReadErrors"].append(f"no response: {req.url}")
                    return
                parsed=urlsplit(resp.url)
                if (parsed.scheme,parsed.hostname,parsed.port) != (
                        origin.scheme,origin.hostname,origin.port):
                    return
                local=resolve_runtime_path(resp.url)
                if local is None or local.suffix.lower() not in HASH_EXTENSIONS:
                    return
                body=resp.body()
                body_sha=sha256_bytes(body)
                exact_sha=sha256_file(local)
                loaded.append({
                    "url":resp.url,
                    "path":local.relative_to(STAGE).as_posix(),
                    "status":resp.status,
                    "bytes":len(body),
                    "bodySha256":body_sha,
                    "exactSourceSha256":exact_sha,
                    "matchesExactSource":body_sha==exact_sha,
                })
            except Exception as exc:
                result["bodyReadErrors"].append(f"{req.url}: {exc}")

        page.on("requestfinished", record_body)
        response=page.goto(BASE_URL,wait_until="networkidle",timeout=30000)
        if response is None or response.status != 200:
            raise AssertionError("root page did not load HTTP 200")
        initial=runtime_state(page)
        result["initialState"]=initial
        if initial["viewport"] != {"width":width,"height":height,"dpr":1}:
            result["objectiveFailures"].append(
                f"viewport mismatch {initial['viewport']}")
        if initial["canvas"] != {"width":480,"height":640}:
            result["objectiveFailures"].append(
                f"logical canvas mismatch {initial['canvas']}")
        boot(page)

        def capture(label: str) -> None:
            item={"status":"NOT_RUN"}
            result["states"][label]=item
            state=runtime_state(page)
            proof=proof_state(label,state)
            shot_path=OUT/f"{prefix}-{tag}-{label}.png"
            shot=screenshot_once(page,shot_path,mobile=width<=700)
            item.update({"status":"PASS" if proof["status"]=="PASS" else "FAILED",
                         "state":runtime_state(page),"proof":proof,"screenshot":shot})
            result["screenshots"].append({"label":label,**shot})
            if proof["failures"]:
                result["objectiveFailures"].extend(proof["failures"])

        capture("LF")
        page.locator("#key-menu").scroll_into_view_if_needed()
        page.locator("#key-menu").click()
        page.wait_for_timeout(120)
        capture("MENU")
        page.locator("#key-menu").click()
        page.wait_for_timeout(80)
        move_mode(page,"DUAL",1)
        capture("DUAL")
        move_mode(page,"HF",1)
        capture("HF")
        move_mode(page,"NAV2",2)
        capture("NAV2")
        move_mode(page,"NAV1",1)
        capture("NAV1")
        page.wait_for_timeout(250)

        loaded_sorted=sorted(
            loaded,key=lambda r:(r["path"],r["bodySha256"],r["bytes"]))
        result["loadedBodies"]=loaded_sorted
        result["loadedBodiesAllMatchedExactSource"]=(
            bool(loaded_sorted) and all(r["matchesExactSource"] for r in loaded_sorted))
        result["loadedBodiesAggregateSha256"]=sha256_bytes(json.dumps(
            [{k:r[k] for k in ("path","status","bytes","bodySha256",
                                "exactSourceSha256","matchesExactSource")}
             for r in loaded_sorted],
            sort_keys=True,separators=(",",":")).encode("utf-8"))
        result["badHttpResponses"]=[
            r for r in result["networkResponses"] if r["status"]>=400]
        if not result["loadedBodiesAllMatchedExactSource"]:
            result["objectiveFailures"].append(
                "one or more actual-loaded JS/CSS bodies differ from exact staging source")
        if result["consoleErrors"]:
            result["objectiveFailures"].append("browser console errors present")
        if result["pageErrors"]:
            result["objectiveFailures"].append("page errors present")
        if result["requestFailures"]:
            result["objectiveFailures"].append("request failures present")
        if result["externalRequests"]:
            result["objectiveFailures"].append("external requests present")
        if result["bodyReadErrors"]:
            result["objectiveFailures"].append("response body read errors present")
        if result["badHttpResponses"]:
            result["objectiveFailures"].append("browser runtime HTTP >=400 responses present")
        if initial["scroll"]["width"] > width:
            result["objectiveFailures"].append(
                f"horizontal overflow scrollWidth={initial['scroll']['width']} > {width}")
        for label in STATES:
            if result["states"].get(label,{}).get("status")!="PASS":
                result["objectiveFailures"].append(f"{label} state did not PASS")
        result["objectiveFailures"]=list(dict.fromkeys(result["objectiveFailures"]))
        result["status"]="PASS" if not result["objectiveFailures"] else "FAILED"
    except Exception as exc:
        result["status"]="FAILED"
        result["failure"]={"error":str(exc),"traceback":traceback.format_exc()}
        result["objectiveFailures"].append(str(exc))
        for label in STATES:
            result["states"].setdefault(label,{
                "status":"NOT_RUN","error":"prior viewport sequence failure"})
    finally:
        if context is not None:
            try:
                context.close()
            except Exception as exc:
                result["objectiveFailures"].append(f"context cleanup: {exc}")
                result["status"]="FAILED"
    return result


def photo_deny_checks() -> dict:
    rows=[]
    for name in PHOTO_NAMES:
        path=f"/sources/FCV588_GiaoDienThucTeMay2016/{name}"
        url=BASE_URL.rstrip("/")+path
        row={"name":name,"path":path,"url":url,"statusCode":None,
             "status":"FAILED","error":None}
        try:
            with urlopen(url,timeout=5) as resp:
                row["statusCode"]=resp.status
                row["status"]="PASS" if resp.status in (403,404) else "FAILED"
        except HTTPError as exc:
            row["statusCode"]=exc.code
            row["status"]="PASS" if exc.code in (403,404) else "FAILED"
        except URLError as exc:
            row["error"]=str(exc)
        rows.append(row)
    return {"status":"PASS" if all(r["status"]=="PASS" for r in rows)
            else "FAILED","paths":rows}


def main() -> int:
    OUT.mkdir(parents=True,exist_ok=True)
    run_id=(datetime.now().astimezone().strftime("%Y%m%dT%H%M%S%z")
            +"-"+uuid.uuid4().hex[:8])
    prefix=f"fcv588-canonical-browser-v2-{run_id}"
    receipt_path=OUT/f"{prefix}.json"
    log_path=OUT/f"{prefix}.log.txt"
    manifest_path=OUT/f"{prefix}-sha256.txt"
    logs=[]
    receipt={
        "schema":"fcv588-canonical-browser-v2-qa-v1",
        "createdAt":datetime.now().astimezone().isoformat(),
        "scope":"CANONICAL_READ_ONLY_SOURCE_RUNTIME_WRITE_ONCE_QA_OUTPUT",
        "stageRoot":str(STAGE),
        "outputDir":str(OUT),
        "server":{"host":HOST,"port":PORT,"url":BASE_URL,
                  "kind":"test-owned restricted Python ThreadingHTTPServer"},
        "browser":{"executable":str(CHROME),"headless":False},
        "overallStatus":"NOT_RUN",
        "objectiveFailures":[],
        "httpPhotoDeny":{"status":"NOT_RUN","paths":[]},
        "viewports":[],
        "sourceManifestBefore":None,
        "sourceManifestAfter":None,
        "sourceTreeStable":False,
        "fatalError":None,
    }
    httpd=None
    browser=None
    try:
        if not STAGE.is_dir():
            raise RuntimeError(f"staging missing: {STAGE}")
        if not CHROME.is_file():
            raise RuntimeError(f"Chrome unavailable: {CHROME}")
        if not port_is_free():
            raise RuntimeError(f"test-owned port occupied: {PORT}")
        before=source_manifest()
        receipt["sourceManifestBefore"]={
            "files":len(before),"sha256":manifest_sha(before),"entries":before}
        httpd=ThreadingHTTPServer((HOST,PORT),RuntimeHandler)
        threading.Thread(target=httpd.serve_forever,daemon=True).start()
        time.sleep(0.15)
        logs.append(f"SERVER_READY {BASE_URL}")
        receipt["httpPhotoDeny"]=photo_deny_checks()
        if receipt["httpPhotoDeny"]["status"]!="PASS":
            receipt["objectiveFailures"].append("8 OEM photo URL deny check failed")

        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=str(CHROME),headless=False)
            receipt["browser"]["version"]=browser.version
            for width,height in VIEWPORTS:
                logs.append(f"VIEWPORT_START {width}x{height}")
                vp=run_viewport(browser,width,height,prefix)
                receipt["viewports"].append(vp)
                logs.append(f"VIEWPORT_END {width}x{height} {vp['status']}")
                receipt["objectiveFailures"].extend(
                    f"{width}x{height}: {f}" for f in vp["objectiveFailures"])
            browser.close()
            browser=None

        after=source_manifest()
        receipt["sourceManifestAfter"]={
            "files":len(after),"sha256":manifest_sha(after),"entries":after}
        receipt["sourceTreeStable"]=before==after
        if not receipt["sourceTreeStable"]:
            receipt["objectiveFailures"].append(
                "staging JS/CSS source tree changed during browser QA")
        receipt["objectiveFailures"]=list(dict.fromkeys(receipt["objectiveFailures"]))
        expected_vp=["PASS","PASS","PASS"]
        statuses=[v["status"] for v in receipt["viewports"]]
        receipt["overallStatus"]="PASS" if (
            statuses==expected_vp
            and receipt["httpPhotoDeny"]["status"]=="PASS"
            and receipt["sourceTreeStable"]
            and not receipt["objectiveFailures"]) else "FAILED"
    except Exception as exc:
        receipt["overallStatus"]="FAILED"
        receipt["fatalError"]={"error":str(exc),"traceback":traceback.format_exc()}
        receipt["objectiveFailures"].append(str(exc))
        logs.append(f"FATAL {exc}")
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception as exc:
                receipt["objectiveFailures"].append(f"browser cleanup: {exc}")
        if httpd is not None:
            try:
                httpd.shutdown(); httpd.server_close()
                logs.append("SERVER_SHUTDOWN PASS")
            except Exception as exc:
                receipt["objectiveFailures"].append(f"server cleanup: {exc}")
                receipt["overallStatus"]="FAILED"
                logs.append(f"SERVER_SHUTDOWN FAILED {exc}")
        if receipt["sourceManifestAfter"] is None and STAGE.is_dir():
            try:
                after=source_manifest()
                receipt["sourceManifestAfter"]={
                    "files":len(after),"sha256":manifest_sha(after),"entries":after}
                before_entries=(receipt.get("sourceManifestBefore") or {}).get("entries")
                receipt["sourceTreeStable"]=before_entries==after
            except Exception as exc:
                receipt["objectiveFailures"].append(
                    f"post-run source manifest failed: {exc}")
        receipt["objectiveFailures"]=list(dict.fromkeys(receipt["objectiveFailures"]))
        receipt["finishedAt"]=datetime.now().astimezone().isoformat()
        write_once_text(receipt_path,json.dumps(receipt,ensure_ascii=False,indent=2)+"\n")
        logs.append(f"RECEIPT {receipt_path}")
        logs.append(f"RECEIPT_SHA256 {sha256_file(receipt_path)}")
        write_once_text(log_path,"\n".join(logs)+"\n")
        files=sorted([p for p in OUT.iterdir()
                      if p.is_file() and (p.name.startswith(prefix)
                          or p.name=="canonical_browser_v2_worker10.py")])
        lines=[f"{sha256_file(p)} *{p.name}" for p in files]
        write_once_text(manifest_path,"\n".join(lines)+"\n")
        print(json.dumps({
            "overallStatus":receipt["overallStatus"],
            "objectiveFailures":receipt["objectiveFailures"],
            "receipt":str(receipt_path),
            "receiptSha256":sha256_file(receipt_path),
            "log":str(log_path),
            "logSha256":sha256_file(log_path),
            "shaManifest":str(manifest_path),
            "shaManifestSha256":sha256_file(manifest_path),
            "httpPhotoDeny":receipt["httpPhotoDeny"]["status"],
            "sourceTreeStable":receipt["sourceTreeStable"],
            "sourceManifestSha256":(
                receipt["sourceManifestAfter"] or {}).get("sha256"),
            "viewports":[{
                "viewport":v["viewport"],"status":v["status"],
                "screenshots":len(v["screenshots"]),
                "loadedBodies":len(v["loadedBodies"]),
                "allBodiesMatched":v["loadedBodiesAllMatchedExactSource"],
                "consoleErrors":len(v["consoleErrors"]),
                "pageErrors":len(v["pageErrors"]),
                "requestFailures":len(v["requestFailures"]),
                "externalRequests":len(v["externalRequests"]),
                "bodyReadErrors":len(v["bodyReadErrors"]),
            } for v in receipt["viewports"]],
        },ensure_ascii=False,indent=2))
    return 0 if receipt["overallStatus"]=="PASS" else 2


if __name__=="__main__":
    raise SystemExit(main())
