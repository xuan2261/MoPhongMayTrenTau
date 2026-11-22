#!/usr/bin/env python3
"""Staging V34 served-asset integrity / negative route security check only.

This script is scoped to this isolated staging tree. It never imports product
reducers, runs V31 Phase2 Verify, reads copyright-protected reference media,
connects to ship devices, or writes canonical source.
"""
from __future__ import annotations
from pathlib import Path
from hashlib import sha256
import json
import os
import socket
import subprocess
import time
from urllib.request import urlopen,Request
from urllib.error import HTTPError
from datetime import datetime,timezone

ROOT=Path(__file__).resolve().parents[1]
PORT=4196
HOST="127.0.0.1"
URL=f"http://{HOST}:{PORT}"
RECEIPT=ROOT/"docs/qa"/"FCV588_V34_CANONICAL_SERVED_SOURCE_20261018.json"
ALLOWED={
    "web":{".html",".mjs",".js",".css",".svg"},
    "src":{".mjs",".js"}
}
def digest(data:bytes)->str:
    return sha256(data).hexdigest()
def paths():
    for directory,extensions in ALLOWED.items():
        for p in sorted((ROOT/directory).rglob("*")):
            if p.is_file() and p.suffix.lower() in extensions:
                yield p
def fetch(path:str,method:str="GET"):
    with urlopen(Request(URL+path,method=method),timeout=4) as res:
        return res.status,res.headers,res.read()
def expected_error(path:str,method:str,code:int):
    try:
        fetch(path,method)
    except HTTPError as err:
        assert err.code==code,(path,method,code,err.code)
        return {"path":path,"method":method,"expectedStatus":code,
                "actualStatus":err.code,"passed":True}
    raise AssertionError(f"Denied request unexpectedly returned 200: {method} {path}")

def run():
    if RECEIPT.exists():
        raise RuntimeError("Refusing to overwrite stage source receipt")
    with socket.socket() as s:
        s.settimeout(.3)
        if s.connect_ex((HOST,PORT))==0:
            raise RuntimeError("Staging QA port already in use; refuse foreign server")
    records=[]
    files=list(paths())
    before={p.relative_to(ROOT).as_posix():digest(p.read_bytes()) for p in files}
    env=os.environ.copy()
    env["PORT"]=str(PORT)
    flags=getattr(subprocess,"CREATE_NO_WINDOW",0)
    server=subprocess.Popen(["node",str(ROOT/"tools"/"server.mjs")],
        cwd=str(ROOT),env=env,stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=flags)
    try:
        for _ in range(60):
            if server.poll() is not None:
                raise RuntimeError("Staging-only static server exited unexpectedly")
            try:
                if fetch("/")[0]==200:break
            except (OSError,TimeoutError):
                time.sleep(.1)
        else:
            raise RuntimeError("Staging-only server did not become ready")
        for file in files:
            name=file.relative_to(ROOT).as_posix()
            served="/"+name
            status,headers,body=fetch(served)
            sha=before[name]
            assert status==200 and digest(body)==sha,(served,status,sha,digest(body))
            assert headers.get("X-Content-Type-Options")=="nosniff",served
            assert "connect-src 'none'" in headers.get("Content-Security-Policy",""),served
            records.append({"path":name,"status":status,"sha256":sha,
                "bytes":len(body),"contentType":headers.get("Content-Type")})
        rootStatus,rootHeaders,rootBytes=fetch("/")
        assert rootStatus==200 and rootBytes==(ROOT/"web"/"index.html").read_bytes()
        denied=[
            expected_error("/docs/qa/FCV588_V31_EVIDENCE_SUMMARY.json","GET",404),
            expected_error("/sources/manuals/FCV-588/document.pdf","GET",404),
            expected_error("/web/../docs/qa/secret.txt","GET",404),
            expected_error("/","POST",405)
        ]
        after={p.relative_to(ROOT).as_posix():digest(p.read_bytes()) for p in files}
        assert before==after,"staged source drift during loopback readback"
        manifestSha=digest(json.dumps(records,sort_keys=True,separators=(",",":")).encode())
        payload={
            "collectedAtUtc":datetime.now(timezone.utc).isoformat(),
            "scope":"CANONICAL_V34_POST_INTEGRATION_36_FILES_SERVER_SOURCE_INTEGRITY",
            "port":PORT,"servedFiles":len(records),
            "manifestSha256":manifestSha,"sourceStable":True,
            "runtimeFiles":records,"negativeRoutes":denied,
            "rootMapsToWebIndex":True,"noExternalIOTested":True,
            "supervision":"GPT6_USER_APPROVED_POST_INTEGRATION",
            "hardwareValidated":False,"releaseApproval":"HOLD",
            "status":"CANONICAL_V34_SERVED_SOURCE_PASS"
        }
        with RECEIPT.open("x",encoding="utf-8",newline="\n") as out:
            json.dump(payload,out,ensure_ascii=False,indent=2)
            out.write("\n")
        print(json.dumps({"status":payload["status"],
            "servedFiles":len(records),"negativeRoutes":len(denied),
            "manifestSha256":manifestSha,
            "receiptSha256":digest(RECEIPT.read_bytes())},ensure_ascii=False))
    finally:
        server.terminate()
        try:server.wait(timeout=4)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=4)
if __name__=="__main__":
    run()


