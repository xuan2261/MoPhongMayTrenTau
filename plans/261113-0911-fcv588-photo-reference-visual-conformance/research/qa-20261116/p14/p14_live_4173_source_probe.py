"""Read-only postapply probe of the owner's already-running localhost server."""
from pathlib import Path
from hashlib import sha256
from urllib.request import urlopen
from urllib.error import HTTPError
import json
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path(__file__).resolve().parent
OUT=QA/"P14_CANONICAL_USER_SERVER4173_SOURCE_PROBE_20261116.json"
HOST="http://127.0.0.1:4173"
paths=["/src/devices/fcv588/profile-version.mjs","/src/devices/fcv588/menu-atlas.mjs","/src/devices/fcv588/menu-atlas-profile21.mjs","/src/devices/fcv588/navigation-profile21.mjs","/src/devices/fcv588/replay-compat.mjs","/web/lcd-presentation.mjs","/web/app.mjs"]
rows=[]
for path in paths:
 with urlopen(HOST+path,timeout=8) as r:
  data=r.read()
  status=r.status
  csp=r.headers.get("Content-Security-Policy")
 local=(ROOT/path[1:]).read_bytes()
 rows.append({"path":path,"httpStatus":status,"httpSHA256":sha256(data).hexdigest(),"localSHA256":sha256(local).hexdigest(),"match":data==local and status==200 and "connect-src 'none'" in (csp or "")})
denials=[]
for name in ["dual.jpg","giaoDien.jpg","hf.jpg","lf.jpg","nav1.jpg","nav2.jpg","zoom.jpg","zoom2.jpg"]:
 route="/sources/FCV588_GiaoDienThucTeMay2016/"+name
 try:
  with urlopen(HOST+route,timeout=8) as r:code=r.status
 except HTTPError as ex:code=ex.code
 denials.append({"path":route,"status":code})
valid=all(x["match"] for x in rows) and all(x["status"]==404 for x in denials)
receipt={"schema":"P14_LIVE_USER_SERVER_READ_ONLY_PROBE_V1","server":"127.0.0.1:4173","status":"PASS" if valid else "FAIL","servedSource":rows,"referenceOnlyAccess":denials,"canonicalModified":False}
with OUT.open("x",encoding="utf8") as f:json.dump(receipt,f,indent=2);f.write("\n")
print(json.dumps({"status":receipt["status"],"httpSourceSHA":len(rows),"sourceMatch":sum(x["match"] for x in rows),"oemDenied":sum(x["status"]==404 for x in denials),"receiptSHA256":sha256(OUT.read_bytes()).hexdigest()}))
if not valid:raise SystemExit(1)