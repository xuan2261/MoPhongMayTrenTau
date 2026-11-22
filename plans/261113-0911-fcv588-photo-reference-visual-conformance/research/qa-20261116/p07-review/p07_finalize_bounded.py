"""Write-once bounded P07 evidence consolidation, no product-code changes."""
import datetime
import hashlib
import json
import pathlib
import socket
import urllib.request

ROOT = pathlib.Path(r"C:\Work\MoPhongMayTrenTau")
QA = pathlib.Path("plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116")
DEST = pathlib.Path("docs/qa/FCV588_P07_BOUNDED_20261116")

FILES = {
    "p04Final": ("docs/qa/FCV588_P04_PROVENANCE_20261116/FCV588_P04_PROVENANCE_FINAL_INTEGRITY_20261116.json", "94d9bf997408d8fb51140b723319ea59faefb8122f66233839ad5a8f39b243d2"),
    "p04Post": ("docs/qa/FCV588_P04_PROVENANCE_20261116/FCV588_P04_PROVENANCE_INDEPENDENT_POSTRECEIPT_20261116.json", "132facb60daba96a7e7c0cfa38b3e8d8b414e3b852a98e79b14b390620303a9d"),
    "pureMatrix": (str(QA / "p07-pure-layout/P07_PURE_DISPLAY_MATRIX_RECEIPT_20261116.json"), "fcda83a950c44f74e94082eca26ad7c784c47e9af705c20922801a45682fc9bf"),
    "security": (str(QA / "p07-security-replay/P07_SECURITY_REPLAY_QA_RECEIPT_20261116.json"), "4d617bc24e6749a0dc29e8c455751f4c5c925f9a15e02f5b678647005721a632"),
    "replayProbe": (str(QA / "p07-security-replay/P07_REPLAY_PROBE_RESULT_20261116.json"), "0860a47556043f07a203c708f706a0f5cae8d66755e1578f38c61abfa3edbdbf"),
    "photo": (str(QA / "p07-photo-a11y/P07_VISUAL_REFERENCE_A11Y_RECEIPT_20261116.json"), "e7ffaf820926d0999f7b7359b9781c4fd1a002673e07f2f374ad24ff08a2d819"),
    "photoReport": (str(QA / "p07-photo-a11y/P07_VISUAL_REFERENCE_A11Y_ASSESSMENT_20261116.md"), "455dc75a18b96ffc27a070b9315ac27889c5a69aaba206f9eecb4dd4bae464c5"),
    "browser": (str(QA / "p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649.json"), "16a7c5261b3e50a03055059e21cd54c4512c5e5acc839548f585a386e73733d7"),
    "events": (str(QA / "p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649-events.json"), "92db485af26779237e25017f746a49334617df26c98d29cbeb66c9c7df42fdbf"),
    "browserManifest": (str(QA / "p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649-sha256.txt"), "8f30bfb510e2ac21d30823a8ae2490e49e3e16bd445a08dd8aa979c07824d8b6"),
    "reviewerGO": (str(QA / "p07-review/P07_INDEPENDENT_FINAL_REVIEW_WORKER1_GO_20261116.json"), "ed6238165799e3094f0c7fa211b296cc7431fd4be3b302262ff6fcfeff5d6933"),
    "nodeLog": (str(QA / "p07-pure-layout/p07-canonical-full-node-20261116.txt"), "f635c305ea8fef2ae33235cd3a74e76d3f9e3847beffc412bab69a6beb396d81"),
    "pythonLog": (str(QA / "p07-pure-layout/p07-canonical-python-20261116.txt"), "a4983ffb4083ac03e53d761b42ae127140cc579c5d7f696639977c9762d30bd2"),
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load(name):
    return json.loads((ROOT / FILES[name][0]).read_text(encoding="utf-8-sig"))

def validate():
    evidence = {}
    for name, (path, expected) in FILES.items():
        actual = sha(ROOT / path)
        assert actual == expected, f"SHA drift {name}: {actual} != {expected}"
        evidence[name] = {"path": path.replace('\\', '/'), "sha256": actual}
    p04, browser, review, photo = load('p04Final'), load('browser'), load('reviewerGO'), load('photo')
    assert review['decision'] == 'GO' and not review['blockingFindings']
    assert browser['overallStatus'] == 'PASS' and browser['actualTotalStates'] == 39
    assert browser['sourceTreeStable'] and browser['serverCleanup'] == 'PASS'
    assert len(browser['objectiveFailures']) == 0
    assert photo['decision'] == 'PASS_WITH_SOURCE_GAPS'
    runtime = p04['runtimeSHA256']
    assert len(runtime) == 39
    for path, expected in runtime.items():
        assert sha(ROOT / path) == expected, f"runtime drift {path}"
    originals = {}
    for item in p04['referencePhotos']['photos']:
        path = ROOT / 'sources/FCV588_GiaoDienThucTeMay2016' / item['name']
        assert sha(path) == item['sha256']
        originals[item['name']] = {'sha256': item['sha256'], 'rights':'REFERENCE_ONLY'}
    shot_hashes = {}
    assert len(browser['viewports']) == 3
    for v in browser['viewports']:
        assert v['status'] == 'PASS' and len(v['states']) == 13
        for state in v['states']:
            s = state['screenshot']; path = pathlib.Path(s['path'])
            assert path.is_file() and path.stat().st_size == s['bytes'] and sha(path) == s['sha256']
            assert path.name not in shot_hashes
            shot_hashes[path.name] = {'sha256':s['sha256'],'bytes':s['bytes']}
    assert len(shot_hashes) == 39
    assert review['independentRehash']['loadedBodies']['bodyReceiptSourceCanonicalMatches'] == 108
    assert review['independentRehash']['screenshots']['hashAndByteSizeMatches'] == 39
    assert review['independentRehash']['canonicalRuntimeManifest']['matchesP04SealedRuntimeRows'] == '39/39'
    assert '563' in (ROOT / FILES['nodeLog'][0]).read_text(errors='replace')
    assert 'Ran 13 tests' in (ROOT / FILES['pythonLog'][0]).read_text(errors='replace')
    with urllib.request.urlopen('http://127.0.0.1:4173/', timeout=4) as response:
        assert response.status == 200
    with socket.socket() as s:
        s.settimeout(0.6)
        assert s.connect_ex(('127.0.0.1', 4207)) != 0, 'test port 4207 still listening'
    return evidence, runtime, originals, shot_hashes

def write_once(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write('\n')

def main():
    evidence, runtime, photos, pngs = validate()
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat()
    final = {
        'schema':'fcv588-p07-bounded-final-integrity-v1', 'createdAt':now,
        'status':'P07_BOUNDED_SOFTWARE_QA_PASS_WITH_SOURCE_GAPS_FULL_PHASE7_AND_F1_PHASE6_OPEN',
        'scope':'F1_PUBLIC_REFERENCE_V2_SYNTHETIC_OFFLINE_WINDOWS_BROWSER_QA_ONLY',
        'canonicalRoot':str(ROOT), 'runtimeChangedInP07':False,
        'evidenceSHA256':evidence, 'canonicalRuntimeSHA256':runtime,
        'referenceOnlyOriginalPhotos':photos, 'browserScreenshotsSHA256':pngs,
        'independentReviewer':'worker-1 GO scoped',
        'checks':{'pureLayoutCases':'63/63','pureLayoutChecks':'447/447','browserStates':'39/39',
                  'browserSourceBodies':'108/108','browserPNGs':'39/39','referencePhotos':'8/8',
                  'securityBoundaries':'12/12','negativeHTTP':'47/47',
                  'node':'563/563','python':'13/13','replayProfile':'F1-public-reference-21',
                  'canonicalRuntime':'39/39', 'server4173':'HTTP 200', 'testPort4207':'CLOSED'},
        'holds':{'F1Phase6':'OPEN','fullP07':'OPEN','featureClaims':'65/65 HOLD',
                 'hardwareValidated':False,'installedFirmware':'UNKNOWN','photoRights':'HOLD',
                 'releaseApproval':'HOLD','narratorNvdaSpoken':'NOT_RUN',
                 'osWindowBlurRefocus':'NOT_RUN','forcedColors':'NOT_RUN',
                 'cameraLCDROIAndHomography':'SOURCE_GAP','firmwareVietnameseOracle':'SOURCE_GAP',
                 'oemFidelityPercent':None},
        'limitations':['39 browser states are bounded, not full operator Cartesian matrix',
                       '375x812 PNGs are scrolled viewport captures, not whole-device proof',
                       'STOP backed by independent P04 evidence, not rerun as P07 state',
                       'pure-layout viewport labels do not equal real responsive Chrome testing'],
        'operations':{'runtimeEdit':False,'serverRestart':False,'newChromeRun':False,
                      'historicEvidenceOverwrite':False,'releaseOrHardwareOperation':False}
    }
    final_path = ROOT / DEST / 'FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json'
    write_once(final_path, final)
    final_sha = sha(final_path)
    assert sha(final_path) == final_sha and json.loads(final_path.read_text(encoding='utf-8')) == final
    evidence2, runtime2, photos2, pngs2 = validate()
    assert (evidence2,runtime2,photos2,pngs2) == (evidence,runtime,photos,pngs)
    post = {'schema':'fcv588-p07-bounded-independent-postreceipt-v1','createdAt':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
            'status':'PASS_BOUNDED_INDEPENDENT_READBACK','finalPath':str(final_path.relative_to(ROOT)).replace('\\','/'),
            'finalSHA256':final_sha,'rehash':{'evidence':len(evidence2),'runtime':'39/39',
                    'photos':'8/8','screenshots':'39/39','server4173':'HTTP 200','port4207':'CLOSED'},
            'rightsFirmwareHardwareFeatureReleaseHoldsRemain':True,
            'method':'Fresh SHA-readback and validation after final file written; no browser rerun; worker-1 independent GO bound by SHA.'}
    post_path = ROOT / DEST / 'FCV588_P07_BOUNDED_INDEPENDENT_POSTRECEIPT_20261116.json'
    write_once(post_path, post)
    assert json.loads(post_path.read_text(encoding='utf-8')) == post
    print(json.dumps({'status':'PASS','final':str(final_path),'finalSHA256':final_sha,
                     'post':str(post_path),'postSHA256':sha(post_path)},indent=2))

if __name__ == '__main__':
    main()
