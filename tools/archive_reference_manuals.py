#!/usr/bin/env python3
"""Download *documentation only* from reviewed URLs into this workspace.

No executable archive members are extracted or executed. Existing files are
verified rather than silently overwritten. See sources/manuals/MANIFEST.json.
Requires Python 3 and requests/pypdf (already present on the host in 2026-10).
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "sources" / "manuals"
USER_AGENT = "MoPhongMayTrenTau-Documentation-Archiver/1.0 (training research)"
MAX_DOWNLOAD_BYTES = 160 * 1024 * 1024
MAX_EXTRACT_BYTES = 90 * 1024 * 1024

PDF_SOURCES = [
    {
        "id": "FCV588_OME23890E_2025",
        "device": "FCV-588",
        "source_tier": "manufacturer",
        "file": "FCV-588/FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf",
        "url": "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf",
        "expected": ["FCV-588", "FCV-628"],
        "type": "operator_manual",
    },
    {
        "id": "FCV588_SOFTWARE_HISTORY",
        "device": "FCV-588",
        "source_tier": "manufacturer",
        "file": "FCV-588/FURUNO_FCV588_FCV628_Software_History.pdf",
        "url": "https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf",
        "expected": ["FCV", "628", "588"],
        "type": "firmware_change_history",
    },
    {
        "id": "FCV588_OPERATORS_GUIDE_MULTILINGUAL",
        "device": "FCV-588",
        "source_tier": "manufacturer",
        "file": "FCV-588/FURUNO_FCV628_FCV588_Operators_Guide_Multilingual.pdf",
        "url": "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_guide.pdf",
        "expected": ["FCV-588", "FCV-628"],
        "type": "operator_guide",
    },
    {
        "id": "FCV588_BROCHURE_FURUNO_USA",
        "device": "FCV-588",
        "source_tier": "manufacturer",
        "file": "FCV-588/FURUNO_FCV588_Brochure_Manufacturer_Reference.pdf",
        "url": "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/brochures/brochures/fcv588_brochure.pdf",
        "expected": ["FCV-588", "FISH FINDER"],
        "type": "brochure_nonmanual_reference",
    },
    {
        "id": "FCV588_OME23890B2_2018",
        "device": "FCV-588",
        "source_tier": "manufacturer",
        "file": "FCV-588/FURUNO_FCV628_FCV588_Operators_Manual_OME23890B2_2018.pdf",
        "url": "https://www.furuno.com/files/Manual/189/upload/OME23890B2_FCV628_588.pdf",
        "expected": ["FCV-588", "FCV-628"],
        "type": "historical_operator_manual",
    },
    {
        "id": "FAR2127_OME35190U5_2024",
        "device": "FAR-2127",
        "source_tier": "manufacturer",
        "file": "FAR-2127/FURUNO_FAR2XX7_Operators_Manual_OME35190U5_2024.pdf",
        "url": "https://furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/far2xx7_operators_manual.pdf",
        "expected": ["FAR-", "RADAR"],
        "type": "operator_manual",
    },
    {
        "id": "FAR2127_OPERATORS_GUIDE",
        "device": "FAR-2127",
        "source_tier": "manufacturer",
        "file": "FAR-2127/FURUNO_FAR2XX7_Operators_Guide.pdf",
        "url": "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/far2xx7_operators_guide.pdf",
        "expected": ["FAR-", "RADAR"],
        "type": "operator_guide",
    },
    {
        "id": "MDC2060_REV14",
        "device": "MDC-2060",
        "source_tier": "manufacturer",
        "file": "MDC-2060/KODEN_MDC2000_Operation_Manual_Rev14.pdf",
        "url": "https://www.koden-electronics.co.jp/wp/wp-content/uploads/2025/10/MDC-2000_OME_Rev14.pdf",
        "expected": ["MDC-2060", "MDC-2000"],
        "type": "historical_operator_manual",
    },
    {
        "id": "MDC2060_REV15",
        "device": "MDC-2060",
        "source_tier": "manufacturer",
        "file": "MDC-2060/KODEN_MDC2000_Operation_Manual_Rev15.pdf",
        "url": "https://www.koden-electronics.co.jp/wp/wp-content/uploads/2025/10/MDC-2000_OME_Rev15.pdf",
        "expected": ["MDC-2060", "MDC-2000"],
        "type": "operator_manual",
    },
    {
        "id": "MDC2060_QUICK_REF",
        "device": "MDC-2060",
        "source_tier": "manufacturer",
        "file": "MDC-2060/KODEN_MDC2000_Quick_Reference_Rev00.pdf",
        "url": "https://www.koden-electronics.co.jp/wp/wp-content/uploads/2025/10/MDC-2000_QRE_Rev00.pdf",
        "expected": ["MDC-2000", "RADAR"],
        "type": "operator_quick_reference",
    },
    {
        "id": "NS4000_V2_00_009",
        "device": "NS4000",
        "source_tier": "third_party_mirror",
        "file": "NS4000/TRANSAS_NS4000_4100_User_Manual_v2.00.009_MIRROR.pdf",
        "url": "https://aratmarine.com/wp-content/uploads/NS4000_4100_ECDIS_User_Guide_eng.pdf",
        "expected": ["NAVI-SAILOR", "ECDIS"],
        "type": "historical_operator_manual",
    },
    {
        "id": "AIS_R5_SUPREME_FCC_OLD",
        "device": "AIS R5 SUPREME (candidate)",
        "source_tier": "regulatory_mirror",
        "file": "AIS-R5-SUPREME/R5_Supreme_Operation_Manual_FCC_older.pdf",
        "url": "https://fccid.io/QWZR5-AIS/User-Manual/Manual-1980818.pdf",
        "expected": ["SUPREME", "AIS"],
        "type": "historical_operator_manual",
    },
    {
        "id": "AIS_R5_SOLID_FCC_OLD",
        "device": "AIS R5 SOLID (candidate)",
        "source_tier": "regulatory_mirror",
        "file": "AIS-R5-SOLID/R5_Solid_Operation_Manual_FCC_older.pdf",
        "url": "https://fccid.io/QWZR5-AIS/User-Manual/manual-1791683.pdf",
        "expected": ["SOLID", "AIS"],
        "type": "historical_operator_manual",
    },
]

PACKAGES = [
    {
        "id": "AIS_R5_SUPREME_OFFICIAL_DOC_PACKAGE",
        "device": "AIS R5 SUPREME (candidate)",
        "source_tier": "manufacturer",
        "file": "AIS-R5-SUPREME/R5_SUPREME_Documentation_Package_J1.zip",
        "href_contains": "118-362",
        "expected": ["supreme"],
        "type": "official_documentation_bundle",
    },
    {
        "id": "AIS_R5_SOLID_OFFICIAL_DOC_PACKAGE",
        "device": "AIS R5 SOLID (candidate)",
        "source_tier": "manufacturer",
        "file": "AIS-R5-SOLID/R5_SOLID_Documentation_Package_J1.zip",
        "href_contains": "118-331",
        "expected": ["solid"],
        "type": "official_documentation_bundle",
    },
]


def checksum(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            sha.update(block)
    return sha.hexdigest()


def direct_download(url: str, path: Path) -> tuple[str, int]:
    if not url.lower().startswith("https://"):
        raise ValueError("HTTPS documentation source required")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        return "already_present", path.stat().st_size
    part = path.with_suffix(path.suffix + ".part")
    if part.exists():
        raise FileExistsError(f"partial download exists; examine manually: {part}")
    size = 0
    try:
        with requests.get(url, stream=True, timeout=(15, 75),
                          headers={"User-Agent": USER_AGENT}, allow_redirects=True) as resp:
            resp.raise_for_status()
            if urlparse(resp.url).scheme != "https":
                raise ValueError("redirect downgraded to HTTP")
            length = resp.headers.get("Content-Length")
            if length and int(length) > MAX_DOWNLOAD_BYTES:
                raise ValueError("download too large")
            with part.open("xb") as out:
                for chunk in resp.iter_content(chunk_size=1024 * 1024):
                    if not chunk:
                        continue
                    size += len(chunk)
                    if size > MAX_DOWNLOAD_BYTES:
                        raise ValueError("download exceeds size cap")
                    out.write(chunk)
        magic = part.open("rb").read(5)
        if path.suffix.lower() == ".pdf" and not magic.startswith(b"%PDF-"):
            raise ValueError("non-PDF response")
        if path.suffix.lower() == ".zip" and not magic.startswith(b"PK\x03\x04"):
            raise ValueError("non-ZIP response")
        if size < 1000:
            raise ValueError("suspiciously short response")
        part.rename(path)
        return "downloaded", size
    except Exception:
        if part.exists():
            part.unlink()
        raise


def pdf_summary(path: Path, expected: list[str]) -> dict:
    if path.open("rb").read(5) != b"%PDF-":
        raise ValueError("invalid PDF signature")
    reader = PdfReader(str(path), strict=False)
    pages = len(reader.pages)
    if pages < 1:
        raise ValueError("no pages")
    probe = "\n".join((reader.pages[i].extract_text() or "") for i in range(min(8, pages))).upper()
    matches = [key for key in expected if key.upper() in probe]
    return {
        "file_bytes": path.stat().st_size,
        "sha256": checksum(path),
        "pages": pages,
        "first_eight_pages_probe": matches,
        "model_text_found": bool(matches),
    }


def archive_url_by_label(label: str) -> str:
    r = requests.get("https://www.transpondertech.com/support", timeout=(15, 35),
                     headers={"User-Agent": USER_AGENT})
    r.raise_for_status()
    links = re.findall(r'href="([^"]+)"', html.unescape(r.text))
    matches = [link for link in links if "raymarine.canto.global/" in link and label in link]
    if not matches:
        raise ValueError("official documentation package link missing")
    return matches[0]


def extract_manual_pdfs(package_path: Path, dest_dir: Path) -> list[dict]:
    extracted = []
    with zipfile.ZipFile(package_path) as archive:
        for member in archive.infolist():
            name = member.filename
            if member.is_dir() or not name.lower().endswith(".pdf"):
                continue
            if not re.search(r"(?:manual|operat|user.?guide|short.?instruction|quick.?ref|"
                             r"118[-_ ](?:200|202|300|364))", name, re.I):
                continue
            if member.file_size > MAX_EXTRACT_BYTES:
                extracted.append({"original_zip_path": name, "status": "SKIP_TOO_LARGE"})
                continue
            base_name = Path(name.replace("\\", "/")).name
            stem = re.sub(r"[^A-Za-z0-9_.-]+", "_", base_name)
            if len(stem) > 130:
                stem = stem[:120] + ".pdf"
            path = dest_dir / stem
            if path.exists():
                if path.stat().st_size != member.file_size:
                    extracted.append({"original_zip_path": name, "status": "CONFLICT_EXISTING",
                                      "local": path.relative_to(ROOT).as_posix()})
                    continue
                status = "already_present"
            else:
                dest_dir.mkdir(parents=True, exist_ok=True)
                with archive.open(member, "r") as src, path.open("xb") as target:
                    shutil.copyfileobj(src, target, length=1024 * 1024)
                status = "extracted"
            try:
                verified = pdf_summary(path, [])
                extracted.append({"original_zip_path": name, "status": status,
                                  "local": path.relative_to(ROOT).as_posix(), **verified})
            except Exception as exc:
                extracted.append({"original_zip_path": name, "status": "UNVERIFIED",
                                  "local": path.relative_to(ROOT).as_posix(), "reason": str(exc)})
    return extracted


def run(dry_run: bool) -> None:
    if ROOT.name.lower() != "mophongmaytrentau":
        raise RuntimeError("refusing to archive outside the requested workspace")
    DEST.mkdir(parents=True, exist_ok=True)
    entries = []
    for spec in PDF_SOURCES + PACKAGES:
        item = {k: v for k, v in spec.items() if k != "expected"}
        item["rights_status"] = "RESTRICTED_REFERENCE_ONLY; check publisher terms and obtain permission before AI processing, republishing or classroom distribution"
        item["simulator_asset"] = False
        item["reference_role"] = "EVIDENCE_ONLY_NOT_HARDWARE_FIDELITY_APPROVAL"
        if "url" not in item:
            try:
                item["url"] = archive_url_by_label(spec["href_contains"])
            except Exception as exc:
                item.update({"status": "SOURCE_UNAVAILABLE", "error": str(exc)})
                entries.append(item)
                print(f'{spec["id"]}: SOURCE_UNAVAILABLE {exc}', flush=True)
                continue
        if dry_run:
            item["status"] = "DRY_RUN"
            entries.append(item)
            print(f'{spec["id"]}: DRY_RUN {item["url"]}', flush=True)
            continue
        path = DEST / spec["file"]
        try:
            status, size = direct_download(item["url"], path)
            item["status"] = status
            item["local"] = path.relative_to(ROOT).as_posix()
            item["file_bytes"] = size
            item["sha256"] = checksum(path)
            item["file_timestamp_utc"] = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat()
            if path.suffix.lower() == ".pdf":
                item.update(pdf_summary(path, spec["expected"]))
            else:
                if not zipfile.is_zipfile(path):
                    raise ValueError("ZIP content fails zipfile validation")
                item["manual_pdfs_extracted"] = extract_manual_pdfs(
                    path, path.parent / "manuals_extracted")
            print(f'{spec["id"]}: {status}, {size} bytes', flush=True)
        except Exception as exc:
            item.update({"status": "FAILED_OR_UNVERIFIED", "error": str(exc)})
            print(f'{spec["id"]}: FAILED {exc}', flush=True)
        entries.append(item)
    manifest = {
        "schema": 1,
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "scope": "Local historical/official reference manuals; not licensed simulator art.",
        "identity_HOLD": ["KODEN J2000 unverified model", "AIS R5 actual SUPREME/SOLID",
                          "NS4000 actual installed version", "FCV588 actual firmware/transducer"],
        "not_obtained": [
            {"model": "KODEN J2000", "reason": "Model unverified; no substitute manual downloaded"},
            {"model": "NS4000 v3.02.350", "url": "https://www.scribd.com/document/959959511/NS4000-v-3-02-350-UM-SEP2025",
             "reason": "Viewer/publication only: PDF direct download and reproduction rights unverified"},
        ],
        "entries": entries,
    }
    if not dry_run:
        (DEST / "MANIFEST.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"entries": len(entries),
                      "pdf_ok": sum(1 for e in entries if "pages" in e),
                      "zip_ok": sum(1 for e in entries if e.get("manual_pdfs_extracted")),
                      "failures": [e["id"] for e in entries if "FAILED" in e.get("status", "")]},
                     ensure_ascii=False), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    run(parser.parse_args().dry_run)
