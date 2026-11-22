#!/usr/bin/env python3
"""Self-contained, SHA-256-addressed cold store for historical FCV-588 stages.

This is an archival/restore tool, not a way to promote historical source to
canonical. It never touches active Electron P29-P36 or the main source tree
while building. Restore refuses to overwrite an existing stage.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PREP = ROOT / "staging" / "github-prep-20261122"
OUT = PREP / "HISTORICAL_STAGES_DEDUP_20261122.zip"
SIDECAR = PREP / "HISTORICAL_STAGES_DEDUP_20261122.json"
LEGACY = PREP / "P13_P14_P15_STAGE_SNAPSHOTS_20261122.zip"
LEGACY_MANIFEST = PREP / "P13_P14_P15_STAGE_SNAPSHOTS_20261122.json"
PIN_LEGACY_ZIP = "e9237ce81139f9e4cbc52cce5c9292f5411135ba86215abef5a43bc7584c4fa1"
PIN_LEGACY_MANIFEST = "df59a932347ec9120e66e04d6cbb27171afc343dcabd2a7d1e714b7a6c4dc38c"
EXCLUDED_STAGE_NAMES = {
    "github-prep-20261122",
    "fcv588-electron-installer-p30-20261121",
    "fcv588-native-accessibility-p31-20261121",
    "fcv588-electron-poc-20261121",
    "fcv588-p32-host-qa-20261121",
    "fcv588-p33-native-at-20261121",
    "fcv588-p35-power-brill-a11y-20261121",
    "fcv588-p36-live-bottom-zoom-20261122",
}
LEGACY_ROOTS = (
    "_p13_stage_20261116",
    "_p14_stage_20261116",
    "_p15_stage_20261116",
)


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def valid_rel(name: str) -> str:
    if not name or "\\" in name or name.startswith("/") or ":" in name:
        raise ValueError(f"Unsafe archived path: {name!r}")
    p = PurePosixPath(name)
    if ".." in p.parts or "." in p.parts or str(p) != name:
        raise ValueError(f"Unsafe archived path: {name!r}")
    return name


def add_blob(archive: zipfile.ZipFile, digest: str, byte_count: int, source) -> None:
    h = hashlib.sha256()
    total = 0
    with archive.open(f"blobs/{digest}", "w", force_zip64=True) as out:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            out.write(chunk)
            h.update(chunk)
            total += len(chunk)
    if total != byte_count or h.hexdigest() != digest:
        raise ValueError(f"Input content changed while writing {digest}")


def build() -> None:
    if OUT.exists() or SIDECAR.exists() or Path(str(OUT) + ".partial").exists():
        raise FileExistsError("Refusing to overwrite a cold-store output")
    if sha_file(LEGACY) != PIN_LEGACY_ZIP:
        raise ValueError("P13/P14/P15 original archive no longer matches pinned SHA")
    if sha_file(LEGACY_MANIFEST) != PIN_LEGACY_MANIFEST:
        raise ValueError("P13/P14/P15 original manifest no longer matches pinned SHA")
    previous = json.loads(LEGACY_MANIFEST.read_text(encoding="utf-8"))
    if previous["fileCount"] != 7402 or len(previous["files"]) != 7402:
        raise ValueError("P13/P14/P15 manifest count drift")
    staging = ROOT / "staging"
    stage_names = sorted(
        p.name for p in staging.iterdir()
        if p.is_dir() and p.name not in EXCLUDED_STAGE_NAMES
    )
    if len(stage_names) != 37:
        raise ValueError(f"Historical stage allowlist changed: {len(stage_names)} != 37")
    for name in stage_names:
        if not name.startswith("fcv588-"):
            raise ValueError(f"Unexpected historical stage: {name}")

    files = []
    blobs = {}
    directories = []
    junctions = []
    stage_counts = {}
    partial = Path(str(OUT) + ".partial")
    with zipfile.ZipFile(partial, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6,
                         allowZip64=True) as result:
        with zipfile.ZipFile(LEGACY, "r") as older:
            for row in previous["files"]:
                rel = valid_rel(row["path"])
                sha = row["sha256"].lower()
                size = int(row["size"])
                if rel.split("/")[0] not in LEGACY_ROOTS or len(sha) != 64:
                    raise ValueError(f"Invalid P13 stage entry: {rel}")
                entry = older.getinfo(rel)
                if entry.file_size != size:
                    raise ValueError(f"Invalid prior entry size: {rel}")
                if sha not in blobs:
                    with older.open(entry) as source:
                        add_blob(result, sha, size, source)
                    blobs[sha] = size
                elif blobs[sha] != size:
                    raise ValueError("SHA/size conflict")
                files.append({"path": rel, "sha256": sha, "bytes": size,
                              "mtimeUtc": row.get("mtimeUtc")})
                stage_counts[rel.split("/")[0]] = stage_counts.get(rel.split("/")[0], 0) + 1
        for row in previous["junctions"]:
            name = valid_rel(row["path"])
            if name.split("/")[0] not in LEGACY_ROOTS or not name.endswith("/sources"):
                raise ValueError(f"Unexpected legacy junction: {name}")
            junctions.append({"path": name, "targetRelative": "sources"})

        for stage in stage_names:
            folder = staging / stage
            physical_count = 0
            for current, names, filenames in os.walk(folder, topdown=True, followlinks=False):
                current_path = Path(current)
                rel_dir = valid_rel(current_path.relative_to(ROOT).as_posix())
                directories.append(rel_dir)
                for name in list(names):
                    nested = current_path / name
                    # Python 3.11 on Windows treats NTFS junctions as ordinary
                    # directories in os.walk(followlinks=False). Detect the
                    # REPARSE_POINT attribute explicitly; never traverse one.
                    is_reparse = bool(
                        os.lstat(nested).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT
                    )
                    if is_reparse:
                        names.remove(name)
                        target = nested.resolve(strict=True)
                        if target not in (ROOT / "docs", ROOT / "plans", ROOT / "sources"):
                            raise ValueError(f"Unexpected junction target: {nested} -> {target}")
                        junctions.append({"path": valid_rel(nested.relative_to(ROOT).as_posix()),
                                          "targetRelative": target.relative_to(ROOT).as_posix()})
                    elif nested.is_symlink():
                        raise ValueError(f"Unexpected symbolic link: {nested}")
                for name in sorted(filenames):
                    source = current_path / name
                    if bool(os.lstat(source).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT):
                        raise ValueError(f"Unexpected linked file: {source}")
                    rel = valid_rel(source.relative_to(ROOT).as_posix())
                    if rel.startswith("staging/github-prep-"):
                        raise ValueError("Refusing to archive self")
                    st = source.stat()
                    sha = sha_file(source)
                    if sha not in blobs:
                        with source.open("rb") as stream:
                            add_blob(result, sha, st.st_size, stream)
                        blobs[sha] = st.st_size
                    elif blobs[sha] != st.st_size:
                        raise ValueError(f"SHA/size conflict: {rel}")
                    files.append({"path": rel, "sha256": sha, "bytes": st.st_size,
                                  "mtimeNs": st.st_mtime_ns})
                    physical_count += 1
            stage_counts[f"staging/{stage}"] = physical_count
            expected_small_link_stages = {
                "fcv588-p04-bottom-provenance-20261116": 183,
                "fcv588-photo-echo-20261114": 173,
                "fcv588-photo-integrated-20261116": 178,
                "fcv588-photo-modes-20261114": 176,
                "fcv588-photo-p05menu-20261116": 178,
                "fcv588-photo-p06face-20261116": 178,
                "fcv588-photo-visual-20261114": 171,
            }
            if stage in expected_small_link_stages and physical_count != expected_small_link_stages[stage]:
                raise ValueError(f"Stage traversal must not follow NTFS junctions: {stage}")
            print(f"PACKED_STAGE={stage} FILES={physical_count}", flush=True)

        all_paths = [f["path"] for f in files]
        if len(all_paths) != len(set(all_paths)):
            raise ValueError("Two source paths collide")
        if len(junctions) != 24:
            raise ValueError(f"Unexpected junction count: {len(junctions)} != 24")
        manifest = {
            "schema": "FCV588HistoricalContentStoreV1",
            "created": "2026-11-22",
            "purpose": "offline exact historical staging preservation; not an OEM or release acceptance",
            "oldArchiveSHA256": PIN_LEGACY_ZIP,
            "oldManifestSHA256": PIN_LEGACY_MANIFEST,
            "stageRoots": list(LEGACY_ROOTS) + [f"staging/{x}" for x in stage_names],
            "stageFileCounts": stage_counts,
            "files": files,
            "dirs": sorted(set(directories)),
            "junctions": junctions,
            "blobs": [{"sha256": h, "bytes": size} for h, size in sorted(blobs.items())],
        }
        payload = json.dumps(manifest, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        result.writestr("manifest.json", payload, compress_type=zipfile.ZIP_DEFLATED)
    os.replace(partial, OUT)
    side = {
        "schema": manifest["schema"],
        "archive": OUT.name,
        "archiveSHA256": sha_file(OUT),
        "archiveBytes": OUT.stat().st_size,
        "manifestSHA256": hashlib.sha256(payload).hexdigest(),
        "fileCount": len(files),
        "stageRoots": len(manifest["stageRoots"]),
        "junctions": len(junctions),
        "uniqueBlobs": len(blobs),
        "originalBytes": sum(f["bytes"] for f in files),
        "uniqueBytes": sum(blobs.values()),
        "status": "BUILD_COMPLETE_VERIFY_REQUIRED",
    }
    SIDECAR.write_text(json.dumps(side, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("BUILT=" + json.dumps(side, ensure_ascii=False), flush=True)


def load_verified_manifest(check_all: bool = True) -> dict:
    side = json.loads(SIDECAR.read_text(encoding="utf-8"))
    if side.get("schema") != "FCV588HistoricalContentStoreV1":
        raise ValueError("Unsupported archive schema")
    if sha_file(OUT) != side["archiveSHA256"]:
        raise ValueError("Whole ZIP SHA mismatch")
    with zipfile.ZipFile(OUT) as archive:
        payload = archive.read("manifest.json")
        if hashlib.sha256(payload).hexdigest() != side["manifestSHA256"]:
            raise ValueError("Embedded manifest SHA mismatch")
        manifest = json.loads(payload)
        files = manifest["files"]
        if len(files) != side["fileCount"]:
            raise ValueError("Manifest count mismatch")
        blob_list = manifest["blobs"]
        blobs = {b["sha256"]: b["bytes"] for b in blob_list}
        if len(blobs) != len(blob_list):
            raise ValueError("Duplicate blob identity")
        expected_entries = {"manifest.json"} | {f"blobs/{key}" for key in blobs}
        actual_entries = [e.filename for e in archive.infolist()]
        if len(actual_entries) != len(expected_entries) or set(actual_entries) != expected_entries:
            raise ValueError("Missing or extra ZIP entries")
        stages = set(manifest["stageRoots"])
        for row in files:
            rel = valid_rel(row["path"])
            if not any(rel.startswith(x + "/") for x in stages):
                raise ValueError(f"Unlisted archive root: {rel}")
            if row["sha256"] not in blobs or row["bytes"] != blobs[row["sha256"]]:
                raise ValueError(f"Blob reference mismatch: {rel}")
        if len({f["path"] for f in files}) != len(files):
            raise ValueError("Duplicate historical stage path")
        if check_all:
            for sha, size in blobs.items():
                entry = archive.getinfo("blobs/" + sha)
                if entry.file_size != size:
                    raise ValueError(f"Compressed blob size mismatch: {sha}")
                h = hashlib.sha256()
                with archive.open(entry) as stream:
                    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                        h.update(chunk)
                if h.hexdigest() != sha:
                    raise ValueError(f"Archived blob SHA mismatch: {sha}")
    print(f"VERIFIED_FILES={len(files)} BLOBS={len(blobs)} "
          f"STAGES={len(stages)} JUNCTIONS={len(manifest['junctions'])}", flush=True)
    return manifest


def restore(destination: Path, names: list[str]) -> None:
    manifest = load_verified_manifest()
    stages = manifest["stageRoots"]
    selected = stages if not names else names
    if any(n not in stages for n in selected):
        raise ValueError("Unknown stage requested for restore")
    destination = destination.resolve()
    if not destination.exists():
        destination.mkdir(parents=True)
    for name in selected:
        if (destination / name).exists():
            raise FileExistsError(f"Restore refuses overwrite: {destination / name}")
    for d in manifest["dirs"]:
        if any(d == n or d.startswith(n + "/") for n in selected):
            (destination / valid_rel(d)).mkdir(parents=True, exist_ok=True)
    written = 0
    with zipfile.ZipFile(OUT) as archive:
        for row in manifest["files"]:
            rel = valid_rel(row["path"])
            if not any(rel.startswith(n + "/") for n in selected):
                continue
            target = destination / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                raise FileExistsError(f"Refusing overwrite: {target}")
            h = hashlib.sha256()
            tmp = Path(str(target) + ".restore-partial")
            if tmp.exists():
                raise FileExistsError(f"Refusing temporary file collision: {tmp}")
            with archive.open("blobs/" + row["sha256"]) as inp, tmp.open("xb") as out:
                for chunk in iter(lambda: inp.read(1024 * 1024), b""):
                    out.write(chunk)
                    h.update(chunk)
            if h.hexdigest() != row["sha256"] or tmp.stat().st_size != row["bytes"]:
                raise ValueError(f"Restored file drift: {rel}")
            os.replace(tmp, target)
            if row.get("mtimeNs") is not None:
                os.utime(target, ns=(row["mtimeNs"], row["mtimeNs"]))
            written += 1
    expected = sum(1 for row in manifest["files"]
                   if any(row["path"].startswith(n + "/") for n in selected))
    if written != expected:
        raise ValueError("Restore count mismatch")
    print(f"RESTORED_SHA_VERIFIED={written}/{expected} "
          f"JUNCTIONS_NOT_AUTO_CREATED={sum(any(j['path'].startswith(n+'/') for n in selected) for j in manifest['junctions'])}",
          flush=True)


def audit_live_stages() -> None:
    """Prove every original loose file still equals the immutable archive."""
    manifest = load_verified_manifest()
    expected = {f["path"]: f for f in manifest["files"]}
    expected_links = {x["path"]: x["targetRelative"] for x in manifest["junctions"]}
    found = set()
    links = set()
    for root_name in manifest["stageRoots"]:
        base = ROOT / root_name
        if not base.is_dir():
            raise ValueError(f"Missing loose stage: {root_name}")
        for current, names, files in os.walk(base, topdown=True, followlinks=False):
            folder = Path(current)
            for name in list(names):
                child = folder / name
                if os.lstat(child).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT:
                    names.remove(name)
                    rel = valid_rel(child.relative_to(ROOT).as_posix())
                    if rel not in expected_links or child.resolve() != ROOT / expected_links[rel]:
                        raise ValueError(f"Unexpected junction identity: {rel}")
                    links.add(rel)
            for name in files:
                child = folder / name
                if os.lstat(child).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT:
                    raise ValueError(f"Unexpected file reparse point: {child}")
                rel = valid_rel(child.relative_to(ROOT).as_posix())
                if rel not in expected or rel in found:
                    raise ValueError(f"Unexpected loose file: {rel}")
                info = expected[rel]
                if child.stat().st_size != info["bytes"] or sha_file(child) != info["sha256"]:
                    raise ValueError(f"Loose file differs from archived SHA: {rel}")
                found.add(rel)
        print(f"LIVE_STAGE_SHA_PASS={root_name}", flush=True)
    if found != set(expected) or links != set(expected_links):
        raise ValueError(f"Incomplete loose state: files {len(found)}/{len(expected)}, "
                         f"junctions {len(links)}/{len(expected_links)}")
    print(f"LIVE_STAGE_SHA_VERIFIED={len(found)}/{len(expected)} "
          f"JUNCTIONS_VERIFIED={len(links)}/{len(expected_links)}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("build")
    sub.add_parser("verify")
    sub.add_parser("audit-live")
    restore_cmd = sub.add_parser("restore")
    restore_cmd.add_argument("--destination", type=Path, required=True)
    restore_cmd.add_argument("--stage", action="append", default=[])
    args = parser.parse_args()
    if args.command == "build":
        build()
    elif args.command == "verify":
        load_verified_manifest()
    elif args.command == "audit-live":
        audit_live_stages()
    else:
        restore(args.destination, args.stage)


if __name__ == "__main__":
    main()
