from pathlib import Path


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
SRC = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/"
    "qa-20261114/canonical-browser-zoom/canonical_zoom_worker10_v2.py"
)
DST = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/"
    "qa-20261114/canonical-browser-zoom-attempt2/"
    "canonical_zoom_attempt2_worker10.py"
)

text = SRC.read_text(encoding="utf-8")
text = text.replace(
    "qa-20261114/canonical-browser-zoom",
    "qa-20261114/canonical-browser-zoom-attempt2",
)
text = text.replace("PORT = 4180", "PORT = 4181")
text = text.replace(
    'return f"AUTO_R G:AF {prefix}-{freq} x1"',
    'return f"AUTO_R   G:AF   {prefix}-{freq}   x1"',
)
old = """        header = page.locator("#screen-top").inner_text().strip()
        wanted = expected_header(mode, zoom)
        if header != wanted:
            raise AssertionError(f"header expected {wanted!r}, got {header!r}")
"""
new = """        header_node = page.locator("#screen-top")
        header_text_content = header_node.text_content()
        header_inner_text = header_node.inner_text().strip()
        wanted = expected_header(mode, zoom)
        if header_text_content != wanted:
            raise AssertionError(
                f"textContent expected {wanted!r}, got {header_text_content!r}")
        normalized_expected = " ".join(wanted.split())
        normalized_inner = " ".join(header_inner_text.split())
        if normalized_inner != normalized_expected:
            raise AssertionError(
                f"semantic header expected {normalized_expected!r}, got {normalized_inner!r}")
"""
if old not in text:
    raise RuntimeError("header assertion preimage not found")
text = text.replace(old, new)
old = '''            "headerActual": header,
            "headerExpected": wanted,
'''
new = '''            "headerTextContent": header_text_content,
            "headerInnerText": header_inner_text,
            "headerExpectedTextContent": wanted,
            "headerNormalizedExpected": normalized_expected,
            "headerNormalizedInnerText": normalized_inner,
'''
if old not in text:
    raise RuntimeError("proof preimage not found")
text = text.replace(old, new)
text = text.replace(
    'prefix = f"fcv588-canonical-zoom-{run_id}"',
    'prefix = f"fcv588-canonical-zoom-attempt2-{run_id}"',
)
text = text.replace(
    '"schema":"fcv588-canonical-zoom-qa-v1"',
    '"schema":"fcv588-canonical-zoom-attempt2-qa-v1"',
)
text = text.replace(
    'p.name in ("canonical_zoom_worker10.py","canonical_zoom_worker10_v2.py")',
    'p.name in ("canonical_zoom_attempt2_worker10.py","build_attempt2_harness.py")',
)
text = text.replace(
    '"header":c.get("proof",{}).get("headerActual"),',
    '"headerTextContent":c.get("proof",{}).get("headerTextContent"),\n'
    '                "headerInnerText":c.get("proof",{}).get("headerInnerText"),',
)

if DST.exists():
    raise FileExistsError(f"write-once destination exists: {DST}")
DST.write_text(text, encoding="utf-8", newline="\n")
print(DST)
