"""Write-once V1 browser screenshot evidence-integrity HOLD; does not modify prior files."""
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent
V1=ROOT/"P15_CANONICAL_CHROME_MODE_GEOMETRY_V1_20261116.json"
V2=ROOT/"P15_CANONICAL_CHROME_MODE_GEOMETRY_SEALED_V2_20261116.json"
OUT=ROOT/"P15_CANONICAL_CHROME_V1_SCREENSHOT_EVIDENCE_HOLD_20261116.json"
def h(path):return hashlib.sha256(path.read_bytes()).hexdigest()
a=json.loads(V1.read_text(encoding='utf8'));b=json.loads(V2.read_text(encoding='utf8'))
assert len(a['screenshots'])==len(b['screenshots'])==24
rows=[]
for x in a['screenshots']:
 p=Path(x['file']);assert p.is_file()
 observed=h(p)
 if observed!=x['sha256']:
  rows.append({'name':p.name,'receiptSHA256':x['sha256'],'currentFileSHA256':observed,'receiptDoesNotMatchFile':True,'fileModifiedTimeUTC':p.stat().st_mtime})
assert len(rows)==7
assert len(b['checks'])==103 and all(x['pass'] for x in b['checks']) and not b['errors']
replacementFiles=[]
for shot in b['screenshots']:
 p=Path(shot['file']);assert p.is_file() and h(p)==shot['sha256']
 replacementFiles.append(p.name)
assert len(set(replacementFiles))==24
result={'schema':'P15_REAL_CHROME_V1_EVIDENCE_INTEGRITY_HOLD_V1','verdict':'V1_RECEIPT_SCREENSHOT_SHA_INCONSISTENT; EXCLUDE_FROM_FINAL_SCREENSHOT_ATTESTATION','v1ReceiptSHA256':h(V1),'v1MismatchCount':7,'v1Mismatches':rows,'v1RetainedUnchanged':True,'observedCause':'UNKNOWN; seven on-disk PNGs no longer match values stored in V1 receipt, regardless of decoded image appearance','v2ReplacementReceipt':'P15_CANONICAL_CHROME_MODE_GEOMETRY_SEALED_V2_20261116.json','v2ReplacementReceiptSHA256':h(V2),'v2ReceiptChecks':'103/103 PASS','v2ScreenshotShaMatchesAllFiles':24,'noRuntimeChangeForThisReconciliation':True}
with OUT.open('x',encoding='utf8') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'status':result['verdict'],'v1Mismatch':7,'v2ImageHashes':24,'receiptSHA256':h(OUT)},ensure_ascii=True))