from __future__ import annotations

import hashlib
import json
import math
import os
from datetime import datetime
from pathlib import Path

import numpy as np


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
QA_DIR = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261116/p09-geometry-qa"
)
PRIMARY = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261116/p08-roi/P08_LCD_ROI_UNCALIBRATED_CANDIDATES_20261116.json"
)
INDEPENDENT = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261116/p08-independent-photo/P08_INDEPENDENT_ROI_AUDIT_20261116.json"
)
CROSSCHECK = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261116/p08-roi/P08_ROI_INTER_RATER_CROSSCHECK_20261116.json"
)
PHOTOS = ROOT / r"sources\FCV588_GiaoDienThucTeMay2016"
OUTPUT = QA_DIR / "P09_DETERMINISTIC_HOMOGRAPHY_QA_20261116.json"

NAMES = (
    "dual.jpg", "giaoDien.jpg", "hf.jpg", "lf.jpg",
    "nav1.jpg", "nav2.jpg", "zoom.jpg", "zoom2.jpg",
)
CORNER_ORDER = ("TL", "TR", "BR", "BL")
UNIT_QUAD = np.array(((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)), dtype=float)
IMAGE_SIZE = (590, 1280)

# Deliberately loose degeneracy gates. They reject broken geometry rather than
# inventing a calibration-grade quality threshold from uncalibrated photos.
MIN_AREA_FRACTION = 0.10
MIN_EDGE_PX = 100.0
MAX_NORMALIZED_DLT_CONDITION = 1.0e6
MAX_REPROJECTION_ERROR = 1.0e-9
MAX_ROUNDTRIP_ERROR = 1.0e-9


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_once_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    blob = (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(blob)


def jpeg_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if len(data) < 4 or data[:2] != b"\xff\xd8":
        raise ValueError(f"not JPEG: {path}")
    i = 2
    sof = set(range(0xC0, 0xC4)) | set(range(0xC5, 0xC8)) | set(range(0xC9, 0xCC)) | set(range(0xCD, 0xD0))
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        while i < len(data) and data[i] == 0xFF:
            i += 1
        marker = data[i]
        i += 1
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            continue
        if i + 2 > len(data):
            break
        length = int.from_bytes(data[i:i + 2], "big")
        if length < 2 or i + length > len(data):
            raise ValueError(f"invalid JPEG segment: {path}")
        if marker in sof:
            height = int.from_bytes(data[i + 3:i + 5], "big")
            width = int.from_bytes(data[i + 5:i + 7], "big")
            return width, height
        i += length
    raise ValueError(f"JPEG SOF not found: {path}")


def polygon_area(points: np.ndarray) -> float:
    x, y = points[:, 0], points[:, 1]
    return abs(float(0.5 * (np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))))


def convex_quad(points: np.ndarray) -> bool:
    crosses = []
    for i in range(4):
        a, b, c = points[i], points[(i + 1) % 4], points[(i + 2) % 4]
        ab, bc = b - a, c - b
        crosses.append(float(ab[0] * bc[1] - ab[1] * bc[0]))
    return all(v > 1e-9 for v in crosses) or all(v < -1e-9 for v in crosses)


def edge_lengths(points: np.ndarray) -> list[float]:
    return [float(np.linalg.norm(points[(i + 1) % 4] - points[i])) for i in range(4)]


def hartley_normalize(points: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    center = points.mean(axis=0)
    mean_distance = float(np.mean(np.linalg.norm(points - center, axis=1)))
    if not math.isfinite(mean_distance) or mean_distance <= 1e-12:
        raise ValueError("coincident/degenerate normalization points")
    scale = math.sqrt(2.0) / mean_distance
    transform = np.array((
        (scale, 0.0, -scale * center[0]),
        (0.0, scale, -scale * center[1]),
        (0.0, 0.0, 1.0),
    ), dtype=float)
    homogeneous = np.column_stack((points, np.ones(len(points), dtype=float)))
    normalized = (transform @ homogeneous.T).T
    return normalized[:, :2] / normalized[:, 2:3], transform


def solve_homography(source: np.ndarray) -> tuple[np.ndarray, dict]:
    src_n, t_src = hartley_normalize(source)
    dst_n, t_dst = hartley_normalize(UNIT_QUAD)
    rows = []
    for (x, y), (u, v) in zip(src_n, dst_n):
        rows.append((-x, -y, -1.0, 0.0, 0.0, 0.0, u * x, u * y, u))
        rows.append((0.0, 0.0, 0.0, -x, -y, -1.0, v * x, v * y, v))
    a = np.asarray(rows, dtype=float)
    _, singular, vt = np.linalg.svd(a)
    rank = int(np.linalg.matrix_rank(a))
    if rank != 8 or singular[-1] <= np.finfo(float).eps:
        raise ValueError(f"DLT rank/last singular invalid: rank={rank}, s8={singular[-1]}")
    h_n = vt[-1].reshape(3, 3)
    h = np.linalg.inv(t_dst) @ h_n @ t_src
    scale = h[2, 2]
    if abs(scale) < 1e-12:
        scale = np.linalg.norm(h)
    h = h / scale
    if np.linalg.matrix_rank(h) != 3:
        raise ValueError("homography matrix rank < 3")
    dlt_condition = float(singular[0] / singular[-1])
    return h, {
        "normalizedDLTRank": rank,
        "normalizedDLTCondition": dlt_condition,
        "homographyCondition": float(np.linalg.cond(h)),
        "singularValues": [float(v) for v in singular],
    }


def transform_points(h: np.ndarray, points: np.ndarray) -> np.ndarray:
    homogeneous = np.column_stack((points, np.ones(len(points), dtype=float)))
    mapped = (h @ homogeneous.T).T
    w = mapped[:, 2]
    if np.any(np.abs(w) <= 1e-12):
        raise ValueError("projective denominator near zero")
    result = mapped[:, :2] / w[:, None]
    if not np.all(np.isfinite(result)):
        raise ValueError("non-finite projected point")
    return result


def grid_points(values: tuple[float, ...]) -> np.ndarray:
    return np.array([(x, y) for y in values for x in values], dtype=float)


def evaluate_quad(corners: np.ndarray) -> tuple[np.ndarray, dict]:
    width, height = IMAGE_SIZE
    in_bounds = bool(np.all(corners[:, 0] >= 0) and np.all(corners[:, 0] < width)
                     and np.all(corners[:, 1] >= 0) and np.all(corners[:, 1] < height))
    unique = len({(float(x), float(y)) for x, y in corners}) == 4
    area = polygon_area(corners)
    area_fraction = area / float(width * height)
    edges = edge_lengths(corners)
    convex = convex_quad(corners)
    h, numeric = solve_homography(corners)
    mapped_corners = transform_points(h, corners)
    reprojection = np.linalg.norm(mapped_corners - UNIT_QUAD, axis=1)
    target_grid = grid_points((0.0, 0.25, 0.5, 0.75, 1.0))
    inverse = np.linalg.inv(h)
    source_grid = transform_points(inverse, target_grid)
    roundtrip = transform_points(h, source_grid)
    roundtrip_error = np.linalg.norm(roundtrip - target_grid, axis=1)
    pass_flags = {
        "fourUniqueCorners": unique,
        "allCornersWithinImage": in_bounds,
        "convexQuad": convex,
        "areaFractionAboveLooseDegeneracyFloor": area_fraction >= MIN_AREA_FRACTION,
        "minimumEdgeAboveLooseDegeneracyFloor": min(edges) >= MIN_EDGE_PX,
        "normalizedDLTConditionBelowLooseCeiling": numeric["normalizedDLTCondition"] <= MAX_NORMALIZED_DLT_CONDITION,
        "cornerReprojectionErrorWithinNumericalTolerance": float(np.max(reprojection)) <= MAX_REPROJECTION_ERROR,
        "unitGridRoundtripErrorWithinNumericalTolerance": float(np.max(roundtrip_error)) <= MAX_ROUNDTRIP_ERROR,
    }
    return h, {
        "pass": all(pass_flags.values()),
        "flags": pass_flags,
        "polygonAreaPx2": area,
        "areaFractionOfPhoto": area_fraction,
        "edgeLengthsPx": edges,
        "minimumEdgePx": min(edges),
        "cornerReprojectionMax": float(np.max(reprojection)),
        "unitGridRoundtripMax": float(np.max(roundtrip_error)),
        **numeric,
    }


def edge_y_at_x(a: np.ndarray, b: np.ndarray, x: float) -> float:
    dx = float(b[0] - a[0])
    if abs(dx) <= 1e-12:
        raise ValueError("edge vertical while intersecting divider x")
    t = (x - float(a[0])) / dx
    if t < -1e-9 or t > 1.0 + 1e-9:
        raise ValueError(f"divider x={x} outside edge segment")
    return float(a[1] + t * (b[1] - a[1]))


def normalized_divider(h: np.ndarray, corners: np.ndarray, divider_x: float) -> dict:
    top_y = edge_y_at_x(corners[0], corners[1], divider_x)
    bottom_y = edge_y_at_x(corners[3], corners[2], divider_x)
    src = np.array(((divider_x, top_y), (divider_x, bottom_y)), dtype=float)
    dst = transform_points(h, src)
    top_fraction, bottom_fraction = float(dst[0, 0]), float(dst[1, 0])
    return {
        "sourceDividerX": float(divider_x),
        "sourceTopIntersection": [float(divider_x), top_y],
        "sourceBottomIntersection": [float(divider_x), bottom_y],
        "normalizedTopFraction": top_fraction,
        "normalizedBottomFraction": bottom_fraction,
        "normalizedMidFraction": 0.5 * (top_fraction + bottom_fraction),
        "rectifiedTiltAbsFraction": abs(top_fraction - bottom_fraction),
    }


def perturbation_variants(corners: np.ndarray, uncertainty: float):
    for corner_index in range(4):
        for axis in range(2):
            for sign in (-1.0, 1.0):
                variant = corners.copy()
                variant[corner_index, axis] += sign * uncertainty
                yield {
                    "cornerIndex": corner_index,
                    "cornerName": CORNER_ORDER[corner_index],
                    "axis": "x" if axis == 0 else "y",
                    "sign": int(sign),
                }, variant


def sensitivity(corners: np.ndarray, uncertainty: float, divider_x: float | None) -> dict:
    nominal_h, nominal_eval = evaluate_quad(corners)
    probe_target = grid_points((0.1, 0.5, 0.9))
    probe_source = transform_points(np.linalg.inv(nominal_h), probe_target)
    divider_nominal = normalized_divider(nominal_h, corners, divider_x) if divider_x is not None else None
    rows = []
    max_probe_shift = 0.0
    max_condition = nominal_eval["normalizedDLTCondition"]
    min_area_fraction = nominal_eval["areaFractionOfPhoto"]
    divider_mids = []
    divider_tilts = []
    invalid = []
    for descriptor, variant in perturbation_variants(corners, uncertainty):
        try:
            h, ev = evaluate_quad(variant)
            mapped_probe = transform_points(h, probe_source)
            max_shift = float(np.max(np.linalg.norm(mapped_probe - probe_target, axis=1)))
            max_probe_shift = max(max_probe_shift, max_shift)
            max_condition = max(max_condition, ev["normalizedDLTCondition"])
            min_area_fraction = min(min_area_fraction, ev["areaFractionOfPhoto"])
            divider = normalized_divider(h, variant, divider_x) if divider_x is not None else None
            if divider is not None:
                divider_mids.append(divider["normalizedMidFraction"])
                divider_tilts.append(divider["rectifiedTiltAbsFraction"])
            rows.append({
                **descriptor,
                "valid": ev["pass"],
                "normalizedDLTCondition": ev["normalizedDLTCondition"],
                "areaFractionOfPhoto": ev["areaFractionOfPhoto"],
                "maxNineProbeNormalizedShift": max_shift,
                "divider": divider,
            })
            if not ev["pass"]:
                invalid.append({**descriptor, "reason": "numeric/degeneracy gate failed"})
        except Exception as exc:
            invalid.append({**descriptor, "reason": str(exc)})
            rows.append({**descriptor, "valid": False, "error": str(exc)})
    result = {
        "uncertaintyPx": float(uncertainty),
        "perturbationRule": "16 axial variants: one corner at a time, +/- stated uncertainty along x or y; deterministic, not Monte Carlo",
        "variantCount": len(rows),
        "allVariantsValid": len(invalid) == 0,
        "invalidVariants": invalid,
        "maxNineProbeNormalizedShift": max_probe_shift,
        "maxNormalizedDLTCondition": max_condition,
        "minimumAreaFractionAcrossVariants": min_area_fraction,
        "variants": rows,
    }
    if divider_nominal is not None:
        result["dividerNominal"] = divider_nominal
        result["dividerSensitivity"] = {
            "normalizedMidFractionMin": min(divider_mids),
            "normalizedMidFractionMax": max(divider_mids),
            "normalizedMidFractionSpan": max(divider_mids) - min(divider_mids),
            "maxAbsShiftFromNominal": max(abs(v - divider_nominal["normalizedMidFraction"]) for v in divider_mids),
            "maxRectifiedTiltAbsFraction": max(divider_tilts),
            "note": "corner-uncertainty sensitivity only; P07 dividerX measurement uncertainty is not independently quantified",
        }
    return result


def main() -> int:
    if OUTPUT.exists():
        raise FileExistsError(f"write-once output exists: {OUTPUT}")

    primary_sha = sha256_file(PRIMARY)
    independent_sha = sha256_file(INDEPENDENT)
    crosscheck_sha = sha256_file(CROSSCHECK)
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    independent = json.loads(INDEPENDENT.read_text(encoding="utf-8"))
    crosscheck = json.loads(CROSSCHECK.read_text(encoding="utf-8"))

    if crosscheck.get("primaryReceiptSha256") != primary_sha:
        raise RuntimeError("crosscheck primary SHA binding mismatch")
    if crosscheck.get("independentReceiptSha256") != independent_sha:
        raise RuntimeError("crosscheck independent SHA binding mismatch")

    primary_rows = primary["candidateLCDROIs"]
    independent_rows = {row["name"]: row for row in independent["photos"]}
    if set(primary_rows) != set(NAMES) or set(independent_rows) != set(NAMES):
        raise RuntimeError("P08 input photo set is not exact 8")
    if tuple(independent["coordinateDiscipline"]["imageSizePx"]) != IMAGE_SIZE:
        raise RuntimeError("independent coordinate image size mismatch")

    photo_bindings = []
    per_photo = {}
    all_base_pass = True
    all_perturb_pass = True
    divider_comparisons = {}
    for name in NAMES:
        photo_path = PHOTOS / name
        actual_sha = sha256_file(photo_path)
        size = jpeg_size(photo_path)
        p = primary_rows[name]
        i = independent_rows[name]
        if size != IMAGE_SIZE:
            raise RuntimeError(f"{name} dimensions {size} != {IMAGE_SIZE}")
        if tuple(p["originalImagePixels"]) != IMAGE_SIZE:
            raise RuntimeError(f"{name} primary dimension binding mismatch")
        if p["originalSHA256"] != actual_sha or i["sha256"] != actual_sha:
            raise RuntimeError(f"{name} SHA binding mismatch")
        photo_bindings.append({
            "name": name,
            "sha256": actual_sha,
            "bytes": photo_path.stat().st_size,
            "imagePixels": list(size),
            "rights": "REFERENCE_ONLY",
        })

        p_corners = np.asarray(p["candidateQuadTL_TR_BR_BL_px"], dtype=float)
        i_corners = np.asarray([i["cornersPx"][corner] for corner in CORNER_ORDER], dtype=float)
        divider_meta = p.get("independentP07PhotoSpaceSplit")
        divider_x = float(divider_meta["dividerX"]) if divider_meta is not None else None

        p_h, p_eval = evaluate_quad(p_corners)
        i_h, i_eval = evaluate_quad(i_corners)
        p_sens = sensitivity(p_corners, float(p["edgeAmbiguityPx"]), divider_x)
        i_sens = sensitivity(i_corners, float(i["uncertaintyPx"]), divider_x)
        all_base_pass = all_base_pass and p_eval["pass"] and i_eval["pass"]
        all_perturb_pass = all_perturb_pass and p_sens["allVariantsValid"] and i_sens["allVariantsValid"]

        entry = {
            "mode": i["mode"],
            "primary": {
                "cornerClass": p["coordinateClass"],
                "cornersTL_TR_BR_BL_px": p_corners.tolist(),
                "baseHomographyQA": p_eval,
                "sensitivity": p_sens,
            },
            "independent": {
                "coordinateStatus": independent["coordinateDiscipline"]["coordinateStatus"],
                "cornersTL_TR_BR_BL_px": i_corners.tolist(),
                "baseHomographyQA": i_eval,
                "sensitivity": i_sens,
            },
            "betweenRater": {
                "maxCornerDistancePx": crosscheck["perPhoto"][name]["maxDifferencePx"],
                "withinPrimaryAmbiguityAllCorners": crosscheck["perPhoto"][name]["withinPrimaryAmbiguityAllCorners"],
                "interpretation": "two uncalibrated image-space annotations; not calibrated residuals and not to be averaged",
            },
        }
        if divider_meta is not None:
            p_div = p_sens["dividerNominal"]
            i_div = i_sens["dividerNominal"]
            comparison = {
                "sourceP07PhotoSpace": divider_meta,
                "primaryNormalized": p_div,
                "independentNormalized": i_div,
                "absoluteRaterDifferenceInNormalizedMidFraction": abs(
                    p_div["normalizedMidFraction"] - i_div["normalizedMidFraction"]),
                "boundary": "same P07 photo-space dividerX transformed through two tentative corner homographies; no physical/OEM truth claim",
            }
            entry["p07DividerNormalization"] = comparison
            divider_comparisons[name] = comparison
        else:
            entry["p07DividerNormalization"] = {
                "status": "NOT_APPLICABLE_NO_P07_PHOTO_SPACE_DIVIDER_IN_PRIMARY_INPUT",
                "inventedDivider": False,
            }
        per_photo[name] = entry

    result_status = (
        "PASS_BOUNDED_DETERMINISTIC_GEOMETRY_QA"
        if all_base_pass and all_perturb_pass
        else "HOLD_NUMERICAL_GEOMETRY_QA"
    )
    payload = {
        "schema": "fcv588-p09-deterministic-homography-qa-v1",
        "createdAt": datetime.now().astimezone().isoformat(),
        "result": result_status,
        "disposition": {
            "mathematicalHomographyQA": "PASS" if all_base_pass and all_perturb_pass else "HOLD",
            "roiCalibration": "HOLD",
            "physicalTruth": "HOLD",
            "oemFramebufferConformity": "HOLD",
            "hardwareFirmwareRightsRelease": "HOLD",
        },
        "scope": "DETERMINISTIC_IN_MEMORY_MATH_AND_METADATA_ONLY",
        "script": {
            "path": str(Path(__file__).resolve()),
            "sha256": sha256_file(Path(__file__).resolve()),
            "numpyVersion": np.__version__,
        },
        "inputs": {
            "primary": {"path": str(PRIMARY), "sha256": primary_sha},
            "independent": {"path": str(INDEPENDENT), "sha256": independent_sha},
            "crosscheck": {"path": str(CROSSCHECK), "sha256": crosscheck_sha},
            "photoCount": 8,
            "photos": photo_bindings,
        },
        "method": {
            "destinationPlane": "arbitrary normalized unit rectangle [0,1]x[0,1]",
            "homographySolver": "Hartley-normalized four-point DLT via NumPy SVD",
            "nondegenerateChecks": {
                "convexQuad": True,
                "minAreaFraction": MIN_AREA_FRACTION,
                "minEdgePx": MIN_EDGE_PX,
                "normalizedDLTConditionCeiling": MAX_NORMALIZED_DLT_CONDITION,
                "cornerReprojectionTolerance": MAX_REPROJECTION_ERROR,
                "unitGridRoundtripTolerance": MAX_ROUNDTRIP_ERROR,
                "note": "loose numerical-degeneracy gates only; not calibration quality thresholds",
            },
            "uncertaintySensitivity": "16 deterministic one-corner axial +/- stated uncertainty variants per rater/photo plus 9 nominal interior probes",
            "dividerTransform": "for the five photos with a P07 photo-space dividerX, intersect x=dividerX with tentative top/bottom LCD edges, transform both endpoints, report normalized top/bottom/mid fraction and tilt",
            "noMonteCarlo": True,
        },
        "summary": {
            "baseHomographiesChecked": 16,
            "perturbedHomographiesChecked": 8 * 2 * 16,
            "allBaseHomographiesNumericallyPass": all_base_pass,
            "allDeterministicPerturbationsNumericallyValid": all_perturb_pass,
            "p07DividerPhotos": sorted(divider_comparisons),
            "p07DividerPhotoCount": len(divider_comparisons),
            "noDividerInventedForOtherPhotos": True,
        },
        "perPhoto": per_photo,
        "boundaries": [
            "Corners are tentative visible-image LCD/aperture metadata, not hidden manufacturing corners.",
            "A nondegenerate numerically stable homography does not validate the corner picks as physical truth.",
            "Unit-rectangle normalization does not imply a 480x640 OEM framebuffer or any physical aspect ratio.",
            "Corner perturbation sensitivity is deterministic numerical sensitivity, not a calibrated confidence interval.",
            "P07 dividerX values are photo-space observations with unquantified divider measurement uncertainty; P09 perturbs corners only.",
            "Lens distortion/intrinsics/coplanar physical scale remain unknown.",
            "No crops, warps, rectified images or OEM pixel derivatives are created or saved.",
        ],
        "holds": {
            "p08InterRaterDecision": crosscheck["decision"],
            "preciseROI": "HOLD",
            "phase6": "OPEN",
            "featureClaims": "65/65 HOLD",
            "hardware": "HOLD",
            "firmware": "HOLD",
            "rights": "HOLD",
            "release": "HOLD",
            "oemFidelityPercentClaim": None,
        },
        "operations": {
            "originalPhotosEdited": False,
            "cropWritten": False,
            "warpWritten": False,
            "derivedImageWritten": False,
            "runtimeEdited": False,
            "browserStarted": False,
            "server4173Touched": False,
            "windowsSettingsChanged": False,
            "networkUsed": False,
            "resultWriteOnce": True,
        },
    }
    write_once_json(OUTPUT, payload)
    print(json.dumps({
        "result": payload["result"],
        "output": str(OUTPUT),
        "outputSHA256": sha256_file(OUTPUT),
        "scriptSHA256": payload["script"]["sha256"],
        "baseHomographiesChecked": payload["summary"]["baseHomographiesChecked"],
        "perturbedHomographiesChecked": payload["summary"]["perturbedHomographiesChecked"],
        "dividerPhotos": payload["summary"]["p07DividerPhotos"],
    }, indent=2))
    return 0 if result_status.startswith("PASS_") else 2


if __name__ == "__main__":
    raise SystemExit(main())
