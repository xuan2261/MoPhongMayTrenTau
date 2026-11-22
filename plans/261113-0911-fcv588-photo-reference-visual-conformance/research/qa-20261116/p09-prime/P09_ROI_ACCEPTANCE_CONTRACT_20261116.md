# P09 — LCD photographic ROI decision contract, before reviewer outcome

**Authority:** Original 8 photographs in `sources/FCV588_GiaoDienThucTeMay2016` are `REFERENCE_ONLY`; P08 final integrity SHA `3d1a05419617807b3f3ef24042725bf414d53257d5e7157155ca0a6b787bf16a` and P08 post SHA `82706f90bf424515abc0383d9eb8b5a7895755bf2de1a040c7890a35f8610dd7`. This file is a *QA protocol*, not an accepted OEM calibration, image license or code patch.

## The target boundary must be unambiguous

Identify separately (1) **visible active-content boundary** (the region whose pixels actually vary as the LCD operates), (2) **rounded inner aperture/glass visible boundary** (mechanical/shadow/bezel edge). Do not interchange these two types. Four idealized line intersections are virtual corners, not physical corner landmarks that are necessarily visible; note radius, glare, occlusion and exposure. Always keep top-left, top-right, bottom-right, bottom-left order and original 590×1280 image-space pixel coordinates.

## Evidence gates

1. **Source identity:** 8 source JPEG hashes and P07/P08 parent seals match; no originals, previous receipts or FAIL logs overwritten. Never create a served OEM image derivative.
2. **Annotation repeatability:** a common boundary definition applied independently to all 8; report per-photo two-rater Euclidean corner separation, count of discrepancies and uncertainty. P08's 20-pixel band is a *provisional QA caution threshold*, not OEM tolerance or calibration standard. Crossing it is a HOLD for precision; passing it is **not** automatically calibrated acceptance. Prior reviewers who saw P08 cannot honestly be called blinded.
3. **Homography numerical validity:** nondegenerate four-point geometry, orientation, invertibility and controlled normalized coordinates. Four self-fitted points always map to a chosen rectangle and thus give no independent reprojection-accuracy proof. Uncertainty propagation/landmark checks must be distinguished from fit tautology.
4. **Comparison class:** only qualitative intra-LCD header/pane/order/topology under per-photo projective normalization. Photo-dependent sonar patterns, menu locale, 2016 camera LCD moiré, fonts, colors, and exact pixels cannot be used as OEM truth without suitable oracle.
5. **Release gates:** camera intrinsics/scale unavailable; true OEM dimensions/font/RGB/detents unavailable; firmware UNKNOWN; hardwareValidated=false; rights/release and 65/65 claims HOLD; F1 Phase6 and full visual P07 remain OPEN. Never promote these because P09 math tests are green.

## Stop rule

If the independent annotations disagree about which boundary they represent, or if repeatability/uncertainty is unresolved, preserve both evidence sets and mark `ROI_PRECISE_ACCEPTANCE=HOLD`. Do not average coordinates, edit CSS/Canvas, score a percentage of OEM fidelity, or run redundant P07 Chrome/Node suites when source is unchanged. Independent native Windows speech/POWER-hold/forced colors remain separate P08 NOT_RUN findings until actually exercised.
