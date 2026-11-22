from __future__ import annotations

import hashlib
import http.client
import json
import os
import re
import subprocess
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
QA = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261116/p07-security-replay"
)
FINAL = ROOT / "docs/qa/FCV588_P04_PROVENANCE_20261116/FCV588_P04_PROVENANCE_FINAL_INTEGRITY_20261116.json"
POST = ROOT / "docs/qa/FCV588_P04_PROVENANCE_20261116/FCV588_P04_PROVENANCE_INDEPENDENT_POSTRECEIPT_20261116.json"
NODE_PROBE = QA / "p07_replay_probe.mjs"
REPLAY_RESULT = QA / "P07_REPLAY_PROBE_RESULT_20261116.json"
RECEIPT = QA / "P07_SECURITY_REPLAY_QA_RECEIPT_20261116.json"
MANIFEST = QA / "P07_SECURITY_REPLAY_QA_SHA256_20261116.txt"
NODE = Path(r"C:\nvm4w\nodejs\node.exe")
HOST = "127.0.0.1"
PORT = 4173

EXPECTED_FINAL = "94d9bf997408d8fb51140b723319ea59faefb8122f66233839ad5a8f39b243d2"
EXPECTED_POST = "132facb60daba96a7e7c0cfa38b3e8d8b414e3b852a98e79b14b390620303a9d"
PHOTOS = (
    "giaoDien.jpg", "lf.jpg", "hf.jpg", "dual.jpg",
    "zoom.jpg", "zoom2.jpg", "nav1.jpg", "nav2.jpg",
)
SOURCE_PATHS = (
    "tools/server.mjs",
    "src/core/session.mjs",
    "src/core/protocol.mjs",
    "src/core/scenario.mjs",
    "src/devices/fcv588/adapter.mjs",
    "src/devices/fcv588/model.mjs",
    "src/devices/fcv588/profile-version.mjs",
    "src/devices/fcv588/echo-projection.mjs",
    "web/index.html",
    "web/app.mjs",
    "web/styles.css",
    "web/favicon.svg",
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bytes_sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_once(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)


def powershell_json(script: str):
    completed = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    text = completed.stdout.strip()
    return json.loads(text) if text else None


def server_process() -> dict:
    script = rf"""
$c=Get-NetTCPConnection -LocalPort {PORT} -State Listen -ErrorAction Stop
$rows=@($c | ForEach-Object {{
  $p=Get-CimInstance Win32_Process -Filter ("ProcessId="+$_.OwningProcess)
  [pscustomobject]@{{LocalAddress=$_.LocalAddress;LocalPort=$_.LocalPort;
    OwningProcess=$_.OwningProcess;State=[string]$_.State;ProcessName=$p.Name;
    ParentProcessId=$p.ParentProcessId;CreationDate=[string]$p.CreationDate;
    CommandLine=$p.CommandLine}}
}})
$rows | ConvertTo-Json -Compress -Depth 4
"""
    data = powershell_json(script)
    rows = data if isinstance(data, list) else [data]
    return {"listeners": rows}


def process_sockets(pid: int) -> dict:
    script = rf"""
$tcp=@(Get-NetTCPConnection -OwningProcess {pid} -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,@{{N='State';E={{[string]$_.State}}}})
$udp=@(Get-NetUDPEndpoint -OwningProcess {pid} -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort)
[pscustomobject]@{{tcp=$tcp;udp=$udp}} | ConvertTo-Json -Compress -Depth 5
"""
    data = powershell_json(script) or {"tcp": [], "udp": []}
    for key in ("tcp", "udp"):
        if data.get(key) is None:
            data[key] = []
        elif isinstance(data[key], dict):
            data[key] = [data[key]]
    return data


def socket_boundary(sockets: dict) -> dict:
    loopbacks = {"127.0.0.1", "::1"}
    bad = []
    for row in sockets.get("tcp", []):
        local = str(row.get("LocalAddress", ""))
        state = str(row.get("State", ""))
        remote = str(row.get("RemoteAddress", ""))
        if local not in loopbacks:
            bad.append({"reason": "non-loopback-local", **row})
        if state.lower() not in {"listen", "bound"} and remote not in loopbacks | {"0.0.0.0", "::", ""}:
            bad.append({"reason": "non-loopback-remote", **row})
    for row in sockets.get("udp", []):
        if str(row.get("LocalAddress", "")) not in loopbacks:
            bad.append({"reason": "non-loopback-udp", **row})
    return {"status": "PASS" if not bad else "FAILED", "bad": bad, "snapshot": sockets}


def http_request(method: str, path: str, body: bytes | None = None) -> dict:
    conn = http.client.HTTPConnection(HOST, PORT, timeout=3)
    try:
        conn.request(method, path, body=body,
                     headers={"Connection": "close", "User-Agent": "P07-read-only-QA"})
        response = conn.getresponse()
        payload = response.read()
        return {
            "method": method, "path": path, "statusCode": response.status,
            "bodyBytes": len(payload), "bodySha256": bytes_sha(payload),
            "contentType": response.getheader("Content-Type"),
            "contentSecurityPolicy": response.getheader("Content-Security-Policy"),
            "xContentTypeOptions": response.getheader("X-Content-Type-Options"),
            "cacheControl": response.getheader("Cache-Control"),
        }
    finally:
        conn.close()


class ResourceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs: list[dict] = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in {"src", "href", "action", "formaction"} and value:
                self.refs.append({"tag": tag, "attribute": key, "value": value})


def static_transport_scan(runtime: dict[str, str]) -> dict:
    text_paths = [rel for rel in runtime if Path(rel).suffix.lower() in
                  {".mjs", ".js", ".html", ".css", ".svg"}]
    api_patterns = {
        "fetch": r"\bfetch\s*\(",
        "XMLHttpRequest": r"\bXMLHttpRequest\b",
        "WebSocket": r"\bWebSocket\b",
        "EventSource": r"\bEventSource\b",
        "sendBeacon": r"\bsendBeacon\b",
        "WebTransport": r"\bWebTransport\b",
        "WebSerial": r"\bnavigator\s*\.\s*serial\b|\bSerialPort\b",
        "WebUSB": r"\bnavigator\s*\.\s*usb\b|\bUSBDevice\b",
        "WebHID": r"\bnavigator\s*\.\s*hid\b|\bHIDDevice\b",
        "Bluetooth": r"\bnavigator\s*\.\s*bluetooth\b|\bBluetoothDevice\b",
        "geolocation": r"\bnavigator\s*\.\s*geolocation\b|\bgetCurrentPosition\b|\bwatchPosition\b",
    }
    api_hits = []
    external_urls = []
    data_uris = []
    imports = []
    for rel in sorted(text_paths):
        text = (ROOT / rel).read_text(encoding="utf-8")
        for name, pattern in api_patterns.items():
            for match in re.finditer(pattern, text, re.I):
                api_hits.append({"path": rel, "api": name, "offset": match.start()})
        for match in re.finditer(r"(?i)\b(?:https?|wss?)://[^\s\"'<>]+", text):
            value = match.group(0).rstrip(")]}.,;")
            classification = "SVG_NAMESPACE_ONLY" if (
                rel == "web/favicon.svg" and value == "http://www.w3.org/2000/svg"
            ) else "EXTERNAL_URL"
            external_urls.append({"path": rel, "value": value,
                                  "classification": classification})
        for match in re.finditer(r"(?i)data:[^\s\"')]+", text):
            data_uris.append({"path": rel, "prefix": match.group(0)[:96]})
        if Path(rel).suffix.lower() in {".mjs", ".js"}:
            patterns = [
                r"(?:import|export)\s+(?:[^\"']*?\s+from\s+)?[\"']([^\"']+)[\"']",
                r"import\s*\(\s*[\"']([^\"']+)[\"']\s*\)",
            ]
            for pattern in patterns:
                for spec in re.findall(pattern, text, re.S):
                    imports.append({"path": rel, "specifier": spec,
                                    "local": spec.startswith(("./", "../", "/"))})
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    parser = ResourceParser(); parser.feed(html)
    html_refs = [{**ref, "local": ref["value"].startswith(("/", "./", "../", "#"))}
                 for ref in parser.refs]
    css = (ROOT / "web/styles.css").read_text(encoding="utf-8")
    css_refs = [m.group(1).strip(" \t\"'") for m in
                re.finditer(r"(?i)url\(([^)]+)\)", css)]
    css_imports = [m.group(1) for m in
                   re.finditer(r"(?i)@import\s+(?:url\()?\s*[\"']?([^\"')\s;]+)", css)]
    bad_urls = [row for row in external_urls if row["classification"] == "EXTERNAL_URL"]
    bad_imports = [row for row in imports if not row["local"]]
    bad_html = [row for row in html_refs if not row["local"]]
    bad_css = [ref for ref in css_refs + css_imports
               if re.match(r"(?i)^(?:https?:|wss?:|//|file:|ftp:)", ref)]
    status = "PASS" if not (api_hits or bad_urls or bad_imports or bad_html or bad_css) else "FAILED"
    return {
        "status": status, "scannedPaths": sorted(text_paths),
        "apiHits": api_hits, "externalUrlLiterals": external_urls,
        "dataUriOccurrences": data_uris, "moduleImports": imports,
        "htmlResourceReferences": html_refs, "cssUrlReferences": css_refs,
        "cssImports": css_imports,
        "interpretation": (
            "SVG namespace URI is metadata, not a fetch target; no active external transport/device API token was found."
            if status == "PASS" else "Unexpected active transport/device reference found."
        ),
    }


def runtime_snapshot(runtime: dict[str, str]) -> dict:
    rows = []
    for rel, expected in sorted(runtime.items()):
        path = ROOT / rel
        actual = sha(path)
        rows.append({"path": rel, "expected": expected, "actual": actual,
                     "match": actual == expected})
    aggregate = hashlib.sha256("".join(
        f"{row['path']}\t{row['actual']}\n" for row in rows
    ).encode("utf-8")).hexdigest()
    return {"count": len(rows), "matches": sum(row["match"] for row in rows),
            "aggregateSha256": aggregate, "rows": rows,
            "status": "PASS" if all(row["match"] for row in rows) else "FAILED"}


def run_replay_probe() -> dict:
    completed = subprocess.run(
        [str(NODE), str(NODE_PROBE)], cwd=ROOT, capture_output=True, text=True,
        timeout=30, check=False,
    )
    if completed.returncode != 0:
        return {"status": "FAILED", "exitCode": completed.returncode,
                "stdout": completed.stdout, "stderr": completed.stderr}
    result = json.loads(completed.stdout)
    write_once(REPLAY_RESULT, (json.dumps(result, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    return {"status": result.get("status"), "exitCode": completed.returncode,
            "result": result, "resultPath": str(REPLAY_RESULT),
            "resultSha256": sha(REPLAY_RESULT), "stderr": completed.stderr}


def main() -> int:
    for output in (REPLAY_RESULT, RECEIPT, MANIFEST):
        if output.exists():
            raise FileExistsError(f"write-once P07 output already exists: {output}")
    final_sha, post_sha = sha(FINAL), sha(POST)
    final = json.loads(FINAL.read_text(encoding="utf-8"))
    runtime = final["runtimeSHA256"]
    before = runtime_snapshot(runtime)
    source_sha = {rel: sha(ROOT / rel) for rel in SOURCE_PATHS}

    process_before = server_process()
    listeners = process_before["listeners"]
    listener_ok = bool(listeners) and all(
        row.get("LocalAddress") == HOST and int(row.get("LocalPort")) == PORT
        and "tools/server.mjs" in str(row.get("CommandLine", "")).replace("\\", "/")
        for row in listeners
    )
    pid = int(listeners[0]["OwningProcess"]) if listeners else -1
    sockets_before = process_sockets(pid) if pid > 0 else {"tcp": [], "udp": []}
    socket_before_boundary = socket_boundary(sockets_before)

    positive = [
        http_request("GET", "/"),
        http_request("HEAD", "/web/app.mjs"),
        http_request("GET", "/web/favicon.svg"),
    ]
    csp = positive[0].get("contentSecurityPolicy") or ""
    header_ok = all(row["statusCode"] == 200 for row in positive) and \
        "connect-src 'none'" in csp and "object-src 'none'" in csp and \
        "base-uri 'none'" in csp and all(row.get("xContentTypeOptions") == "nosniff" for row in positive)

    negatives = []
    for name in PHOTOS:
        path = f"/sources/FCV588_GiaoDienThucTeMay2016/{name}"
        for method in ("GET", "HEAD"):
            row = http_request(method, path)
            row["expected"] = [403, 404]
            row["pass"] = row["statusCode"] in row["expected"] and (method != "HEAD" or row["bodyBytes"] == 0)
            negatives.append(row)
    for path in ("/docs", "/docs/", "/sources/manuals", "/sources/manuals/"):
        for method in ("GET", "HEAD"):
            row = http_request(method, path)
            row["expected"] = [403, 404]
            row["pass"] = row["statusCode"] in row["expected"] and (method != "HEAD" or row["bodyBytes"] == 0)
            negatives.append(row)
    traversal_paths = (
        "/web/%2e%2e%2fdocs",
        "/src/%2e%2e%2fweb%2findex.html",
        "/web/%2e%2e%5csources%5cFCV588_GiaoDienThucTeMay2016%5cgiaoDien.jpg",
        "/web/%2E%2E/%2E%2E/docs",
        "/web/%252e%252e%252fdocs",
        "/%73ources/FCV588_GiaoDienThucTeMay2016/giaoDien.jpg",
    )
    for path in traversal_paths:
        for method in ("GET", "HEAD"):
            row = http_request(method, path)
            row["expected"] = [403, 404]
            row["pass"] = row["statusCode"] in row["expected"] and (method != "HEAD" or row["bodyBytes"] == 0)
            negatives.append(row)
    for path in ("/api", "/admin", "/favicon.ico", "/unknown-root"):
        for method in ("GET", "HEAD"):
            row = http_request(method, path)
            row["expected"] = [404]
            row["pass"] = row["statusCode"] == 404 and (method != "HEAD" or row["bodyBytes"] == 0)
            negatives.append(row)
    for path in ("/", "/web/index.html", "/api"):
        row = http_request("POST", path, body=b"")
        row["expected"] = [405]
        row["pass"] = row["statusCode"] == 405
        negatives.append(row)
    negative_ok = all(row["pass"] for row in negatives)

    static_scan = static_transport_scan(runtime)
    replay_probe = run_replay_probe()

    process_after = server_process()
    sockets_after = process_sockets(pid) if pid > 0 else {"tcp": [], "udp": []}
    socket_after_boundary = socket_boundary(sockets_after)
    same_server = process_after == process_before
    after = runtime_snapshot(runtime)
    source_tree_stable = before["aggregateSha256"] == after["aggregateSha256"] and before["status"] == "PASS" and after["status"] == "PASS"

    replay_result = replay_probe.get("result", {})
    replay_ok = replay_probe.get("status") == "PASS" and \
        replay_result.get("profileRevision") == "F1-public-reference-21" and \
        replay_result.get("session", {}).get("sessionHash") == replay_result.get("session", {}).get("replayHash") and \
        replay_result.get("session", {}).get("wrongProfileRejected") is True
    raw_ok = replay_ok and replay_result.get("rawSonar", {}).get("deterministic") is True and \
        replay_result.get("rawSonar", {}).get("unchangedAcrossDisplayProjection") is True

    boundaries = {
        "p04FinalPostSeals": "PASS" if final_sha == EXPECTED_FINAL and post_sha == EXPECTED_POST else "FAILED",
        "canonicalRuntime39": before["status"],
        "userServerLoopbackBinding": "PASS" if listener_ok else "FAILED",
        "userServerSocketNoExternalSideEffectsBefore": socket_before_boundary["status"],
        "httpNegativeBoundaries": "PASS" if negative_ok else "FAILED",
        "runtimeSecurityHeaders": "PASS" if header_ok else "FAILED",
        "staticTransportAndDeviceApiSurface": static_scan["status"],
        "replaySessionProfile21": "PASS" if replay_ok else "FAILED",
        "rawSonarDeterministicAcrossDisplayModesZoom": "PASS" if raw_ok else "FAILED",
        "userServerSocketNoExternalSideEffectsAfter": socket_after_boundary["status"],
        "userServerProcessUnchanged": "PASS" if same_server else "FAILED",
        "canonicalRuntimeUnchanged": "PASS" if source_tree_stable else "FAILED",
    }
    overall = "PASS" if all(value == "PASS" for value in boundaries.values()) else "FAILED"
    receipt = {
        "schema": "fcv588-p07-independent-security-replay-qa-v1",
        "createdAt": datetime.now().astimezone().isoformat(),
        "status": overall,
        "scope": "P07 independent read-only security/replay QA over sealed canonical P04 provenance",
        "phase07Plan": str(ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/phase-07-independent-visual-qa.md"),
        "sealedParent": {
            "final": {"path": str(FINAL), "sha256": final_sha, "expected": EXPECTED_FINAL,
                      "match": final_sha == EXPECTED_FINAL},
            "post": {"path": str(POST), "sha256": post_sha, "expected": EXPECTED_POST,
                     "match": post_sha == EXPECTED_POST},
        },
        "sourceSha256": source_sha,
        "runtimeManifestBefore": before,
        "runtimeManifestAfter": after,
        "userServer": {
            "operation": "READ_ONLY_EXISTING_SERVER_NO_RESTART_NO_KILL",
            "processBefore": process_before, "processAfter": process_after,
            "sameProcessEvidence": same_server,
            "socketsBefore": socket_before_boundary,
            "socketsAfter": socket_after_boundary,
        },
        "http": {
            "positiveControls": positive,
            "securityHeaderStatus": "PASS" if header_ok else "FAILED",
            "negativeTests": negatives,
            "negativeStatus": "PASS" if negative_ok else "FAILED",
            "testedPhotoNames": list(PHOTOS),
            "testedTraversalPaths": list(traversal_paths),
        },
        "staticSecurity": static_scan,
        "replayProbe": replay_probe,
        "boundaries": boundaries,
        "operations": {
            "runtimeOrTestsModified": False,
            "canonicalModified": False,
            "browserRun": False,
            "port4173RestartOrKill": False,
            "destructiveHttpRequest": False,
            "networkHardwareIo": "NONE; local HTTP negative tests only",
        },
        "holds": {
            "phase6F1": "OPEN", "featureClaims": "65/65 HOLD",
            "hardware": "HOLD", "firmware": "HOLD", "rights": "HOLD", "release": "HOLD",
        },
        "notes": [
            "No browser was used in this P07 security/replay slice.",
            "Static transport evidence is combined with live CSP headers and OS socket ownership/binding evidence; it is not a regexp-only conclusion.",
            "Replay/raw-sonar checks use canonical source-valid TRAINING_SCENARIO and profile21 without altering public observation/session/replay shapes.",
        ],
    }
    write_once(RECEIPT, (json.dumps(receipt, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    manifest_entries = [Path(__file__), NODE_PROBE, REPLAY_RESULT, RECEIPT]
    manifest_text = "\n".join(
        f"{sha(path)} *{path.relative_to(QA).as_posix()}" for path in manifest_entries
    ) + "\n"
    write_once(MANIFEST, manifest_text.encode("ascii"))
    print(json.dumps({
        "status": overall,
        "receipt": str(RECEIPT), "receiptSha256": sha(RECEIPT),
        "manifest": str(MANIFEST), "manifestSha256": sha(MANIFEST),
        "replayProbeSha256": sha(REPLAY_RESULT),
        "runtime": f"{before['matches']}/{before['count']}",
        "httpNegative": f"{sum(row['pass'] for row in negatives)}/{len(negatives)}",
        "boundaries": boundaries,
    }, ensure_ascii=False, indent=2))
    return 0 if overall == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
