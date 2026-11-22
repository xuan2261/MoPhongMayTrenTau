#!/usr/bin/env python3
"""Offline verification of the local, rights-restricted documentation archive.

This script never downloads or modifies publisher PDFs or ZIPs. It checks
manifest paths, SHA-256, PDF page counts and ZIP structure against the
locally materialized evidence. A receipt is written only if requested.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "sources" / "manuals"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as src:
        for data in iter(lambda: src.read(1024 * 1024), b""):
            h.update(data)
    return h.hexdigest()


def validated_path(name: str) -> Path:
    if not isinstance(name, str) or not name:
        raise ValueError("missing manifest local path")
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ARCHIVE.resolve()) or not path.is_file():
        raise ValueError(f"missing/out-of-archive file: {name}")
    return path


def verify_asset(item: dict) -> dict:
    path = validated_path(item["local"])
    size = path.stat().st_size
    if item.get("file_bytes") != size:
        raise ValueError(f"size mismatch: {item['local']}")
    digest = sha256_file(path)
    if item.get("sha256") != digest:
        raise ValueError(f"SHA256 mismatch: {item['local']}")
    if path.suffix.lower() == ".pdf":
        if path.open("rb").read(5) != b"%PDF-":
            raise ValueError(f"signature mismatch: {item['local']}")
        pages = len(PdfReader(str(path), strict=False).pages)
        if pages != item.get("pages"):
            raise ValueError(f"page-count mismatch: {item['local']}")
        return {"file": item["local"], "size": size, "sha256": digest, "pages": pages}
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as zf:
            if zf.testzip() is not None:
                raise ValueError(f"damaged ZIP: {item['local']}")
        return {"file": item["local"], "size": size, "sha256": digest, "archive": True}
    raise ValueError(f"unsupported evidence format: {item['local']}")


def main(write_receipt: bool) -> int:
    manifest = json.loads((ARCHIVE / "MANIFEST.json").read_text(encoding="utf-8"))
    verified, gaps, failures = [], [], []
    for entry in manifest["entries"]:
        if entry.get("status") == "FAILED_OR_UNVERIFIED":
            gaps.append({"id": entry["id"], "reason": entry.get("error")})
            continue
        try:
            verified.append(verify_asset(entry))
            for extracted in entry.get("manual_pdfs_extracted", []):
                if extracted.get("status") in ("extracted", "already_present"):
                    verified.append(verify_asset(extracted))
                else:
                    gaps.append({"id": entry["id"], "reason": extracted.get("status"),
                                 "local": extracted.get("local")})
        except Exception as exc:
            failures.append({"id": entry["id"], "error": str(exc)})

    report = {
        "verified_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": "PASS_AVAILABLE_ASSETS_WITH_GAPS" if not failures else "FAIL_VALIDATION",
        "verified_pdf_files": sum(1 for x in verified if "pages" in x),
        "verified_zip_files": sum(1 for x in verified if x.get("archive")),
        "verified_total_bytes": sum(x["size"] for x in verified),
        "known_acquisition_gaps": gaps,
        "validation_failures": failures,
        "verified_paths_and_hashes": verified,
        "not_an_approval_to_redistribute": True,
    }
    if write_receipt:
        (ARCHIVE / "VERIFICATION_RECEIPT.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "verified_paths_and_hashes"},
                     ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-receipt", action="store_true")
    sys.exit(main(parser.parse_args().write_receipt))
