"""Read-only PNG byte-vs-rendered-pixel reconciliation of REAL P15 Chrome captures."""
from pathlib import Path
from PIL import Image,ImageChops
from hashlib import sha256
import json
QA=Path(__file__).resolve().parent
STAGE=json.loads((QA/"P15_STAGE_CHROME_MODE_GEOMETRY_V1_20261116.json").read_text(encoding="utf8"))
CANON=json.loads((QA/"P15_CANONICAL_CHROME_MODE_GEOMETRY_SEALED_V2_20261116.json").read_text(encoding="utf8"))
MENU_STAGE=json.loads((QA/"P15_STAGE_CHROME_MENU_CSS_20261116.json").read_text(encoding="utf8"))
MENU_CANON=json.loads((QA/"P15_CANONICAL_CHROME_MENU_CSS_20261116.json").read_text(encoding="utf8"))
OUT=QA/"P15_STAGE_CANONICAL_SEALED_V2_PIXEL_RECONCILIATION_20261116.json"
def hashfile(p):return sha256(p.read_bytes()).hexdigest()
def compare(first,second,label,viewport):
 a=Path(first);b=Path(second)
 assert a.is_file() and b.is_file() and a.parent==QA and b.parent==QA
 ia=Image.open(a).convert('RGBA');ib=Image.open(b).convert('RGBA')
 assert ia.size==ib.size
 delta=ImageChops.difference(ia,ib)
 pixelEqual=delta.getbbox() is None
 return {"label":label,"viewport":viewport,"stageFile":a.name,"canonicalFile":b.name,"stageSha256":hashfile(a),"canonicalSha256":hashfile(b),"byteIdentical":a.read_bytes()==b.read_bytes(),"decodedPixelIdentical":pixelEqual,"changedPixelBounds":delta.getbbox(),"decodedDimensions":list(ia.size)}
assert len(STAGE['screenshots'])==len(CANON['screenshots'])==24
rows=[]
for sa,ca in zip(STAGE['screenshots'],CANON['screenshots']):
 assert sa['label']==ca['label'] and sa['viewport']==ca['viewport']
 row=compare(sa['file'],ca['file'],sa['label'],sa['viewport'])
 assert row['stageSha256']==sa['sha256'] and row['canonicalSha256']==ca['sha256']
 rows.append(row)
assert len(MENU_STAGE['views'])==len(MENU_CANON['views'])==2
for sa,ca in zip(MENU_STAGE['views'],MENU_CANON['views']):
 assert sa['viewport']==ca['viewport']
 row=compare(sa['screenshot'],ca['screenshot'],'Sounder Menu',sa['viewport'])
 assert row['stageSha256']==sa['screenshotSha'] and row['canonicalSha256']==ca['screenshotSha']
 rows.append(row)
assert len(rows)==26 and all(r['decodedPixelIdentical'] for r in rows)
byte=len([r for r in rows if r['byteIdentical']]);pixel=len([r for r in rows if r['decodedPixelIdentical']])
result={"schema":"P15_REAL_CHROME_PNG_BYTE_PIXEL_RECONCILIATION_V1","status":"PASS_DECODED_PIXELS; BYTE_HASH_MISMATCH_PRESERVED","stageBrowserSHA256":hashfile(QA/'P15_STAGE_CHROME_MODE_GEOMETRY_V1_20261116.json'),"canonicalBrowserSHA256":hashfile(QA/'P15_CANONICAL_CHROME_MODE_GEOMETRY_SEALED_V2_20261116.json'),"modeAndZoomCount":24,"menuCount":2,"decodedPixelEqualCount":pixel,"pngByteEqualCount":byte,"pngByteDifferentCount":len(rows)-byte,"source":"Actual independently captured Playwright/Chrome PNG images; per-file SHA pinned and compared, no image generation, no OEM image pixels","interpretation":"Fresh sealed V2 captures checked against all original stage PNG SHA and decoded RGBA pixel arrays; any raw encoding differences are separately counted, with no OEM pixel equivalence implied.","rows":rows,"limitations":"Pixel equality is simulator stage vs canonical only, not OEM photo equivalence or physical certification."}
with OUT.open('x',encoding='utf8') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({"status":"PASS_DECODED_PIXELS","pairs":len(rows),"pixelEqual":pixel,"rawBytesEqual":byte,"rawBytesDifferent":len(rows)-byte,"receiptSHA256":hashfile(OUT)},ensure_ascii=True))