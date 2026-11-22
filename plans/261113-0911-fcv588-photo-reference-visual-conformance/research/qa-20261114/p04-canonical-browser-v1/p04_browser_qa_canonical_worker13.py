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
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT
OUT = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261114/p04-canonical-browser-v1"
)
NODE = Path(r"C:\nvm4w\nodejs\node.exe")
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
SERVER = STAGE / "tools/server.mjs"
HOST = "127.0.0.1"
PORT = 4188
BASE = f"http://{HOST}:{PORT}/"
HASH_EXT = {".mjs", ".js", ".css"}
PHOTOS = (
    "giaoDien.jpg", "lf.jpg", "hf.jpg", "dual.jpg",
    "zoom.jpg", "zoom2.jpg", "nav1.jpg", "nav2.jpg",
)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def write_once(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)


def runtime_path(url: str) -> Path | None:
    path = urlsplit(url).path
    if path == "/":
        return STAGE / "web/index.html"
    if path.startswith("/web/"):
        return STAGE / "web" / path[5:]
    if path.startswith("/src/"):
        return STAGE / "src" / path[5:]
    return None


def manifest() -> list[dict]:
    rows = []
    for folder in ("src", "web"):
        for path in sorted((STAGE / folder).rglob("*")):
            if path.is_file() and path.suffix.lower() in HASH_EXT:
                rows.append({
                    "path": path.relative_to(STAGE).as_posix(),
                    "bytes": path.stat().st_size,
                    "sha256": sha256_file(path),
                })
    return rows


def manifest_sha(rows: list[dict]) -> str:
    return sha256_bytes(json.dumps(
        rows, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def port_free() -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((HOST, PORT))
            return True
        except OSError:
            return False


def wait_server(proc: subprocess.Popen) -> None:
    deadline = time.time() + 8
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"strict server exited early {proc.returncode}")
        try:
            with urlopen(BASE, timeout=1) as response:
                if response.status == 200:
                    return
        except Exception:
            pass
        time.sleep(0.15)
    raise RuntimeError("strict server did not become ready")


def photo_deny() -> dict:
    rows = []
    for name in PHOTOS:
        url = BASE.rstrip("/") + "/sources/FCV588_GiaoDienThucTeMay2016/" + name
        status = None
        try:
            with urlopen(url, timeout=2) as response:
                status = response.status
        except HTTPError as exc:
            status = exc.code
        rows.append({"name": name, "statusCode": status,
                     "status": "PASS" if status == 404 else "FAILED"})
    return {"status": "PASS" if all(r["status"] == "PASS" for r in rows)
            else "FAILED", "paths": rows}


def boot(page) -> None:
    page.locator("#btn-pause").click()
    page.locator("#key-power").click()
    for _ in range(4):
        page.locator("#btn-step").click()
    page.wait_for_timeout(160)
    if not page.locator("#off-screen").is_hidden():
        raise AssertionError("boot did not reach powered-on LCD")


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
        raise AssertionError(f"mode expected {target}, got {actual}")


def set_bottom_lock(page) -> dict:
    page.locator("#key-menu").click()
    for _ in range(11):
        page.locator("#pad-down").click()
    row = page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
    if "Zoom Mode" not in row.inner_text():
        raise AssertionError("Zoom Mode row not reached")
    page.locator("#key-enter").click()
    current = page.locator("#lcd-menu-options [aria-current='true']").inner_text().strip()
    for _ in range(4):
        if current == "Bottom Lock":
            break
        page.locator("#pad-left").click()
        current = page.locator(
            "#lcd-menu-options [aria-current='true']").inner_text().strip()
    if current != "Bottom Lock":
        raise AssertionError("Bottom Lock not selectable")
    page.locator("#key-enter").click()
    page.locator("#key-menu").click()
    page.wait_for_timeout(100)
    return {"zoomMode": current}


def setup(page, name: str) -> dict:
    if name.startswith("DUAL"):
        move_mode(page, "DUAL", 1)
    elif name.startswith("BL"):
        proof = set_bottom_lock(page)
        move_mode(page, "LF-ZOOM", -1)
        proof["header"] = page.locator("#screen-top").text_content()
        return proof
    elif name.startswith("NAV1"):
        move_mode(page, "NAV1", -2)
    elif name.startswith("NAV2"):
        move_mode(page, "NAV2", 4)
    return {"mode": page.locator("#mode-state").inner_text().strip()}


def geometry_proof(page, name: str) -> dict:
    return page.evaluate("""name => {
      const rect = el => {
        const r=el.getBoundingClientRect();
        return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,
          width:r.width,height:r.height};
      };
      const lcd=document.getElementById('lcd');
      const depth=document.querySelector('.depth-indicator');
      const lcdRect=rect(lcd), depthRect=rect(depth);
      const mode=document.getElementById('mode-state').textContent.trim();
      const anchor=parseFloat(getComputedStyle(depth)
        .getPropertyValue('--dual-depth-anchor'));
      const dividerX=Number.isFinite(anchor)
        ?lcdRect.left+lcdRect.width*anchor/100:null;
      return {
        name,mode,lcdRect,depthRect,
        depthHidden:depth.hidden,
        dualAnchorPercent:Number.isFinite(anchor)?anchor:null,
        dividerX,
        depthIntersectsDivider:dividerX===null?null:
          depthRect.left<dividerX && depthRect.right>dividerX,
        header:document.getElementById('screen-top').textContent,
        scrollWidth:document.documentElement.scrollWidth,
        viewportWidth:innerWidth,
      };
    }""", name)


def bottom_lock_flat_proof(page) -> dict:
    return page.evaluate("""() => {
      const canvas=document.getElementById('echo-canvas');
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const {width,height}=canvas;
      const data=ctx.getImageData(0,0,width,height).data;
      // Stay clear of the large DEPTH DOM overlay and right-edge tick labels.
      const x0=105,x1=180,y0=Math.floor(height*.72);
      const rows=[];
      for(let y=y0;y<height;y++){
        let strong=0;
        for(let x=x0;x<=x1;x++){
          const i=(y*width+x)*4;
          const r=data[i],g=data[i+1],b=data[i+2];
          // Strong independently-authored sonar palette colors (including
          // translucent bottom-zone blending), excluding the blue background.
          if(r>=115 && g>=25 && r>b*1.15)strong++;
        }
        rows.push({y,strong});
      }
      rows.sort((a,b)=>b.strong-a.strong || b.y-a.y);
      const best=rows[0];
      const sampleWidth=x1-x0+1;
      return {
        sample:{x0,x1,y0,height,width},
        strongestRow:best.y,
        strongPixels:best.strong,
        sampleWidth,
        coverage:best.strong/sampleWidth,
        inLowerBand:best.y>=Math.floor(height*.88),
        topRows:rows.slice(0,5),
      };
    }""")


def run_case(browser, prefix: str, width: int, height: int, name: str) -> dict:
    result = {
        "name": name, "viewport": {"width": width, "height": height},
        "status": "NOT_RUN", "consoleErrors": [], "pageErrors": [],
        "requestFailures": [], "externalRequests": [], "bodyErrors": [],
        "loadedBodies": [], "objectiveFailures": [],
    }
    context = None
    try:
        context = browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=1, locale="vi-VN")
        page = context.new_page()
        origin = urlsplit(BASE)
        loaded = []
        page.on("console", lambda m: result["consoleErrors"].append(
            {"type": m.type, "text": m.text}) if m.type == "error" else None)
        page.on("pageerror", lambda e: result["pageErrors"].append(str(e)))
        page.on("requestfailed", lambda req: result["requestFailures"].append(req.url))
        page.on("request", lambda req: result["externalRequests"].append(req.url)
                if (urlsplit(req.url).scheme, urlsplit(req.url).hostname,
                    urlsplit(req.url).port) !=
                   (origin.scheme, origin.hostname, origin.port) else None)

        def record(req):
            try:
                response = req.response()
                if response is None:
                    return
                parsed = urlsplit(response.url)
                if (parsed.scheme, parsed.hostname, parsed.port) != (
                        origin.scheme, origin.hostname, origin.port):
                    return
                local = runtime_path(response.url)
                if local is None or local.suffix.lower() not in HASH_EXT:
                    return
                body = response.body()
                body_sha = sha256_bytes(body)
                source_sha = sha256_file(local)
                loaded.append({
                    "path": local.relative_to(STAGE).as_posix(),
                    "bodySha256": body_sha,
                    "sourceSha256": source_sha,
                    "matches": body_sha == source_sha,
                })
            except Exception as exc:
                result["bodyErrors"].append(str(exc))

        page.on("requestfinished", record)
        response = page.goto(BASE, wait_until="networkidle", timeout=30000)
        if response is None or response.status != 200:
            raise AssertionError("root did not load HTTP 200")
        boot(page)
        result["setupProof"] = setup(page, name)
        result["geometryProof"] = geometry_proof(page, name)
        if name.startswith("BL"):
            result["bottomLockFlatProof"] = bottom_lock_flat_proof(page)
            if (not result["bottomLockFlatProof"]["inLowerBand"]
                    or result["bottomLockFlatProof"]["coverage"] < 0.5):
                result["objectiveFailures"].append(
                    "Bottom Lock strong seabed core is not a broad flat row in the lower band")
        if name.startswith("DUAL") and not result["geometryProof"]["depthIntersectsDivider"]:
            result["objectiveFailures"].append("DUAL depth readout does not intersect divider")
        if name.startswith("NAV") and not result["geometryProof"]["depthHidden"]:
            result["objectiveFailures"].append(
                "NAV modes must not invent a global depth fallback outside selectable boxes")
        if result["geometryProof"]["scrollWidth"] > width:
            result["objectiveFailures"].append("horizontal overflow")

        shot = OUT / f"{prefix}-{width}x{height}-{name}.png"
        if shot.exists():
            raise FileExistsError(f"screenshot exists: {shot}")
        if width <= 700:
            page.locator(".device-frame").scroll_into_view_if_needed()
        else:
            page.evaluate("window.scrollTo(0,0)")
        page.wait_for_timeout(120)
        page.screenshot(path=str(shot), full_page=False)
        result["screenshot"] = {
            "path": str(shot), "bytes": shot.stat().st_size,
            "sha256": sha256_file(shot),
        }
        page.wait_for_timeout(150)
        loaded.sort(key=lambda r:(r["path"],r["bodySha256"]))
        result["loadedBodies"] = loaded
        if not loaded or not all(row["matches"] for row in loaded):
            result["objectiveFailures"].append("loaded JS/CSS body differs from canonical source")
        for key, label in [
            ("consoleErrors", "console errors"),
            ("pageErrors", "page errors"),
            ("requestFailures", "request failures"),
            ("externalRequests", "external requests"),
            ("bodyErrors", "body read errors"),
        ]:
            if result[key]:
                result["objectiveFailures"].append(label)
        result["status"] = "PASS" if not result["objectiveFailures"] else "FAILED"
    except Exception as exc:
        result["status"] = "FAILED"
        result["objectiveFailures"].append(str(exc))
        result["failure"] = {"error": str(exc), "traceback": traceback.format_exc()}
    finally:
        if context is not None:
            context.close()
    return result


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    run_id = (datetime.now().astimezone().strftime("%Y%m%dT%H%M%S%z")
              + "-" + uuid.uuid4().hex[:8])
    prefix = "fcv588-p04-canonical-browser-blflat-" + run_id
    receipt_path = OUT / f"{prefix}.json"
    events_path = OUT / f"{prefix}-events.json"
    stdout_path = OUT / f"{prefix}-server.stdout.txt"
    stderr_path = OUT / f"{prefix}-server.stderr.txt"
    manifest_path = OUT / f"{prefix}-sha256.txt"
    before = manifest()
    receipt = {
        "schema": "fcv588-p04-canonical-browser-blflat-v2",
        "canonicalRoot": str(STAGE), "port": PORT,
        "sourceManifestBefore": {
            "files": len(before), "sha256": manifest_sha(before)},
        "photoDeny": {"status": "NOT_RUN", "paths": []},
        "cases": [], "objectiveFailures": [], "overallStatus": "NOT_RUN",
        "serverCleanup": "NOT_RUN",
    }
    proc = browser = out_handle = err_handle = None
    raw = {"cases": []}
    try:
        if not port_free():
            raise RuntimeError(f"port {PORT} occupied")
        out_handle = open(stdout_path, "xb")
        err_handle = open(stderr_path, "xb")
        env = dict(os.environ)
        env["PORT"] = str(PORT)
        proc = subprocess.Popen(
            [str(NODE), str(SERVER)], cwd=str(STAGE), env=env,
            stdout=out_handle, stderr=err_handle,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        wait_server(proc)
        receipt["server"] = {
            "path": str(SERVER), "sha256": sha256_file(SERVER),
            "node": str(NODE), "pid": proc.pid,
        }
        receipt["photoDeny"] = photo_deny()
        if receipt["photoDeny"]["status"] != "PASS":
            receipt["objectiveFailures"].append("OEM photo URLs not denied")
        cases = [
            (1366, 768, "LF-Blue"),
            (1366, 768, "DUAL-Blue"),
            (1366, 768, "BL-LF-Blue"),
            (1366, 768, "NAV1-Blue"),
            (1366, 768, "NAV2-Blue"),
            (375, 812, "DUAL-Blue"),
            (1920, 1080, "NAV2-Blue"),
        ]
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                executable_path=str(CHROME), headless=False)
            receipt["browser"] = {
                "version": browser.version, "executable": str(CHROME)}
            for width, height, name in cases:
                case = run_case(browser, prefix, width, height, name)
                receipt["cases"].append({
                    k:v for k,v in case.items() if k not in (
                        "consoleErrors","pageErrors","requestFailures",
                        "externalRequests","bodyErrors","loadedBodies")
                } | {
                    "loadedBodyCount": len(case["loadedBodies"]),
                    "loadedBodyAggregateSha256": sha256_bytes(json.dumps(
                        case["loadedBodies"], sort_keys=True,
                        separators=(",", ":")).encode("utf-8")),
                    "errorCounts": {
                        "console": len(case["consoleErrors"]),
                        "page": len(case["pageErrors"]),
                        "requestFailed": len(case["requestFailures"]),
                        "external": len(case["externalRequests"]),
                        "body": len(case["bodyErrors"]),
                    }
                })
                raw["cases"].append({
                    "name": name, "viewport": case["viewport"],
                    "loadedBodies": case["loadedBodies"],
                    "consoleErrors": case["consoleErrors"],
                    "pageErrors": case["pageErrors"],
                    "requestFailures": case["requestFailures"],
                    "externalRequests": case["externalRequests"],
                    "bodyErrors": case["bodyErrors"],
                })
                if case["status"] != "PASS":
                    receipt["objectiveFailures"].extend(
                        f"{width}x{height} {name}: {x}"
                        for x in case["objectiveFailures"])
            browser.close()
            browser = None
        after = manifest()
        receipt["sourceManifestAfter"] = {
            "files": len(after), "sha256": manifest_sha(after)}
        receipt["sourceTreeStable"] = before == after
        if not receipt["sourceTreeStable"]:
            receipt["objectiveFailures"].append("canonical JS/CSS source changed during browser QA")
        receipt["overallStatus"] = "PASS" if (
            len(receipt["cases"]) == 7
            and all(c["status"] == "PASS" for c in receipt["cases"])
            and receipt["photoDeny"]["status"] == "PASS"
            and receipt["sourceTreeStable"]
            and not receipt["objectiveFailures"]
        ) else "FAILED"
    except Exception as exc:
        receipt["overallStatus"] = "FAILED"
        receipt["objectiveFailures"].append(str(exc))
        receipt["fatalError"] = traceback.format_exc()
    finally:
        if browser is not None:
            browser.close()
        if proc is not None:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=4)
            receipt["serverCleanup"] = "PASS" if proc.poll() is not None else "FAILED"
        if out_handle is not None:
            out_handle.close()
        if err_handle is not None:
            err_handle.close()
        receipt["finishedAt"] = datetime.now().astimezone().isoformat()
        write_once(receipt_path, (json.dumps(
            receipt, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
        write_once(events_path, (json.dumps(
            raw, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
        artifacts = sorted(p for p in OUT.iterdir()
                           if p.is_file() and p.name.startswith(prefix))
        lines = [f"{sha256_file(p)} *{p.name}" for p in artifacts]
        write_once(manifest_path, ("\n".join(lines)+"\n").encode("ascii"))
        print(json.dumps({
            "status": receipt["overallStatus"],
            "objectiveFailures": receipt["objectiveFailures"],
            "receipt": str(receipt_path),
            "receiptSha256": sha256_file(receipt_path),
            "eventsSha256": sha256_file(events_path),
            "manifestSha256": sha256_file(manifest_path),
            "cleanup": receipt["serverCleanup"],
            "cases": [{
                "name": c["name"], "viewport": c["viewport"],
                "status": c["status"],
                "screenshotSha256": (c.get("screenshot") or {}).get("sha256"),
                "geometryProof": c.get("geometryProof"),
                "errors": c.get("errorCounts"),
            } for c in receipt["cases"]],
        }, ensure_ascii=False, indent=2))
    return 0 if receipt["overallStatus"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
