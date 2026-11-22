#!/usr/bin/env python3
"""Export a comparison atlas from already-executed, selected Chrome receipts.

No browser execution, current-runtime verification, manufacturer media parsing,
network traffic, source changes or conformance approval is performed here.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_DEST = ROOT / "docs/evidence/fcv588-visual-atlas-v27.json"
MD_DEST = ROOT / "docs/research/FCV588_PANEL_LCD_ATLAS_V27.md"
EXPECTED_VIEWPORTS = {"1366x768", "1920x1080", "360x800", "390x844"}
EXPECTED_ELEMENTS = {".device-frame", ".equipment", "#lcd", "#key-menu",
    ".pad", "#key-enter", "#key-range", "#key-mark", "#key-func",
    "#gain-knob", "#mode-knob", "#key-power"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def load_receipt(relative):
    path = ROOT / relative
    raw = path.read_bytes()
    return json.loads(raw.decode("utf-8")), {
        "path": relative, "sha256": hashlib.sha256(raw).hexdigest()}


def validated_geometry(item):
    geometry = item["geometry"]
    require(geometry["basis"] == "OBSERVED_SIMULATOR_NOT_MEASURED_HARDWARE",
            "a simulator rectangle must not be relabeled as measured hardware")
    require(geometry["logicalLcd"] == [480, 640], "logical LCD resolution drift")
    require("x".join(map(str, geometry["viewport"])) == item["viewport"],
            "geometry and browser viewport identities differ")
    require(set(geometry["elements"]) == EXPECTED_ELEMENTS,
            "missing or unexpected panel element")
    for selector, element in geometry["elements"].items():
        for unit in ("css", "relativeToHead"):
            rect = element[unit]
            require(set(rect) == {"x", "y", "width", "height"},
                    "incomplete rectangle: " + selector)
            require(all(isinstance(v, (int, float)) and not isinstance(v, bool)
                        and math.isfinite(v) for v in rect.values()),
                    "invalid rectangle coordinate: " + selector)
            require(rect["width"] > 0 and rect["height"] > 0,
                    "empty rectangle: " + selector)
    return geometry


def build(checkpoint="V27"):
    require(checkpoint in {"V27", "V28"}, "unsupported atlas checkpoint")
    probe, probe_id = load_receipt(f"docs/qa/FCV588_LCD_{checkpoint}_GREEN_RECEIPT.json")
    desktop, desktop_id = load_receipt(f"docs/qa/FCV588_CHROME_VIEWPORT_{checkpoint}_RECEIPT.json")
    mobile, mobile_id = load_receipt(f"docs/qa/FCV588_CHROME_MOBILE_{checkpoint}_RECEIPT.json")
    require(probe["status"] == "PASS" and probe["sourceStable"] is True
            and probe["harnessStable"] is True and not probe.get("executionError"),
            "LCD probe did not complete successfully")
    viewports = probe["viewports"]
    require(len(viewports) == 4 and {v["viewport"] for v in viewports} == EXPECTED_VIEWPORTS,
            "LCD atlas needs all four unique target viewports")
    source = probe["servedSourceIdentity"]
    require(source["status"] == "PASS", "LCD probe source identity failed")
    full_results = []
    for receipt, expected_status in ((desktop, "PASS_OBSERVED_VIEWPORTS"),
                                     (mobile, "PASS_OBSERVED_PHONE_VIEWPORTS")):
        require(receipt["status"] == expected_status
                and receipt["preflight"] == "SOURCE_TREE_IDENTITY_PASS"
                and receipt["postflight"] == "SOURCE_TREE_STABLE_PASS"
                and receipt["qaHarnessSourceIdentity"]["status"] == "PASS_UNCHANGED",
                "full Chrome acceptance did not complete successfully")
        require(receipt["servedSourceIdentity"] == source,
                "receipts describe different runtime revisions")
        for item in receipt["viewports"]:
            require(item["status"] == "PASS" and not item["consoleErrors"]
                    and not item["requestFailures"] and not item.get("networkErrors"),
                    "full Chrome viewport reported a failure")
            identity = item["browserLoadedSourceIdentity"]
            require(identity["status"] == "PASS", "actual response-body check missing")
            full_results.append({"viewport": item["viewport"],
                "verifiedResponses": identity["verifiedResponses"],
                "verifiedUniquePaths": identity["verifiedUniquePaths"],
                "browserLoadedResponsesSha256": identity["browserLoadedResponsesSha256"]})
    require(len(full_results) == 4 and {v["viewport"] for v in full_results} == EXPECTED_VIEWPORTS,
            "full acceptance needs four unique viewports")
    measured = []
    for item in viewports:
        require(item["status"] == "PASS" and not item.get("executionError")
                and len(item["checks"]) == 17
                and len({c["name"] for c in item["checks"]}) == 17
                and all(c["passed"] is True for c in item["checks"]),
                "incomplete visual regression checks")
        require(item["browserLoadedSourceIdentity"]["status"] == "PASS",
                "LCD context lacks actual response-body verification")
        for relative in item["screenshots"]:
            path = (ROOT / relative).resolve()
            require(path.is_relative_to((ROOT / "docs/qa/screenshots").resolve())
                    and path.suffix == ".png" and path.is_file(),
                    "missing or out-of-scope original screenshot")
        measured.append({"viewport": item["viewport"],
            "geometry": validated_geometry(item), "screenshots": item["screenshots"],
            "visualChecks": [c["name"] for c in item["checks"]]})
    return {"schemaVersion": 1, "checkpoint": checkpoint,
        "basis": "DERIVED_FROM_EXECUTED_SIMULATOR_RECEIPTS_NOT_NEW_BROWSER_RUN",
        "recordedBrowserCollectionUtc": probe["collectedAtUtc"],
        "profileClass": "PUBLIC_REFERENCE", "hardwareValidated": False,
        "releaseApproval": "HOLD", "oemFidelityPercent": None,
        "sourceReceipts": [probe_id, desktop_id, mobile_id],
        "runtimeProfile": source["profileRevision"],
        "runtimeFileCount": source["filesCompared"],
        "runtimeManifestSha256": source["sourceManifestSha256"],
        "referenceBasis": [
            {"subject": "logical LCD", "value": [480, 640],
             "grade": "MANUFACTURER_WEB_CORROBORATED",
             "url": "https://www.furuno.it/lang--en--art--FCV-588--FCV588.html"},
            {"subject": "effective LCD and overall drawing envelope",
             "effectiveLcdMm": [128, 171], "drawingEnvelopeMm": [233, 270],
             "grade": "EXISTING_CURATED_PROJECT_REFERENCE_NOT_NEW_HARDWARE_MEASUREMENT",
             "source": "docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md"},
            {"subject": "head, keys, bracket, dial angles and menu rectangles",
             "grade": "ORIGINAL_REFERENCE_ESTIMATE", "measuredHardwareCoordinates": None}],
        "authoredMenuLayout": {"grade": "ORIGINAL_REFERENCE_ESTIMATE_NOT_OEM",
            "mainMenu": {"widthPercentOfLcd": 96, "leftPercent": 2,
                         "topPercent": 7, "maxHeightPercent": 90},
            "categories": ["Sounder", "Display", "Alarm", "Data", "System"],
            "navigation": "Existing simulator left/right categories, up/down items; not an OEM sequence sign-off"},
        "fullBrowserResults": full_results, "measurements": measured,
        **({"qualitativeReferenceReview": {
            "document": "docs/research/FCV588_OFFICIAL_VISUAL_COMPARISON_V28.md",
            "sourcePage": "https://www.furunousa.com/en/products/fcv588",
            "observedImages": ["FCV588-Front-Reflection.png",
                "FCV588-BottomDiscMode.png", "FCV588-WhitelineScreen.png"],
            "evidenceMode": "NATIVE_BROWSER_VISUAL_OBSERVATION_NOT_PIXEL_EXTRACTION",
            "physicalMeasurements": None, "rightsPromotion": False,
        }} if checkpoint == "V28" else {}),
        "unresolved": ["Bare-head and mounting dimensions not measured",
            "OEM button-center coordinates, fonts and colorimetry not established",
            "Exact manufacturer menu keyboard sequence and layout not independently accepted",
            "Phone layout is an explicit training reflow, not physical-face geometry",
            "Independent reviewer, course release and hardware equivalence remain HOLD"]}


def markdown(atlas):
    lines = [f"# FCV-588 — Atlas mặt máy và LCD {atlas['checkpoint']}", "",
        "**Phạm vi: tọa độ đo từ trình duyệt mô phỏng; không phải số đo máy thật.**",
        "Không có tỷ lệ giống OEM, chứng nhận phần cứng hoặc phê duyệt phát hành.", "",
        "## Nguồn và cách đọc", "",
        "LCD logic 480×640 được đối chiếu trang sản phẩm FURUNO Italia. Kích thước",
        "tham chiếu 128×171 và bao hình 233×270 kế thừa hồ sơ nguồn công khai của",
        "dự án; không suy ra kích thước đầu máy trần hoặc vị trí nút chính xác.",
        "Bố cục menu, góc núm và nét vỏ vẫn là hình vẽ độc lập có nhãn ước lượng.", "",
        "Tọa độ chuẩn hóa lấy góc trên trái `.equipment` làm (0,0), chia x/rộng",
        "cho chiều rộng đầu máy mô phỏng, y/cao cho chiều cao tương ứng. CSS px",
        "không phải mm hay pixel vật lý của màn hình. Ở điện thoại, `.equipment`",
        "là bố cục luyện tập đã sắp lại, không được so trực tiếp với mặt máy thật.", "",
        "## Bằng chứng đầu vào", "",
        f"Runtime: `{atlas['runtimeProfile']}`; {atlas['runtimeFileCount']} tệp; manifest:",
        f"`{atlas['runtimeManifestSha256']}`.", ""]
    for receipt in atlas["sourceReceipts"]:
        lines += [f"- `{receipt['path']}` — SHA-256 `{receipt['sha256']}`"]
    if atlas["checkpoint"] == "V28":
        lines += ["", "V28 đã mở trực quan ba ảnh trên trang FURUNO USA. Phần",
            "đối chiếu định tính được ghi riêng trong",
            "[bảng nguồn chính thức V28](FCV588_OFFICIAL_VISUAL_COMPARISON_V28.md).",
            "Ảnh nguồn không cung cấp tọa độ phần cứng cho các số đo bên dưới."]
    lines += ["", "Đây là xuất bảng từ các lần Chrome đã chạy; không phải một lần",
              "kiểm thử mới hay kiểm SHA hiện tại của toàn bộ mã nguồn.", "",
              "## Tọa độ chuẩn hóa đã ghi nhận", ""]
    for item in atlas["measurements"]:
        lines += [f"### {item['viewport']} — {item['geometry']['layout']}", "",
            "| Thành phần | x | y | Rộng | Cao | CSS px (rộng × cao) |",
            "| --- | ---: | ---: | ---: | ---: | ---: |"]
        for selector, element in item["geometry"]["elements"].items():
            r, css = element["relativeToHead"], element["css"]
            lines.append(f"| `{selector}` | {r['x']:.4f} | {r['y']:.4f} | {r['width']:.4f} | {r['height']:.4f} | {css['width']:.2f} × {css['height']:.2f} |")
        lines += [""]
    lines += ["## Kết quả Chrome đầy đủ", "",
        "| Viewport | Response body đã đối chiếu | Đường dẫn khác nhau |",
        "| --- | ---: | ---: |"]
    for item in atlas["fullBrowserResults"]:
        lines.append(f"| {item['viewport']} | {item['verifiedResponses']} | {item['verifiedUniquePaths']} |")
    lines += ["", "## Chưa đủ căn cứ nghiệm thu mặt máy", "",
        "Cần nguồn hình học mặt trước và menu có thể kiểm chứng để thay các tọa độ",
        "ước lượng bằng tọa độ tham chiếu. Chưa có xác nhận font, màu, đường nét vỏ,",
        "tâm nút, hành trình núm hoặc quy trình phím đúng firmware cụ thể. Không dùng",
        "kết quả test phần mềm để tuyên bố giống máy thật 100%. Các gate vẫn HOLD.", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--checkpoint", choices=("V27", "V28"), default="V27")
    args = parser.parse_args()
    atlas = build(args.checkpoint)
    json_dest = JSON_DEST.with_name(f"fcv588-visual-atlas-{args.checkpoint.lower()}.json")
    md_dest = MD_DEST.with_name(f"FCV588_PANEL_LCD_ATLAS_{args.checkpoint}.md")
    outputs = {json_dest: json.dumps(atlas, ensure_ascii=False, indent=2) + "\n",
               md_dest: markdown(atlas)}
    for path, text in outputs.items():
        if args.check or path.exists():
            require(path.is_file() and path.read_text(encoding="utf-8") == text,
                    "atlas drift; review before replacing: " + str(path))
    if not args.check:
        for path, text in outputs.items():
            if not path.exists():
                with path.open("x", encoding="utf-8") as stream:
                    stream.write(text)
    print(json.dumps({"status": "ATLAS_DERIVATION_CHECK_PASS" if args.check else "ATLAS_WRITTEN",
        "runtimeFiles": atlas["runtimeFileCount"], "manifest": atlas["runtimeManifestSha256"],
        "contexts": atlas["fullBrowserResults"], "hardwareValidated": False,
        "releaseApproval": "HOLD", "outputs": [str(p.relative_to(ROOT)) for p in outputs]}, indent=2))


if __name__ == "__main__":
    main()
