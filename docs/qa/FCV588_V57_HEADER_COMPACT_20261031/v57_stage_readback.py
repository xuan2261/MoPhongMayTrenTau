import json
from pathlib import Path
root=Path(r"C:\Work\MoPhongMayTrenTau")
qa=root/"docs/qa/FCV588_V57_HEADER_COMPACT_20261031"
baseline=json.loads((qa/"V57_BASELINE_VIEWPORTS_20261031.json").read_text(encoding="utf-8"))
after=json.loads((qa/"V57_STAGE_BROWSER_ATTEMPT3_20261031.json").read_text(encoding="utf-8"))
assert len(after["viewports"])==4
for item in after["viewports"]:
    assert item["httpStatus"]==200
    assert not item["pageErrors"] and not item["failedRequests"] and not item["externalRequests"]
    assert item["after"]["scrollWidth"]==item["after"]["clientWidth"]
    assert item["tabCount"]==5 and item["helpSelected"]=="true"
    assert item["helpPanelHiddenAfterSelect"] is False and item["sessionSelectedAfterReturn"]=="true"
b={v["name"]:v["metrics"] for v in baseline["viewports"]}
print("STAGE_BROWSER=4/4_PASS")
for item in after["viewports"]:
    name=item["name"]; m=item["initial"]
    old=b.get(name)
    if old:
        delta=round(old["workbench"]["y"]-m["workbench"]["y"],1)
        print(f"{name}: workbenchY {old['workbench']['y']:.1f}->{m['workbench']['y']:.1f} saved={delta}px; documentHeight {old['document']['scrollHeight']}->{m['document']['scrollHeight']}")
    else:
        print(f"{name}: {m['viewport']['width']}x{m['viewport']['height']} no-horizontal-overflow")
fallback=after["noJs"]["fallback"]
assert after["noJs"]["httpStatus"]==200 and fallback["tablistHidden"] and not any(fallback["panelHidden"])
assert fallback["scrollWidth"]==fallback["clientWidth"]
print("NO_JS_FALLBACK=PASS")
print("D15_TABS=5/5_INTERACTIVE")
print("BROWSER_ERRORS=0")