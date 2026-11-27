import {
  MDC2060_RANGES,
  MDC2060_COLOR_PALETTES,
  MDC2060_MAIN_MENU_TREE,
  MDC2060_SYSTEM_MENU_TREE,
  MDC2060_RADAR_SPECS,
  formatRangeValue,
} from "../../src/devices/mdc2060/spec.mjs";
import { evaluatePolarEchoGrid } from "../../src/devices/mdc2060/radar-signal.mjs";
import {
  tMdc2060,
  localizeMdc2060MenuGroup,
  localizeMdc2060MenuItem,
  localizeMdc2060Choice,
  localizeMdc2060PowerMode,
  localizeMdc2060Alarm,
} from "../../src/devices/mdc2060/i18n.mjs";

export const LCD_WIDTH = 480;
export const LCD_HEIGHT = 640;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const FONT_SANS = '"Segoe UI", Arial, sans-serif';
const FONT_MONO = 'Consolas, "Liberation Mono", monospace';

const NOTICE_FALLBACKS = Object.freeze({
  noTarget: Object.freeze({ en: "NO TARGET TO ACQUIRE", vi: "KHÔNG CÓ MỤC TIÊU" }),
  ataAcquired: Object.freeze({ en: "ATA TARGET ACQUIRED", vi: "ĐÃ BẮT MỤC TIÊU ATA" }),
  ataDuplicate: Object.freeze({ en: "TARGET ALREADY TRACKED", vi: "MỤC TIÊU ĐÃ ĐƯỢC BÁM" }),
  aisOff: Object.freeze({ en: "AIS DISPLAY OFF", vi: "HIỂN THỊ AIS ĐANG TẮT" }),
  noAisTarget: Object.freeze({ en: "NO AIS TARGET IN RANGE", vi: "KHÔNG CÓ TÀU AIS" }),
  allResetDone: Object.freeze({ en: "ALL SETTINGS RESET", vi: "ĐÃ ĐẶT LẠI MẶC ĐỊNH" }),
});

/**
 * Exact 480x640 scope geometry matching src/devices/mdc2060/model.mjs:2490-2502
 * so canvas clicks and cursor telemetry align pixel-for-pixel.
 */
export function getScopeGeometry(screenMode) {
  if (screenMode === "PPI/PPI") {
    return Object.freeze({
      main: Object.freeze({ cx: 240, cy: 170, radius: 135 }),
      sub: Object.freeze({ cx: 240, cy: 465, radius: 135 }),
      nav: null,
    });
  }
  if (screenMode === "PPI/NAV") {
    return Object.freeze({
      main: Object.freeze({ cx: 240, cy: 200, radius: 165 }),
      sub: null,
      nav: Object.freeze({ x: 8, y: 378, w: 464, h: 222 }),
    });
  }
  return Object.freeze({
    main: Object.freeze({ cx: 240, cy: 300, radius: 210 }),
    sub: null,
    nav: null,
  });
}

function normalizeDeg360(deg) {
  if (!Number.isFinite(deg)) return 0;
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

function parseHexRgb(hex, fallback = [126, 245, 255]) {
  if (typeof hex !== "string") return fallback;
  const clean = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback;
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function wrapLon180(deg) {
  if (!Number.isFinite(deg)) return 0;
  let d = ((deg + 180) % 360 + 360) % 360 - 180;
  if (d === -180) d = 180;
  return d;
}

function topOfScreenRefDeg(effectivePresentationMode, ownshipSnapshot) {
  if (effectivePresentationMode === "N-UP") return 0;
  if (effectivePresentationMode === "C-UP" || effectivePresentationMode === "W-UP") {
    return ownshipSnapshot?.cogDeg ?? ownshipSnapshot?.hdgDeg ?? 0;
  }
  return ownshipSnapshot?.hdgDeg ?? 0;
}

function activeSweepOrigin(state) {
  if (state.effectiveModes?.motionMode === "TM") {
    return state.tmOffset ?? { xFrac: 0, yFrac: 0 };
  }
  if (state.settings?.offCenter === "ON") {
    return state.offCenterOffset ?? { xFrac: 0, yFrac: 0 };
  }
  return { xFrac: 0, yFrac: 0 };
}

function isActivelyTransmitting(state) {
  return state.powerMode === "transmit" ||
    (state.powerMode === "sleep" && state.sleepState?.phase === "burst");
}

function polarToCanvas(originX, originY, radiusPx, rangeNm, targetRangeNm, trueBrgDeg, topRef) {
  const screenDeg = normalizeDeg360(trueBrgDeg - topRef);
  const rad = screenDeg * DEG_TO_RAD;
  const rPx = (targetRangeNm / rangeNm) * radiusPx;
  return {
    x: originX + rPx * Math.sin(rad),
    y: originY - rPx * Math.cos(rad),
  };
}

function geoToPolarFromOwnship(ownship, lat, lon) {
  if (!ownship || ownship.lat === null || ownship.lon === null ||
      !Number.isFinite(ownship.lat) || !Number.isFinite(ownship.lon) ||
      !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  const meanLatRad = ((ownship.lat + lat) * 0.5) * DEG_TO_RAD;
  const cosLat = Math.max(0.1, Math.cos(meanLatRad));
  const dyNm = (lat - ownship.lat) * 60;
  const dxNm = wrapLon180(lon - ownship.lon) * 60 * cosLat;
  const rangeNm = Math.hypot(dxNm, dyNm);
  const bearingDeg = rangeNm > 1e-6 ? normalizeDeg360(Math.atan2(dxNm, dyNm) * RAD_TO_DEG) : 0;
  return { rangeNm, bearingDeg };
}

function formatDeg3(deg) {
  if (!Number.isFinite(deg)) return "---.-°";
  const v = normalizeDeg360(deg);
  return `${v.toFixed(1).padStart(5, "0")}°`;
}

function formatLatLon(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { latStr: "--°--.--' -", lonStr: "---°--.--' -" };
  }
  const fmt = (val, posHem, negHem, degWidth) => {
    const hem = val >= 0 ? posHem : negHem;
    const abs = Math.abs(val);
    const d = Math.floor(abs);
    const m = (abs - d) * 60;
    return `${String(d).padStart(degWidth, "0")}°${m.toFixed(2).padStart(5, "0")}'${hem}`;
  };
  return {
    latStr: fmt(lat, "N", "S", 2),
    lonStr: fmt(lon, "E", "W", 3),
  };
}

function formatMmSs(totalSec) {
  const s = Math.max(0, Math.ceil(Number.isFinite(totalSec) ? totalSec : 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function resolveNoticeText(notice, lang) {
  if (!notice) return "";
  if (notice === "ataBoardMissing" || notice === "aisBoardMissing" || notice === "ataMaxCap") {
    return tMdc2060(lang, `alarm.${notice}`, notice);
  }
  const entry = Object.hasOwn(NOTICE_FALLBACKS, notice) ? NOTICE_FALLBACKS[notice] : null;
  if (entry) return entry[lang === "vi" ? "vi" : "en"];
  return String(notice);
}

function createOffscreenBuffer() {
  const c = document.createElement("canvas");
  c.width = LCD_WIDTH;
  c.height = LCD_HEIGHT;
  return { canvas: c, ctx: c.getContext("2d") };
}

function paintEchoRadialSpoke(ctx, ox, oy, radiusPx, grid, numBins, trueAz, topRef, lutHex, alpha = 1) {
  const screenDeg = normalizeDeg360(trueAz - topRef);
  const a0 = ((screenDeg - 0.65) - 90) * DEG_TO_RAD;
  const a1 = ((screenDeg + 0.65) - 90) * DEG_TO_RAD;
  const rowOffset = trueAz * numBins;
  const binPx = radiusPx / numBins;

  ctx.globalAlpha = alpha;
  let b = 0;
  while (b < numBins) {
    const level = grid[rowOffset + b];
    if (level === 0) {
      b += 1;
      continue;
    }
    let end = b + 1;
    while (end < numBins && grid[rowOffset + end] === level) {
      end += 1;
    }
    const rInner = b * binPx;
    const rOuter = end * binPx;
    ctx.fillStyle = lutHex[level] ?? lutHex[7];
    ctx.beginPath();
    ctx.arc(ox, oy, rOuter, a0, a1);
    if (rInner > 0.25) {
      ctx.arc(ox, oy, rInner, a1, a0, true);
    } else {
      ctx.lineTo(ox, oy);
    }
    ctx.closePath();
    ctx.fill();
    b = end;
  }
  ctx.globalAlpha = 1;
}

function seedScopePhosphor(bufCtx, scope, origin, echoResult, topRef, sweepAzDeg, palette) {
  const { cx, cy, radius } = scope;
  const ox = cx + origin.xFrac * radius;
  const oy = cy + origin.yFrac * radius;

  bufCtx.save();
  bufCtx.clearRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
  bufCtx.beginPath();
  bufCtx.arc(cx, cy, radius, 0, Math.PI * 2);
  bufCtx.clip();

  bufCtx.fillStyle = palette.ppiFill;
  bufCtx.fillRect(cx - radius - 2, cy - radius - 2, radius * 2 + 4, radius * 2 + 4);

  if (echoResult && echoResult.grid) {
    const { grid, numAzimuths, numRangeBins } = echoResult;
    const lutHex = palette.echoLutHex;
    const sweepInt = Math.floor(normalizeDeg360(sweepAzDeg));
    for (let az = 0; az < numAzimuths; az++) {
      const ageDeg = normalizeDeg360(sweepInt - az);
      const decay = 1 - (ageDeg / 360) * 0.42;
      paintEchoRadialSpoke(bufCtx, ox, oy, radius, grid, numRangeBins, az, topRef, lutHex, decay);
    }
  }
  bufCtx.restore();
}

function stepScopePhosphor(bufCtx, scope, origin, echoResult, topRef, prevAzDeg, curAzDeg, palette) {
  const { cx, cy, radius } = scope;
  const ox = cx + origin.xFrac * radius;
  const oy = cy + origin.yFrac * radius;
  const deltaDeg = normalizeDeg360(curAzDeg - prevAzDeg);
  if (deltaDeg < 0.2 || deltaDeg > 200) {
    seedScopePhosphor(bufCtx, scope, origin, echoResult, topRef, curAzDeg, palette);
    return;
  }

  bufCtx.save();
  bufCtx.beginPath();
  bufCtx.arc(cx, cy, radius, 0, Math.PI * 2);
  bufCtx.clip();

  // Phosphor persistence decay toward palette.ppiFill (dark OR light WHITE background!)
  const [fr, fg, fb] = palette.ppiFillRgb;
  const fadeAlpha = Math.min(0.28, (deltaDeg / 360) * 0.6);
  bufCtx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${fadeAlpha.toFixed(3)})`;
  bufCtx.fillRect(cx - radius - 2, cy - radius - 2, radius * 2 + 4, radius * 2 + 4);

  // Clear newly swept slice to clean ppiFill before painting fresh echoes
  const startScreen = normalizeDeg360(prevAzDeg - topRef);
  const endScreen = startScreen + deltaDeg;
  bufCtx.fillStyle = palette.ppiFill;
  bufCtx.beginPath();
  bufCtx.moveTo(ox, oy);
  bufCtx.arc(
    ox,
    oy,
    radius * 2,
    (startScreen - 90) * DEG_TO_RAD,
    (endScreen - 90) * DEG_TO_RAD,
  );
  bufCtx.closePath();
  bufCtx.fill();

  if (echoResult && echoResult.grid) {
    const { grid, numRangeBins } = echoResult;
    const lutHex = palette.echoLutHex;
    const steps = Math.max(1, Math.ceil(deltaDeg));
    for (let i = 0; i <= steps; i++) {
      const trueAz = Math.floor(normalizeDeg360(prevAzDeg + i)) % 360;
      paintEchoRadialSpoke(bufCtx, ox, oy, radius, grid, numRangeBins, trueAz, topRef, lutHex, 1);
    }
  }
  bufCtx.restore();
}

function renderTrailsBuffer(trailCtx, scope, origin, rangeNm, state, topRef, palette) {
  trailCtx.clearRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
  if (!isActivelyTransmitting(state)) return;
  if (state.settings?.trailTime === "OFF" || !Array.isArray(state.trails) || state.trails.length === 0) {
    return;
  }

  const { cx, cy, radius } = scope;
  const ox = cx + origin.xFrac * radius;
  const oy = cy + origin.yFrac * radius;
  const [tr, tg, tb] = palette.trailRgb;
  const isTrueTrail = state.effectiveModes?.trailMode === "T";
  const own = state.ownshipSnapshot;

  trailCtx.save();
  trailCtx.beginPath();
  trailCtx.arc(cx, cy, radius, 0, Math.PI * 2);
  trailCtx.clip();

  for (let i = 0; i < state.trails.length; i++) {
    const track = state.trails[i];
    const pts = track.points;
    if (!Array.isArray(pts) || pts.length < 2) continue;

    for (let j = 0; j < pts.length - 1; j++) {
      const p = pts[j];
      let polar = null;
      if (isTrueTrail && Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
        polar = geoToPolarFromOwnship(own, p.lat, p.lon);
      }
      if (!polar) {
        polar = { rangeNm: p.rangeNm, bearingDeg: p.bearingDeg };
      }
      if (!Number.isFinite(polar.rangeNm) || polar.rangeNm > rangeNm * 1.4) continue;
      const pos = polarToCanvas(ox, oy, radius, rangeNm, polar.rangeNm, polar.bearingDeg, topRef);
      const frac = (j + 1) / pts.length;
      const alpha = (0.14 + frac * 0.62).toFixed(3);
      const dotR = 1.2 + frac * 1.4;
      trailCtx.fillStyle = `rgba(${tr}, ${tg}, ${tb}, ${alpha})`;
      trailCtx.beginPath();
      trailCtx.arc(pos.x, pos.y, dotR, 0, Math.PI * 2);
      trailCtx.fill();
    }
  }
  trailCtx.restore();
}

function drawCompassRose(ctx, scope, topRef, palette, compact) {
  const { cx, cy, radius } = scope;
  ctx.save();
  ctx.strokeStyle = palette.compassColor;
  ctx.fillStyle = palette.compassColor;
  ctx.lineWidth = 1.25;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const step = compact ? 5 : 2;
  ctx.font = compact ? `700 8px ${FONT_MONO}` : `700 9.5px ${FONT_MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let deg = 0; deg < 360; deg += step) {
    const screenDeg = normalizeDeg360(deg - topRef);
    const rad = (screenDeg - 90) * DEG_TO_RAD;
    const isMajor30 = deg % 30 === 0;
    const isMajor10 = deg % 10 === 0;
    const isMed5 = deg % 5 === 0;
    const tickLen = isMajor10 ? 7 : (isMed5 ? 4.5 : 2.5);
    const x1 = cx + (radius - tickLen) * Math.cos(rad);
    const y1 = cy + (radius - tickLen) * Math.sin(rad);
    const x2 = cx + radius * Math.cos(rad);
    const y2 = cy + radius * Math.sin(rad);

    ctx.lineWidth = isMajor10 ? 1.2 : 0.7;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (isMajor30 && (!compact || deg % 60 === 0)) {
      const labelR = radius + (compact ? 9 : 11);
      let lx = cx + labelR * Math.cos(rad);
      let ly = cy + labelR * Math.sin(rad);
      if (ly > 598) {
        const insetR = radius - 12;
        lx = cx + insetR * Math.cos(rad);
        ly = cy + insetR * Math.sin(rad);
      }
      ctx.fillText(String(deg).padStart(3, "0"), lx, ly);
    }
  }

  // Top-of-scope lubber caret
  ctx.fillStyle = palette.textAccent;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius + 1);
  ctx.lineTo(cx - 4, cy - radius - 6);
  ctx.lineTo(cx + 4, cy - radius - 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawScopeVectors(ctx, scope, origin, rangeDef, state, topRef, aisProjection, sweepAzDeg, palette, opts) {
  const { cx, cy, radius } = scope;
  const ox = cx + origin.xFrac * radius;
  const oy = cy + origin.yFrac * radius;
  const rangeNm = rangeDef.nm;
  const hdgDeg = state.ownshipSnapshot?.hdgDeg ?? 0;
  const ownCogDeg = state.ownshipSnapshot?.cogDeg ?? hdgDeg;
  const ownSogKn = state.ownshipSnapshot?.sogKn ?? 0;
  const flashOn = Math.floor((opts.nowMs ?? 0) / 350) % 2 === 0;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 0.5, 0, Math.PI * 2);
  ctx.clip();

  // 1. Live Rotating Sweep Beam (only when actively TX)
  if (isActivelyTransmitting(state)) {
    const beamScreenDeg = normalizeDeg360(sweepAzDeg - topRef);
    const beamRad = (beamScreenDeg - 90) * DEG_TO_RAD;

    // Soft trailing scan glow wedge tinted to the active palette's sweepBeamColor
    const [sr, sg, sb] = parseHexRgb(palette.sweepBeamColor);
    const wedgeArc = 14 * DEG_TO_RAD;
    const grad = ctx.createRadialGradient(ox, oy, 2, ox, oy, radius * 1.6);
    const innerAlpha = palette.isLightBackground ? 0.1 : 0.16;
    grad.addColorStop(0, `rgba(${sr}, ${sg}, ${sb}, ${innerAlpha})`);
    grad.addColorStop(1, `rgba(${sr}, ${sg}, ${sb}, 0.01)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, radius * 1.7, beamRad - wedgeArc, beamRad);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = palette.sweepBeamColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + radius * 1.8 * Math.cos(beamRad), oy + radius * 1.8 * Math.sin(beamRad));
    ctx.stroke();
  }

  // 2. Fixed Range Rings
  if (state.settings?.rings === "ON") {
    ctx.strokeStyle = palette.ringColor;
    ctx.lineWidth = 0.85;
    for (let k = 1; k < rangeDef.rings; k++) {
      const rPx = (k * rangeDef.ringNm / rangeNm) * radius;
      ctx.beginPath();
      ctx.arc(ox, oy, rPx, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 3. Guard Zone Annular Sector (handles start > end wrap and start === end full 360 deg)
  if (!opts.isSubScope && state.guardZone && state.guardZone.mode !== "OFF") {
    const gz = state.guardZone;
    const rIn = Math.max(0, (gz.innerNm / rangeNm) * radius);
    const rOut = Math.max(rIn + 2, (gz.outerNm / rangeNm) * radius);
    const isRel = state.effectiveModes?.brgMode === "R";
    const startTrue = isRel ? normalizeDeg360(gz.startBrgDeg + hdgDeg) : gz.startBrgDeg;
    const endTrue = isRel ? normalizeDeg360(gz.endBrgDeg + hdgDeg) : gz.endBrgDeg;
    const fullCircle = Math.abs(normalizeDeg360(gz.startBrgDeg) - normalizeDeg360(gz.endBrgDeg)) < 1e-6;
    const gzColor = gz.alarmActive && flashOn ? palette.guardZoneAlarmColor : palette.guardZoneColor;

    ctx.save();
    ctx.strokeStyle = gzColor;
    ctx.lineWidth = gz.alarmActive ? 2.1 : 1.35;
    ctx.fillStyle = gz.alarmActive ? "rgba(255, 59, 71, 0.16)" : "rgba(255, 196, 61, 0.08)";

    if (fullCircle) {
      ctx.beginPath();
      ctx.arc(ox, oy, rOut, 0, Math.PI * 2);
      if (rIn > 0.5) {
        ctx.arc(ox, oy, rIn, 0, Math.PI * 2, true);
      }
      ctx.fill("evenodd");
      ctx.beginPath();
      ctx.arc(ox, oy, rOut, 0, Math.PI * 2);
      ctx.stroke();
      if (rIn > 0.5) {
        ctx.beginPath();
        ctx.arc(ox, oy, rIn, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      const startSc = normalizeDeg360(startTrue - topRef);
      let endSc = normalizeDeg360(endTrue - topRef);
      if (endSc <= startSc) endSc += 360;
      const a0 = (startSc - 90) * DEG_TO_RAD;
      const a1 = (endSc - 90) * DEG_TO_RAD;
      ctx.beginPath();
      ctx.arc(ox, oy, rOut, a0, a1);
      ctx.arc(ox, oy, rIn, a1, a0, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Parallel Index (PI) Lines
  if (!opts.isSubScope && state.settings?.piLine && state.settings.piLine !== "OFF") {
    const piCount = Number(state.settings.piLine) || 0;
    const piTrue = state.effectiveModes?.brgMode === "R"
      ? normalizeDeg360((state.piBearingDeg ?? 0) + hdgDeg)
      : (state.piBearingDeg ?? 0);
    const piScreenRad = normalizeDeg360(piTrue - topRef) * DEG_TO_RAD;
    const dirX = Math.sin(piScreenRad);
    const dirY = -Math.cos(piScreenRad);
    const perpX = Math.cos(piScreenRad);
    const perpY = Math.sin(piScreenRad);
    const spacingPx = ((state.piSpacingNm ?? 0.5) / rangeNm) * radius;

    ctx.save();
    ctx.strokeStyle = palette.piLineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    for (let n = 1; n <= piCount; n++) {
      for (const sign of [-1, 1]) {
        const px = ox + perpX * spacingPx * n * sign;
        const py = oy + perpY * spacingPx * n * sign;
        ctx.beginPath();
        ctx.moveTo(px - dirX * radius * 2, py - dirY * radius * 2);
        ctx.lineTo(px + dirX * radius * 2, py + dirY * radius * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 5. Heading Line (HL) — hidden when ENT held (hlSuppressed === true)
  if (!state.hlSuppressed) {
    const hlScreenDeg = normalizeDeg360(hdgDeg - topRef);
    const hlRad = (hlScreenDeg - 90) * DEG_TO_RAD;
    ctx.strokeStyle = palette.headingLineColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + radius * 1.8 * Math.cos(hlRad), oy + radius * 1.8 * Math.sin(hlRad));
    ctx.stroke();
  }

  // Ownship origin mark
  ctx.strokeStyle = palette.headingLineColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(ox, oy, 3, 0, Math.PI * 2);
  ctx.stroke();

  // 6. EBL1 / EBL2 & VRM1 / VRM2 (Main scope)
  if (!opts.isSubScope) {
    const isRelBrg = state.effectiveModes?.brgMode === "R";

    if (state.settings?.ebl1 === "ON") {
      const eblOrigin = state.settings.ebl1Float === "ON"
        ? {
            x: cx + (state.ebl1Origin?.xFrac ?? 0) * radius,
            y: cy + (state.ebl1Origin?.yFrac ?? 0) * radius,
          }
        : { x: ox, y: oy };
      const trueDeg = isRelBrg ? normalizeDeg360((state.ebl1Deg ?? 0) + hdgDeg) : (state.ebl1Deg ?? 0);
      const rad = (normalizeDeg360(trueDeg - topRef) - 90) * DEG_TO_RAD;
      ctx.save();
      ctx.strokeStyle = palette.ebl1Color;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(eblOrigin.x, eblOrigin.y);
      ctx.lineTo(eblOrigin.x + radius * 2 * Math.cos(rad), eblOrigin.y + radius * 2 * Math.sin(rad));
      ctx.stroke();
      if (state.settings.ebl1Float === "ON") {
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(eblOrigin.x - 5, eblOrigin.y);
        ctx.lineTo(eblOrigin.x + 5, eblOrigin.y);
        ctx.moveTo(eblOrigin.x, eblOrigin.y - 5);
        ctx.lineTo(eblOrigin.x, eblOrigin.y + 5);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (state.settings?.ebl2 === "ON") {
      const trueDeg = isRelBrg ? normalizeDeg360((state.ebl2Deg ?? 45) + hdgDeg) : (state.ebl2Deg ?? 45);
      const rad = (normalizeDeg360(trueDeg - topRef) - 90) * DEG_TO_RAD;
      ctx.save();
      ctx.strokeStyle = palette.ebl2Color;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([10, 4, 2, 4]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + radius * 2 * Math.cos(rad), oy + radius * 2 * Math.sin(rad));
      ctx.stroke();
      ctx.restore();
    }

    if (state.settings?.vrm1 === "ON") {
      const r1 = ((state.vrm1Nm ?? 0) / rangeNm) * radius;
      if (r1 > 0.5) {
        ctx.save();
        ctx.strokeStyle = palette.vrm1Color;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(ox, oy, r1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (state.settings?.vrm2 === "ON") {
      const r2 = ((state.vrm2Nm ?? 0) / rangeNm) * radius;
      if (r2 > 0.5) {
        ctx.save();
        ctx.strokeStyle = palette.vrm2Color;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([10, 4, 2, 4]);
        ctx.beginPath();
        ctx.arc(ox, oy, r2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Vector projection helper (True or Relative)
  const vectorTimeHours = (state.settings?.ataVectorTimeMin ?? 6) / 60;
  const isRelVec = state.effectiveModes?.vectorMode === "R";
  const ownVxE = ownSogKn * vectorTimeHours * Math.sin(ownCogDeg * DEG_TO_RAD);
  const ownVyN = ownSogKn * vectorTimeHours * Math.cos(ownCogDeg * DEG_TO_RAD);

  const projectVectorEndpoint = (px, py, cogDeg, sogKn) => {
    const tVxE = sogKn * vectorTimeHours * Math.sin(cogDeg * DEG_TO_RAD);
    const tVyN = sogKn * vectorTimeHours * Math.cos(cogDeg * DEG_TO_RAD);
    const dxNm = isRelVec ? (tVxE - ownVxE) : tVxE;
    const dyNm = isRelVec ? (tVyN - ownVyN) : tVyN;
    const distNm = Math.hypot(dxNm, dyNm);
    if (distNm < 1e-4) return null;
    const brgTrue = normalizeDeg360(Math.atan2(dxNm, dyNm) * RAD_TO_DEG);
    const scRad = normalizeDeg360(brgTrue - topRef) * DEG_TO_RAD;
    const lenPx = Math.min(radius * 0.9, (distNm / rangeNm) * radius);
    return {
      x: px + lenPx * Math.sin(scRad),
      y: py - lenPx * Math.cos(scRad),
    };
  };

  // 7. IEC AIS Triangles (up to 100 targets)
  if (aisProjection?.enabled && Array.isArray(aisProjection.targets)) {
    for (let i = 0; i < aisProjection.targets.length; i++) {
      const t = aisProjection.targets[i];
      if (!Number.isFinite(t.rangeNm) || t.rangeNm > rangeNm * 1.65) continue;
      const pos = polarToCanvas(ox, oy, radius, rangeNm, t.rangeNm, t.bearingDeg, topRef);
      const heading = Number.isFinite(t.hdgDeg) ? t.hdgDeg : t.cogDeg;
      const scRad = normalizeDeg360(heading - topRef) * DEG_TO_RAD;
      const isDanger = t.status === "dangerous";
      const isActive = t.status === "active" || isDanger;
      const col = isDanger ? (flashOn ? palette.dangerColor : "#ff9b9b") : palette.aisColor;
      const sz = isActive ? 7.5 : 5.5;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(scRad);
      ctx.strokeStyle = col;
      ctx.lineWidth = isDanger ? 1.8 : 1.25;
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.lineTo(sz * 0.62, sz * 0.72);
      ctx.lineTo(-sz * 0.62, sz * 0.72);
      ctx.closePath();
      ctx.stroke();

      if (isActive) {
        // Heading line + optional ROT flag
        ctx.beginPath();
        ctx.moveTo(0, -sz);
        ctx.lineTo(0, -sz - 10);
        if (Math.abs(t.rotDegPerMin ?? 0) >= 1) {
          const side = t.rotDegPerMin > 0 ? 5 : -5;
          ctx.lineTo(side, -sz - 10);
        }
        ctx.stroke();
      }
      ctx.restore();

      if (isActive && t.sogKn > 0.2) {
        const end = projectVectorEndpoint(pos.x, pos.y, t.cogDeg, t.sogKn);
        if (end) {
          ctx.save();
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.1;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (isDanger && flashOn) {
        ctx.strokeStyle = palette.dangerColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (t.selected) {
        ctx.save();
        ctx.strokeStyle = palette.textAccent;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(pos.x - 10, pos.y - 10, 20, 20);
        ctx.restore();
      }
    }
  }

  // 8. IEC ATA (ARPA) Tracked Targets (T01..T50)
  if (Array.isArray(state.ata?.targets) && state.ata.targets.length > 0) {
    const showPast = state.settings?.ataPastPos !== "OFF";
    for (let i = 0; i < state.ata.targets.length; i++) {
      const t = state.ata.targets[i];
      if (!Number.isFinite(t.rangeNm) || t.rangeNm > rangeNm * 1.65) continue;
      const pos = polarToCanvas(ox, oy, radius, rangeNm, t.rangeNm, t.bearingDeg, topRef);
      const col = t.dangerous ? (flashOn ? palette.dangerColor : "#ff9b9b") : palette.ataColor;

      // Past position dots
      if (showPast && Array.isArray(t.pastPositions) && t.pastPositions.length > 1) {
        ctx.fillStyle = col;
        for (let pIdx = 0; pIdx < t.pastPositions.length - 1; pIdx++) {
          const pp = t.pastPositions[pIdx];
          let ppPolar = null;
          if (state.effectiveModes?.trailMode === "T" && Number.isFinite(pp.lat) && Number.isFinite(pp.lon)) {
            ppPolar = geoToPolarFromOwnship(state.ownshipSnapshot, pp.lat, pp.lon);
          }
          if (!ppPolar) ppPolar = { rangeNm: pp.rangeNm, bearingDeg: pp.bearingDeg };
          const pPos = polarToCanvas(ox, oy, radius, rangeNm, ppPolar.rangeNm, ppPolar.bearingDeg, topRef);
          ctx.beginPath();
          ctx.arc(pPos.x, pPos.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Symbol circle (acquiring dashed / tracking solid / lost crossed diamond)
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = t.dangerous ? 2 : 1.5;
      if (t.status === "acquiring") {
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else if (t.status === "lost") {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - 7);
        ctx.lineTo(pos.x + 7, pos.y);
        ctx.lineTo(pos.x, pos.y + 7);
        ctx.lineTo(pos.x - 7, pos.y);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Velocity vector
      if (t.status === "tracking" && t.sogKn > 0.1) {
        const end = projectVectorEndpoint(pos.x, pos.y, t.cogDeg, t.sogKn);
        if (end) {
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
      }

      // Flashing CPA/TCPA danger halo
      if (t.dangerous && flashOn) {
        ctx.strokeStyle = palette.dangerColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Target ID tag (T01..T50)
      ctx.font = `700 9.5px ${FONT_MONO}`;
      ctx.fillStyle = col;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(t.targetId, pos.x + 9, pos.y - 6);

      if (t.targetId === state.ata.selectedTargetId) {
        ctx.strokeStyle = palette.textAccent;
        ctx.lineWidth = 1.1;
        ctx.strokeRect(pos.x - 9, pos.y - 9, 18, 18);
      }
    }
  }

  // 9. 2-Point Measurement Line & Crosshair Cursor (Main scope)
  if (!opts.isSubScope) {
    if (state.measureAnchor) {
      const ax = cx + state.measureAnchor.xFrac * radius;
      const ay = cy + state.measureAnchor.yFrac * radius;
      const bx = state.measureResult
        ? cx + state.measureResult.toXFrac * radius
        : cx + (state.cursor?.xFrac ?? 0) * radius;
      const by = state.measureResult
        ? cy + state.measureResult.toYFrac * radius
        : cy + (state.cursor?.yFrac ?? 0) * radius;

      ctx.save();
      ctx.strokeStyle = palette.textAccent;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ax, ay - 5);
      ctx.lineTo(ax + 5, ay);
      ctx.lineTo(ax, ay + 5);
      ctx.lineTo(ax - 5, ay);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    if (state.cursor) {
      const curX = cx + state.cursor.xFrac * radius;
      const curY = cy + state.cursor.yFrac * radius;
      const shape = state.settings?.cursorShape ?? "CROSS";
      ctx.save();
      ctx.strokeStyle = palette.cursorColor;
      ctx.lineWidth = 1.1;
      if (shape === "FULL") {
        ctx.beginPath();
        ctx.moveTo(cx - radius, curY);
        ctx.lineTo(cx + radius, curY);
        ctx.moveTo(curX, cy - radius);
        ctx.lineTo(curX, cy + radius);
        ctx.stroke();
      } else {
        const arm = shape === "SMALL" ? 7 : 13;
        ctx.beginPath();
        ctx.moveTo(curX - arm, curY);
        ctx.lineTo(curX - 2, curY);
        ctx.moveTo(curX + 2, curY);
        ctx.lineTo(curX + arm, curY);
        ctx.moveTo(curX, curY - arm);
        ctx.lineTo(curX, curY - 2);
        ctx.moveTo(curX, curY + 2);
        ctx.lineTo(curX, curY + arm);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawCornerTelemetry(ctx, state, aisProjection, lang, palette) {
  const unit = state.settings?.rangeUnit ?? "NM";
  const mainRangeDef = MDC2060_RANGES[state.rangeIndex] ?? MDC2060_RANGES[10];
  const subRangeDef = MDC2060_RANGES[state.subRangeIndex] ?? MDC2060_RANGES[7];
  const screenMode = state.settings?.screenMode ?? "PPI";
  const own = state.ownshipSnapshot ?? {};
  const faults = state.sensorFaults ?? {};
  const eff = state.effectiveModes ?? {};

  ctx.save();
  ctx.font = `700 10px ${FONT_MONO}`;
  ctx.textBaseline = "top";

  // Top-Left: Range / Ring / Presentation / Motion / Signal flags
  ctx.textAlign = "left";
  ctx.fillStyle = palette.textAccent;
  ctx.fillText(
    `${tMdc2060(lang, "lcd.rng")} ${formatRangeValue(mainRangeDef.nm, unit)}`,
    8,
    6,
  );
  ctx.fillStyle = palette.textSecondary;
  ctx.fillText(
    `${tMdc2060(lang, "lcd.ring")} ${formatRangeValue(mainRangeDef.ringNm, unit)}`,
    8,
    19,
  );
  ctx.fillStyle = palette.textPrimary;
  ctx.fillText(
    `${eff.presentationMode ?? "H-UP"} ${eff.motionMode ?? "RM"} ${eff.pw ?? "M2"}`,
    8,
    32,
  );

  const flags = [];
  if (state.settings?.ir && state.settings.ir !== "OFF") flags.push(`IR:${state.settings.ir}`);
  if (state.settings?.exp && state.settings.exp !== "OFF") flags.push(`EXP:${state.settings.exp}`);
  if (state.settings?.process && state.settings.process !== "OFF") flags.push(state.settings.process);
  if (state.settings?.offCenter === "ON") flags.push("OFFC");
  if (state.hlSuppressed) flags.push("HL OFF");
  if (flags.length > 0) {
    ctx.fillStyle = palette.textAccent;
    ctx.fillText(flags.join(" "), 8, 45);
  }

  // Top-Right: Ownship HDG / COG / SOG / Trail / Vector
  ctx.textAlign = "right";
  ctx.fillStyle = faults.hdgNoSignal ? palette.dangerColor : palette.textPrimary;
  const hdgStr = faults.hdgNoSignal ? "---.-°" : formatDeg3(own.hdgDeg);
  ctx.fillText(`HDG ${hdgStr}`, LCD_WIDTH - 8, 6);

  ctx.fillStyle = faults.gpsNoSignal ? palette.dangerColor : palette.textSecondary;
  const cogStr = faults.gpsNoSignal ? "---.-°" : formatDeg3(own.cogDeg);
  const sogStr = (faults.gpsNoSignal && faults.spdNoSignal) ? "--.-kn" : `${(own.sogKn ?? 0).toFixed(1)}kn`;
  ctx.fillText(`COG ${cogStr}`, LCD_WIDTH - 8, 19);
  ctx.fillText(`SOG ${sogStr}`, LCD_WIDTH - 8, 32);

  ctx.fillStyle = palette.textAccent;
  const trailLabel = state.settings?.trailTime === "OFF"
    ? "TRL OFF"
    : `TRL ${eff.trailMode ?? "R"} ${state.settings?.trailTime ?? "1m"}`;
  ctx.fillText(`${trailLabel} V:${eff.vectorMode ?? "T"}${state.settings?.ataVectorTimeMin ?? 6}m`, LCD_WIDTH - 8, 45);

  if (screenMode === "PPI/PPI") {
    // Divider and sub-scope header at y = 314..328
    ctx.strokeStyle = palette.menuBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(6, 319);
    ctx.lineTo(LCD_WIDTH - 6, 319);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = palette.textAccent;
    ctx.fillText(`SUB ${formatRangeValue(subRangeDef.nm, unit)} / R ${formatRangeValue(subRangeDef.ringNm, unit)}`, 8, 323, 240);
    ctx.textAlign = "right";
    ctx.fillStyle = palette.textSecondary;
    ctx.fillText(`SUB GAIN ${state.settings?.subGain >= 0 ? "+" : ""}${state.settings?.subGain ?? 0}`, LCD_WIDTH - 8, 323, 180);

    // Compact EBL1/VRM1, Cursor BRG/RNG, 2PT & ATA/AIS readouts beside Sub scope
    const brgSuffix = eff.brgMode ?? "T";
    const ataCnt = state.ata?.targets?.length ?? 0;
    const aisCnt = aisProjection?.enabled ? (aisProjection.targets?.length ?? 0) : 0;

    ctx.textAlign = "left";
    if (state.settings?.ebl1 === "ON") {
      ctx.fillStyle = palette.ebl1Color;
      ctx.fillText(`EBL1 ${formatDeg3(state.ebl1Deg)}${brgSuffix}`, 8, 578, 136);
    } else if (state.settings?.ebl2 === "ON") {
      ctx.fillStyle = palette.ebl2Color;
      ctx.fillText(`EBL2 ${formatDeg3(state.ebl2Deg)}${brgSuffix}`, 8, 578, 136);
    } else {
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText("EBL1 OFF", 8, 578, 136);
    }

    if (state.settings?.vrm1 === "ON") {
      ctx.fillStyle = palette.vrm1Color;
      ctx.fillText(`VRM1 ${formatRangeValue(state.vrm1Nm, unit)}`, 8, 591, 152);
    } else if (state.settings?.vrm2 === "ON") {
      ctx.fillStyle = palette.vrm2Color;
      ctx.fillText(`VRM2 ${formatRangeValue(state.vrm2Nm, unit)}`, 8, 591, 152);
    } else {
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText("VRM1 OFF", 8, 591, 152);
    }

    const cur = state.cursor ?? {};
    const curBrg = brgSuffix === "R" ? normalizeDeg360(cur.relBearingDeg ?? 0) : (cur.bearingDeg ?? 0);
    ctx.textAlign = "right";
    ctx.fillStyle = palette.ataColor;
    ctx.fillText(`ATA:${ataCnt} AIS:${aisCnt}`, LCD_WIDTH - 8, 565, 122);
    ctx.fillStyle = palette.cursorColor;
    ctx.fillText(
      `CSR ${formatDeg3(curBrg)}${brgSuffix} ${formatRangeValue(cur.rangeNm ?? 0, unit)}`,
      LCD_WIDTH - 8,
      578,
      138,
    );
    if (state.measureResult) {
      ctx.fillStyle = palette.textAccent;
      ctx.fillText(
        `2PT ${formatDeg3(state.measureResult.bearingDeg)} ${formatRangeValue(state.measureResult.rangeNm, unit)}`,
        LCD_WIDTH - 8,
        591,
        154,
      );
    } else if (state.measureAnchor) {
      ctx.fillStyle = palette.textAccent;
      ctx.fillText("2PT ANCHOR", LCD_WIDTH - 8, 591, 154);
    }
  }

  if (screenMode === "PPI/NAV") {
    // Lower-Left & Lower-Right flanks above NAV box (y = 336..374, clear of circle & NAV y=378)
    const brgSuffix = eff.brgMode ?? "T";
    const ataCnt = state.ata?.targets?.length ?? 0;
    const aisCnt = aisProjection?.enabled ? (aisProjection.targets?.length ?? 0) : 0;
    const cur = state.cursor ?? {};
    const curBrg = brgSuffix === "R" ? normalizeDeg360(cur.relBearingDeg ?? 0) : (cur.bearingDeg ?? 0);

    ctx.font = `700 9.5px ${FONT_MONO}`;
    ctx.textAlign = "left";
    if (state.settings?.ebl1 === "ON") {
      ctx.fillStyle = palette.ebl1Color;
      const flt = state.settings?.ebl1Float === "ON" ? " FLT" : "";
      ctx.fillText(`EBL1 ${formatDeg3(state.ebl1Deg)}${brgSuffix}${flt}`, 8, 336, 118);
    } else if (state.settings?.ebl2 === "ON") {
      ctx.fillStyle = palette.ebl2Color;
      ctx.fillText(`EBL2 ${formatDeg3(state.ebl2Deg)}${brgSuffix}`, 8, 336, 118);
    } else {
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText("EBL1 OFF", 8, 336, 118);
    }

    if (state.settings?.vrm1 === "ON") {
      ctx.fillStyle = palette.vrm1Color;
      ctx.fillText(`VRM1 ${formatRangeValue(state.vrm1Nm, unit)}`, 8, 349, 136);
    } else if (state.settings?.vrm2 === "ON") {
      ctx.fillStyle = palette.vrm2Color;
      ctx.fillText(`VRM2 ${formatRangeValue(state.vrm2Nm, unit)}`, 8, 349, 136);
    } else {
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText("VRM1 OFF", 8, 349, 136);
    }

    const navAuxText = state.guardZone?.mode && state.guardZone.mode !== "OFF"
      ? `GZ ${state.guardZone.mode} ${formatRangeValue(state.guardZone.innerNm, unit, { includeUnit: false })}-${formatRangeValue(state.guardZone.outerNm, unit)}`
      : (state.settings?.piLine && state.settings.piLine !== "OFF" ? `PI ${state.settings.piLine}` : trailLabel);
    ctx.fillStyle = state.guardZone?.alarmActive ? palette.dangerColor : palette.textSecondary;
    ctx.fillText(navAuxText, 8, 362, 160);

    ctx.textAlign = "right";
    ctx.fillStyle = palette.ataColor;
    ctx.fillText(`ATA:${ataCnt} AIS:${aisCnt}`, LCD_WIDTH - 8, 336, 118);

    ctx.fillStyle = palette.cursorColor;
    ctx.fillText(
      `CSR ${formatDeg3(curBrg)}${brgSuffix} ${formatRangeValue(cur.rangeNm ?? 0, unit)}`,
      LCD_WIDTH - 8,
      349,
      138,
    );

    if (state.measureResult) {
      ctx.fillStyle = palette.textAccent;
      ctx.fillText(
        `2PT ${formatDeg3(state.measureResult.bearingDeg)} ${formatRangeValue(state.measureResult.rangeNm, unit)}`,
        LCD_WIDTH - 8,
        362,
        160,
      );
    } else if (state.measureAnchor) {
      ctx.fillStyle = palette.textAccent;
      ctx.fillText("2PT ANCHOR", LCD_WIDTH - 8, 362, 160);
    } else {
      const curGeo = formatLatLon(cur.lat, cur.lon);
      ctx.fillStyle = faults.llNoSignal ? palette.dangerColor : palette.textSecondary;
      ctx.fillText(curGeo.latStr, LCD_WIDTH - 8, 362, 160);
    }
  }

  // Bottom-Left & Bottom-Right (full PPI mode only, plenty of margin below circle y=510)
  if (screenMode === "PPI") {
    const brgSuffix = eff.brgMode ?? "T";
    ctx.textAlign = "left";
    ctx.fillStyle = state.settings?.ebl1 === "ON" ? palette.ebl1Color : palette.textSecondary;
    const e1Val = state.settings?.ebl1 === "ON"
      ? `${formatDeg3(state.ebl1Deg)}${brgSuffix}${state.settings?.ebl1Float === "ON" ? " FLT" : ""}`
      : "OFF";
    ctx.fillText(`EBL1 ${e1Val}`, 8, 514);

    ctx.fillStyle = state.settings?.vrm1 === "ON" ? palette.vrm1Color : palette.textSecondary;
    const v1Val = state.settings?.vrm1 === "ON" ? formatRangeValue(state.vrm1Nm, unit) : "OFF";
    ctx.fillText(`VRM1 ${v1Val}`, 8, 527);

    ctx.fillStyle = state.settings?.ebl2 === "ON" ? palette.ebl2Color : palette.textSecondary;
    const e2Val = state.settings?.ebl2 === "ON" ? `${formatDeg3(state.ebl2Deg)}${brgSuffix}` : "OFF";
    ctx.fillText(`EBL2 ${e2Val}`, 8, 540);

    ctx.fillStyle = state.settings?.vrm2 === "ON" ? palette.vrm2Color : palette.textSecondary;
    const v2Val = state.settings?.vrm2 === "ON" ? formatRangeValue(state.vrm2Nm, unit) : "OFF";
    ctx.fillText(`VRM2 ${v2Val}`, 8, 553);

    const gzText = state.guardZone?.mode && state.guardZone.mode !== "OFF"
      ? `GZ ${state.guardZone.mode} ${formatRangeValue(state.guardZone.innerNm, unit, { includeUnit: false })}-${formatRangeValue(state.guardZone.outerNm, unit)}`
      : `PI ${state.settings?.piLine ?? "OFF"}`;
    ctx.fillStyle = state.guardZone?.alarmActive ? palette.dangerColor : palette.textSecondary;
    ctx.fillText(gzText, 8, 566);

    // Bottom-Right: Cursor & Target Summary
    ctx.textAlign = "right";
    const cur = state.cursor ?? {};
    const curBrg = brgSuffix === "R" ? normalizeDeg360(cur.relBearingDeg ?? 0) : (cur.bearingDeg ?? 0);
    ctx.fillStyle = palette.cursorColor;
    ctx.fillText(`CSR ${formatDeg3(curBrg)}${brgSuffix} ${formatRangeValue(cur.rangeNm ?? 0, unit)}`, LCD_WIDTH - 8, 514);

    const curGeo = formatLatLon(cur.lat, cur.lon);
    ctx.fillStyle = faults.llNoSignal ? palette.dangerColor : palette.textSecondary;
    ctx.fillText(curGeo.latStr, LCD_WIDTH - 8, 527);
    ctx.fillText(curGeo.lonStr, LCD_WIDTH - 8, 540);

    if (state.measureResult) {
      ctx.fillStyle = palette.textAccent;
      ctx.fillText(
        `2PT ${formatDeg3(state.measureResult.bearingDeg)} ${formatRangeValue(state.measureResult.rangeNm, unit)}`,
        LCD_WIDTH - 8,
        553,
      );
    } else {
      const ataCnt = state.ata?.targets?.length ?? 0;
      const aisCnt = aisProjection?.enabled ? (aisProjection.targets?.length ?? 0) : 0;
      ctx.fillStyle = palette.ataColor;
      ctx.fillText(`ATA:${ataCnt}  AIS:${aisCnt}`, LCD_WIDTH - 8, 553);
    }

    // Selected ATA CPA/TCPA summary line
    const selAta = state.ata?.targets?.find(t => t.targetId === state.ata.selectedTargetId) ?? state.ata?.targets?.[0];
    if (selAta) {
      ctx.fillStyle = selAta.dangerous ? palette.dangerColor : palette.ataColor;
      ctx.fillText(
        `${selAta.targetId} CPA ${selAta.cpaNm.toFixed(2)} TCPA ${selAta.tcpaMin.toFixed(1)}m`,
        LCD_WIDTH - 8,
        566,
      );
    } else {
      const ownGeo = formatLatLon(own.lat, own.lon);
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(`OWN ${ownGeo.latStr}`, LCD_WIDTH - 8, 566);
    }
  }

  ctx.restore();
}

function drawNavPanel(ctx, navRect, state, lang, palette) {
  const { x, y, w, h } = navRect;
  const own = state.ownshipSnapshot ?? {};
  const faults = state.sensorFaults ?? {};

  ctx.save();
  ctx.fillStyle = palette.menuBg;
  ctx.strokeStyle = palette.menuBorder;
  ctx.lineWidth = 1.5;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  // Header
  ctx.fillStyle = palette.textAccent;
  ctx.font = `700 11px ${FONT_MONO}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(tMdc2060(lang, "lcd.navTitle"), x + 10, y + 7);
  ctx.textAlign = "right";
  ctx.fillStyle = palette.textSecondary;
  ctx.fillText("NMEA-0183 BUS", x + w - 10, y + 7);

  // Digital Compass Tape (y + 24 .. y + 60)
  const tapeX = x + 10;
  const tapeY = y + 25;
  const tapeW = w - 20;
  const tapeH = 34;
  ctx.fillStyle = palette.ppiFill;
  ctx.fillRect(tapeX, tapeY, tapeW, tapeH);
  ctx.strokeStyle = palette.ringColor;
  ctx.strokeRect(tapeX, tapeY, tapeW, tapeH);

  const centerHdg = faults.hdgNoSignal ? 0 : (own.hdgDeg ?? 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(tapeX + 1, tapeY + 1, tapeW - 2, tapeH - 2);
  ctx.clip();
  ctx.strokeStyle = palette.compassColor;
  ctx.fillStyle = palette.textPrimary;
  ctx.font = `700 9px ${FONT_MONO}`;
  ctx.textAlign = "center";
  const pxPerDeg = 4.5;
  const baseDeg = Math.floor(centerHdg / 5) * 5;
  for (let d = baseDeg - 55; d <= baseDeg + 55; d += 5) {
    const dx = (d - centerHdg) * pxPerDeg;
    const tx = tapeX + tapeW / 2 + dx;
    const major = ((d % 10) + 10) % 10 === 0;
    ctx.beginPath();
    ctx.moveTo(tx, tapeY + tapeH);
    ctx.lineTo(tx, tapeY + tapeH - (major ? 12 : 6));
    ctx.stroke();
    if (major && (((d % 30) + 30) % 30 === 0)) {
      ctx.fillText(String(normalizeDeg360(d)).padStart(3, "0"), tx, tapeY + 6);
    }
  }
  ctx.restore();

  // Center lubber needle on compass tape
  ctx.fillStyle = palette.textAccent;
  ctx.beginPath();
  ctx.moveTo(tapeX + tapeW / 2, tapeY + tapeH - 1);
  ctx.lineTo(tapeX + tapeW / 2 - 5, tapeY + tapeH - 9);
  ctx.lineTo(tapeX + tapeW / 2 + 5, tapeY + tapeH - 9);
  ctx.closePath();
  ctx.fill();

  // 2x3 Navigation Telemetry Grid
  const geo = formatLatLon(own.lat, own.lon);
  const cells = [
    {
      label: tMdc2060(lang, "lcd.hdg"),
      value: faults.hdgNoSignal ? "NO SIGNAL" : formatDeg3(own.hdgDeg),
      danger: faults.hdgNoSignal,
    },
    {
      label: tMdc2060(lang, "lcd.cog"),
      value: faults.gpsNoSignal ? "NO SIGNAL" : formatDeg3(own.cogDeg),
      danger: faults.gpsNoSignal,
    },
    {
      label: tMdc2060(lang, "lcd.sog"),
      value: (faults.gpsNoSignal && faults.spdNoSignal) ? "NO SIGNAL" : `${(own.sogKn ?? 0).toFixed(1)} kn`,
      danger: faults.gpsNoSignal && faults.spdNoSignal,
    },
    {
      label: "LAT / LON",
      value: faults.llNoSignal ? "L/L NO SIGNAL" : `${geo.latStr}`,
      sub: faults.llNoSignal ? "---°--.--' -" : geo.lonStr,
      danger: faults.llNoSignal,
    },
    {
      label: tMdc2060(lang, "lcd.depth"),
      value: Number.isFinite(own.depthM) ? `${own.depthM.toFixed(1)} m` : "--.- m",
      danger: false,
    },
    {
      label: tMdc2060(lang, "lcd.temp"),
      value: Number.isFinite(own.waterTempC) ? `${own.waterTempC.toFixed(1)} °C` : "--.- °C",
      danger: false,
    },
  ];

  const colW = (w - 28) / 3;
  const rowH = 68;
  for (let idx = 0; idx < cells.length; idx++) {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const cx0 = x + 10 + col * (colW + 4);
    const cy0 = y + 68 + row * (rowH + 6);
    const cell = cells[idx];

    ctx.fillStyle = palette.ppiFill;
    ctx.fillRect(cx0, cy0, colW, rowH);
    ctx.strokeStyle = cell.danger ? palette.dangerColor : palette.ringColor;
    ctx.strokeRect(cx0, cy0, colW, rowH);

    ctx.textAlign = "left";
    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 9.5px ${FONT_MONO}`;
    ctx.fillText(cell.label, cx0 + 7, cy0 + 6, colW - 14);

    ctx.fillStyle = cell.danger ? palette.dangerColor : palette.textPrimary;
    ctx.font = cell.sub ? `700 12px ${FONT_MONO}` : `700 15px ${FONT_MONO}`;
    ctx.fillText(cell.value, cx0 + 7, cy0 + 25, colW - 14);

    if (cell.sub) {
      ctx.fillStyle = cell.danger ? palette.dangerColor : palette.textAccent;
      ctx.font = `700 11.5px ${FONT_MONO}`;
      ctx.fillText(cell.sub, cx0 + 7, cy0 + 44, colW - 14);
    }
  }

  ctx.restore();
}

function drawBottomBars(ctx, state, lang, palette) {
  const yTop = state.settings?.screenMode === "PPI" ? 592 : 606;
  const h = LCD_HEIGHT - yTop;

  ctx.save();
  ctx.fillStyle = palette.menuBg;
  ctx.fillRect(0, yTop, LCD_WIDTH, h);
  ctx.strokeStyle = palette.menuBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, yTop + 0.5);
  ctx.lineTo(LCD_WIDTH, yTop + 0.5);
  ctx.stroke();

  const drawBar = (x, label, frac, valueText, fillColor) => {
    const barW = 78;
    const barY = yTop + 14;
    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 9px ${FONT_MONO}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${label} ${valueText}`, x, yTop + 3);

    ctx.fillStyle = palette.barTrack;
    ctx.fillRect(x, barY, barW, 8);
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, barY, Math.round(barW * Math.max(0, Math.min(1, frac))), 8);
  };

  drawBar(8, "GAIN", (state.gain ?? 0) / 100, String(Math.round(state.gain ?? 0)), palette.barFillGain);
  drawBar(98, "STC", (state.stc ?? 0) / 100, String(Math.round(state.stc ?? 0)), palette.barFillStc);
  const effFtc = state.effectiveModes?.ftc ?? state.settings?.ftc ?? 0;
  drawBar(188, "FTC", effFtc / 8, String(effFtc), palette.barFillFtc);

  // F1 & F2 softkey cues
  ctx.font = `700 9px ${FONT_MONO}`;
  ctx.textAlign = "left";
  ctx.fillStyle = palette.textSecondary;
  ctx.fillText(`F1:${localizeMdc2060Choice(state.settings?.f1Key ?? "EBL1_VRM1", lang)}`, 278, yTop + 4, 104);
  ctx.fillText(`F2:${localizeMdc2060Choice(state.settings?.f2Key ?? "ATA_ACQ", lang)}`, 278, yTop + 17, 104);

  // Operational state pill (TX / ST'BY / PREHEAT / SLEEP)
  const pillX = LCD_WIDTH - 92;
  const pillY = yTop + 5;
  const pillW = 84;
  const pillH = h - 10;
  let pillBg = "#274152";
  if (state.powerMode === "transmit") pillBg = "#146e3b";
  else if (state.powerMode === "standby" || state.powerMode === "preheat") pillBg = "#7a5314";
  else if (state.powerMode === "sleep") pillBg = "#1b4e66";

  ctx.fillStyle = pillBg;
  ctx.fillRect(pillX, pillY, pillW, pillH);
  ctx.strokeStyle = palette.menuBorder;
  ctx.strokeRect(pillX, pillY, pillW, pillH);

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 9.5px ${FONT_MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    localizeMdc2060PowerMode(state.powerMode, lang),
    pillX + pillW / 2,
    pillY + pillH / 2,
    pillW - 8,
  );

  ctx.restore();
}

function drawStatusBanners(ctx, state, lang, palette, nowMs) {
  const flashOn = Math.floor((nowMs ?? 0) / 400) % 2 === 0;
  const compactTop = state.settings?.screenMode !== "PPI";
  let bannerY = compactTop ? 4 : 56;
  const boxX = compactTop ? 124 : 96;
  const boxW = LCD_WIDTH - boxX * 2;
  const textMaxW = boxW - 12;

  // Active Alarm Banner (ATA CPA / AIS CPA / Guard Zone IN/OUT)
  if (state.alarms?.visualActive && Array.isArray(state.alarms.activeIds) && state.alarms.activeIds.length > 0) {
    const alarmKeyMap = {
      ATA_CPA_DANGER: "cpaDanger",
      AIS_CPA_DANGER: "aisCpaDanger",
      GUARD_ZONE_IN: "guardIn",
      GUARD_ZONE_OUT: "guardOut",
    };
    const primary = state.alarms.activeIds[0];
    const label = localizeMdc2060Alarm(alarmKeyMap[primary] ?? primary, lang);
    const boxH = compactTop ? 24 : 28;
    ctx.save();
    ctx.fillStyle = flashOn ? "rgba(184, 24, 34, 0.94)" : "rgba(96, 16, 22, 0.9)";
    ctx.fillRect(boxX, bannerY, boxW, boxH);
    ctx.strokeStyle = "#ff9ea3";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, bannerY, boxW, boxH);
    ctx.fillStyle = "#ffffff";
    ctx.font = compactTop ? `700 9.5px ${FONT_MONO}` : `700 10.5px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, LCD_WIDTH / 2, bannerY + (compactTop ? 8 : 10), textMaxW);
    ctx.fillStyle = "#ffd8c4";
    ctx.font = `700 8px ${FONT_MONO}`;
    ctx.fillText(
      state.alarms.audible ? tMdc2060(lang, "alarm.ackHint") : "ACKED (VISUAL ACTIVE)",
      LCD_WIDTH / 2,
      bannerY + (compactTop ? 18 : 21),
      textMaxW,
    );
    ctx.restore();
    bannerY += boxH + 4;
  }

  // Sensor fault banner (strictly bounded inside boxW - 12 across EN & VI)
  const faults = state.sensorFaults ?? {};
  const faultLabels = [];
  if (faults.hdgNoSignal) faultLabels.push(tMdc2060(lang, "fault.hdgNoSignal"));
  if (faults.llNoSignal) faultLabels.push(tMdc2060(lang, "fault.llNoSignal"));
  if (faults.spdNoSignal) faultLabels.push(tMdc2060(lang, "fault.spdNoSignal"));

  if (faultLabels.length > 0) {
    const faultText = faultLabels.join(" · ");
    ctx.save();
    ctx.font = `700 9.5px ${FONT_MONO}`;
    const measuredW = typeof ctx.measureText === "function" ? ctx.measureText(faultText).width : 0;
    const useTwoLines = faultLabels.length > 1 && measuredW > textMaxW * 1.35;
    const boxH = useTwoLines ? 24 : 18;
    ctx.fillStyle = "rgba(130, 32, 24, 0.92)";
    ctx.fillRect(boxX, bannerY, boxW, boxH);
    ctx.strokeStyle = palette.dangerColor;
    ctx.strokeRect(boxX, bannerY, boxW, boxH);
    ctx.fillStyle = "#fff4f2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (useTwoLines) {
      const splitAt = Math.ceil(faultLabels.length / 2);
      ctx.font = `700 8.5px ${FONT_MONO}`;
      ctx.fillText(faultLabels.slice(0, splitAt).join(" · "), LCD_WIDTH / 2, bannerY + 7, textMaxW);
      ctx.fillText(faultLabels.slice(splitAt).join(" · "), LCD_WIDTH / 2, bannerY + 17, textMaxW);
    } else {
      ctx.fillText(faultText, LCD_WIDTH / 2, bannerY + 9, textMaxW);
    }
    ctx.restore();
  }

  // Notice toast near bottom above bars (palette.menuBg guarantees high contrast on ALL 4 palettes incl. WHITE)
  if (state.notice) {
    const text = resolveNoticeText(state.notice, lang);
    if (text) {
      const toastY = state.settings?.screenMode === "PPI" ? 560 : 576;
      ctx.save();
      ctx.fillStyle = palette.menuBg;
      ctx.fillRect(96, toastY, LCD_WIDTH - 192, 21);
      ctx.strokeStyle = palette.textAccent;
      ctx.strokeRect(96, toastY, LCD_WIDTH - 192, 21);
      ctx.fillStyle = palette.textPrimary;
      ctx.font = `700 10px ${FONT_MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, LCD_WIDTH / 2, toastY + 10.5, LCD_WIDTH - 204);
      ctx.restore();
    }
  }
}

function drawOperationalStateCard(ctx, state, lang, palette) {
  if (state.overlay) return;

  if (state.powerMode === "preheat") {
    const total = state.trainingFixture?.fastPreheat
      ? MDC2060_RADAR_SPECS.preheatFastSec
      : MDC2060_RADAR_SPECS.preheatAuthenticSec;
    const rem = Math.max(0, state.preheatRemainingSec ?? 0);
    const pct = total > 0 ? Math.max(0, Math.min(1, (total - rem) / total)) : 1;

    ctx.save();
    ctx.fillStyle = palette.menuBg;
    ctx.fillRect(76, 226, 328, 128);
    ctx.strokeStyle = palette.textAccent;
    ctx.lineWidth = 2;
    ctx.strokeRect(76, 226, 328, 128);

    ctx.fillStyle = palette.textAccent;
    ctx.font = `700 13px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(tMdc2060(lang, "power.preheatWait"), LCD_WIDTH / 2, 242, 312);

    ctx.fillStyle = palette.textPrimary;
    ctx.font = `700 32px ${FONT_MONO}`;
    ctx.fillText(formatMmSs(rem), LCD_WIDTH / 2, 266, 312);

    ctx.fillStyle = palette.barTrack;
    ctx.fillRect(108, 314, 264, 14);
    ctx.fillStyle = palette.barFillStc;
    ctx.fillRect(108, 314, Math.round(264 * pct), 14);
    ctx.strokeStyle = palette.menuBorder;
    ctx.strokeRect(108, 314, 264, 14);

    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 9.5px ${FONT_MONO}`;
    ctx.fillText(
      state.trainingFixture?.fastPreheat ? "FAST PREHEAT FIXTURE (5s)" : "MAGNETRON WARM-UP (120s)",
      LCD_WIDTH / 2,
      336,
      312,
    );
    ctx.restore();
    return;
  }

  if (state.powerMode === "standby") {
    ctx.save();
    ctx.fillStyle = palette.menuBg;
    ctx.fillRect(114, 248, 252, 86);
    ctx.strokeStyle = palette.barFillStc;
    ctx.lineWidth = 2;
    ctx.strokeRect(114, 248, 252, 86);

    ctx.fillStyle = palette.barFillStc;
    ctx.font = `700 28px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tMdc2060(lang, "power.standby"), LCD_WIDTH / 2, 280, 236);

    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 10px ${FONT_MONO}`;
    ctx.fillText("PRESS STBY / TX TO TRANSMIT", LCD_WIDTH / 2, 314, 236);
    ctx.restore();
    return;
  }

  if (state.powerMode === "sleep") {
    const phase = state.sleepState?.phase ?? "resting";
    const rem = state.sleepState?.remainingSec ?? 0;
    if (phase === "resting") {
      ctx.save();
      ctx.fillStyle = palette.menuBg;
      ctx.fillRect(96, 246, 288, 92);
      ctx.strokeStyle = palette.textAccent;
      ctx.lineWidth = 2;
      ctx.strokeRect(96, 246, 288, 92);

      ctx.fillStyle = palette.textAccent;
      ctx.font = `700 15px ${FONT_MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tMdc2060(lang, "power.sleepRest"), LCD_WIDTH / 2, 272, 272);

      ctx.fillStyle = palette.textPrimary;
      ctx.font = `700 24px ${FONT_MONO}`;
      ctx.fillText(formatMmSs(rem), LCD_WIDTH / 2, 302, 272);

      ctx.fillStyle = palette.textSecondary;
      ctx.font = `700 9.5px ${FONT_MONO}`;
      ctx.fillText("PRESS ANY KEY TO WAKE", LCD_WIDTH / 2, 326, 272);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = "rgba(18, 66, 88, 0.9)";
      ctx.fillRect(142, 60, 196, 20);
      ctx.strokeStyle = palette.textAccent;
      ctx.strokeRect(142, 60, 196, 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 10px ${FONT_MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${tMdc2060(lang, "power.sleepTx")} ${formatMmSs(rem)}`, LCD_WIDTH / 2, 70, 184);
      ctx.restore();
    }
  }
}

function formatMenuItemValue(item, rawVal, state, lang) {
  if (item.type === "action") return "▶";
  if (item.type === "readonly") {
    if (item.key === "txHours") {
      return `${(state.txHours ?? 0).toFixed(2)} h`;
    }
    return String(rawVal ?? "--");
  }
  if (item.type === "choice") {
    return localizeMdc2060Choice(rawVal, lang);
  }
  if (item.unit === "NM") {
    return formatRangeValue(Number(rawVal), state.settings?.rangeUnit ?? "NM");
  }
  if (item.unit === "deg") return `${Number(rawVal).toFixed(item.type === "float" ? 1 : 0)}°`;
  if (item.unit === "min") return `${rawVal}m`;
  return String(rawVal);
}

function drawOverlayModal(ctx, state, lang, palette) {
  const ov = state.overlay;
  if (!ov) return;

  if (ov.kind === "lcd-test") {
    const pattern = ov.patternIndex ?? 0;
    ctx.save();
    if (pattern === 0) {
      // 8-level echo LUT vertical color bars
      const bars = palette.echoLutHex;
      const bw = LCD_WIDTH / bars.length;
      for (let i = 0; i < bars.length; i++) {
        ctx.fillStyle = bars[i];
        ctx.fillRect(i * bw, 0, Math.ceil(bw), LCD_HEIGHT);
      }
    } else if (pattern === 1) {
      // Fine registration grid + concentric geometry check circles
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
      ctx.strokeStyle = palette.compassColor;
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= LCD_WIDTH; gx += 30) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, LCD_HEIGHT); ctx.stroke();
      }
      for (let gy = 0; gy <= LCD_HEIGHT; gy += 30) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(LCD_WIDTH, gy); ctx.stroke();
      }
      ctx.strokeStyle = palette.textAccent;
      for (const r of [60, 120, 180, 210]) {
        ctx.beginPath(); ctx.arc(240, 300, r, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (pattern === 2) {
      // Grayscale step wedge
      for (let i = 0; i < 8; i++) {
        const g = Math.round((i / 7) * 255);
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(0, i * (LCD_HEIGHT / 8), LCD_WIDTH, LCD_HEIGHT / 8 + 1);
      }
    } else {
      // Solid purity check with contrast frame
      ctx.fillStyle = palette.ppiFill;
      ctx.fillRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
      ctx.strokeStyle = palette.textAccent;
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, LCD_WIDTH - 20, LCD_HEIGHT - 20);
    }

    ctx.fillStyle = "rgba(8, 18, 30, 0.86)";
    ctx.fillRect(72, 24, LCD_WIDTH - 144, 48);
    ctx.strokeStyle = palette.textAccent;
    ctx.strokeRect(72, 24, LCD_WIDTH - 144, 48);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 12px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${tMdc2060(lang, "lcd.lcdTestTitle")} (${pattern + 1}/4)`, LCD_WIDTH / 2, 41);
    ctx.fillStyle = "#a8deed";
    ctx.font = `700 9.5px ${FONT_MONO}`;
    ctx.fillText("ENT / PAD: NEXT PATTERN · MENU: EXIT", LCD_WIDTH / 2, 58);
    ctx.restore();
    return;
  }

  if (ov.kind === "power-hold") {
    const pct = Math.max(0, Math.min(1, (ov.elapsedMs ?? 0) / MDC2060_RADAR_SPECS.holdThresholdMs.power));
    const remSec = Math.max(0, (ov.remainingMs ?? 0) / 1000).toFixed(1);
    ctx.save();
    ctx.fillStyle = "rgba(6, 12, 20, 0.94)";
    ctx.fillRect(80, 232, 320, 122);
    ctx.strokeStyle = palette.dangerColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 232, 320, 122);

    ctx.fillStyle = "#ff858c";
    ctx.font = `700 14px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("POWER OFF HOLD", LCD_WIDTH / 2, 248);

    ctx.fillStyle = "#ffffff";
    ctx.font = `700 22px ${FONT_MONO}`;
    ctx.fillText(`${remSec} s`, LCD_WIDTH / 2, 274);

    ctx.fillStyle = palette.barTrack;
    ctx.fillRect(112, 310, 256, 14);
    ctx.fillStyle = palette.dangerColor;
    ctx.fillRect(112, 310, Math.round(256 * pct), 14);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(112, 310, 256, 14);

    ctx.fillStyle = "#c8d8e2";
    ctx.font = `700 9.5px ${FONT_MONO}`;
    ctx.fillText("KEEP HOLDING >3s TO SHUT DOWN", LCD_WIDTH / 2, 333);
    ctx.restore();
    return;
  }

  if (ov.kind === "brill") {
    ctx.save();
    ctx.fillStyle = palette.menuBg;
    ctx.fillRect(68, 204, 344, 168);
    ctx.strokeStyle = palette.menuBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(68, 204, 344, 168);

    ctx.fillStyle = palette.menuHighlight;
    ctx.fillRect(68, 204, 344, 28);
    ctx.fillStyle = palette.textPrimary;
    ctx.font = `700 12px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tMdc2060(lang, "lcd.brill"), LCD_WIDTH / 2, 218);

    const drawBrillRow = (y, label, val, maxVal, active) => {
      if (active) {
        ctx.fillStyle = palette.menuHighlight;
        ctx.fillRect(80, y - 4, 320, 42);
      }
      ctx.fillStyle = palette.textPrimary;
      ctx.font = `700 11px ${FONT_MONO}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(label, 90, y);
      ctx.textAlign = "right";
      ctx.fillText(`${val} / ${maxVal}`, 390, y);

      ctx.fillStyle = palette.barTrack;
      ctx.fillRect(90, y + 18, 300, 12);
      ctx.fillStyle = active ? palette.textAccent : palette.barFillGain;
      ctx.fillRect(90, y + 18, Math.round(300 * (val / maxVal)), 12);
    };

    drawBrillRow(246, "LCD BRILL", ov.lcdBrightness ?? 8, 10, ov.activeField === "lcd");
    drawBrillRow(298, "PANEL BACKLIGHT", ov.panelBrightness ?? 7, 10, ov.activeField === "panel");

    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 9.5px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.fillText("▲▼: FIELD · ◀▶: LEVEL · ENT/POWER: OK", LCD_WIDTH / 2, 354);
    ctx.restore();
    return;
  }

  if (ov.kind === "menu" || ov.kind === "system-menu") {
    const tree = ov.kind === "system-menu" ? MDC2060_SYSTEM_MENU_TREE : MDC2060_MAIN_MENU_TREE;
    const gIdx = Math.max(0, Math.min(tree.length - 1, ov.groupIndex ?? 0));
    const group = tree[gIdx];
    const items = group?.items ?? [];
    const iIdx = Math.max(0, Math.min(items.length - 1, ov.itemIndex ?? 0));

    const bx = 20;
    const by = 68;
    const bw = 440;
    const bh = 446;
    const leftW = 126;

    ctx.save();
    ctx.fillStyle = palette.menuBg;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = palette.menuBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    // Header
    ctx.fillStyle = palette.menuHighlight;
    ctx.fillRect(bx, by, bw, 30);
    ctx.fillStyle = palette.textPrimary;
    ctx.font = `700 12.5px ${FONT_MONO}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      tMdc2060(lang, ov.kind === "system-menu" ? "lcd.systemMenuTitle" : "lcd.menuTitle"),
      bx + 12,
      by + 15,
      240,
    );
    ctx.textAlign = "right";
    ctx.fillStyle = palette.textAccent;
    ctx.fillText(localizeMdc2060MenuGroup(group.id, lang), bx + bw - 12, by + 15, 170);

    // Left column: Menu groups
    ctx.strokeStyle = palette.menuBorder;
    ctx.beginPath();
    ctx.moveTo(bx + leftW, by + 30);
    ctx.lineTo(bx + leftW, by + bh - 28);
    ctx.stroke();

    const groupRowH = 34;
    for (let gi = 0; gi < tree.length; gi++) {
      const gy = by + 36 + gi * groupRowH;
      const selected = gi === gIdx;
      if (selected) {
        ctx.fillStyle = palette.menuHighlight;
        ctx.fillRect(bx + 4, gy, leftW - 8, groupRowH - 4);
      }
      ctx.fillStyle = selected ? palette.textAccent : palette.textSecondary;
      ctx.font = `700 10.5px ${FONT_MONO}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(localizeMdc2060MenuGroup(tree[gi].id, lang), bx + 11, gy + (groupRowH - 4) / 2, leftW - 20);
    }

    // Right column: Items in selected group
    const itemX = bx + leftW + 8;
    const itemW = bw - leftW - 16;
    const itemRowH = 34;
    for (let ii = 0; ii < items.length; ii++) {
      const item = items[ii];
      const iy = by + 36 + ii * itemRowH;
      const selected = ii === iIdx;
      if (selected) {
        ctx.fillStyle = palette.menuHighlight;
        ctx.fillRect(itemX, iy, itemW, itemRowH - 4);
        ctx.strokeStyle = ov.editing ? palette.textAccent : palette.menuBorder;
        ctx.strokeRect(itemX, iy, itemW, itemRowH - 4);
      }

      ctx.fillStyle = selected ? palette.textPrimary : palette.textSecondary;
      ctx.font = `700 10.5px ${FONT_SANS}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(localizeMdc2060MenuItem(item.key, lang, item.label), itemX + 8, iy + (itemRowH - 4) / 2, 148);

      const valRaw = (selected && ov.editing) ? ov.draftValue : state.settings?.[item.key];
      const valText = formatMenuItemValue(item, valRaw, state, lang);
      ctx.textAlign = "right";
      ctx.font = `700 10.5px ${FONT_MONO}`;
      ctx.fillStyle = (selected && ov.editing) ? palette.textAccent : palette.textPrimary;
      ctx.fillText(
        (selected && ov.editing) ? `◀ ${valText} ▶` : valText,
        itemX + itemW - 8,
        iy + (itemRowH - 4) / 2,
        132,
      );
    }

    // Footer legend
    ctx.strokeStyle = palette.menuBorder;
    ctx.beginPath();
    ctx.moveTo(bx, by + bh - 28);
    ctx.lineTo(bx + bw, by + bh - 28);
    ctx.stroke();
    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 9.5px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const footerHint = ov.editing
      ? "◀▶ / ▲▼: CHANGE · ENT: SAVE · MENU: CANCEL"
      : `${tMdc2060(lang, "lcd.legendNav")} · ◀▶: GROUP · ${tMdc2060(lang, "lcd.legendEnter")} · ${tMdc2060(lang, "lcd.legendMenu")}`;
    ctx.fillText(footerHint, LCD_WIDTH / 2, by + bh - 14, bw - 16);
    ctx.restore();
    return;
  }

  if (ov.kind === "ais-info") {
    const t = state.ais?.selectedTarget;
    ctx.save();
    ctx.fillStyle = palette.menuBg;
    ctx.fillRect(44, 150, 392, 286);
    ctx.strokeStyle = t?.dangerous ? palette.dangerColor : palette.aisColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 150, 392, 286);

    ctx.fillStyle = palette.menuHighlight;
    ctx.fillRect(44, 150, 392, 28);
    ctx.fillStyle = palette.textPrimary;
    ctx.font = `700 12px ${FONT_MONO}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("AIS TARGET INFORMATION", 56, 164);
    ctx.textAlign = "right";
    ctx.fillStyle = t?.dangerous ? palette.dangerColor : palette.aisColor;
    ctx.fillText(t ? t.status.toUpperCase() : "NO DATA", 424, 164);

    const rows = t
      ? [
          ["NAME", t.name || "--"],
          ["MMSI / CALL", `${t.mmsi} / ${t.callSign || "--"}`],
          ["BRG / RNG", `${formatDeg3(t.bearingDeg)} / ${formatRangeValue(t.rangeNm, state.settings?.rangeUnit ?? "NM")}`],
          ["COG / SOG", `${formatDeg3(t.cogDeg)} / ${t.sogKn.toFixed(1)} kn`],
          ["HDG / ROT", `${formatDeg3(t.hdgDeg)} / ${(t.rotDegPerMin ?? 0).toFixed(1)}°/m`],
          ["CPA / TCPA", `${t.cpaNm.toFixed(2)} NM / ${t.tcpaMin.toFixed(1)} min`],
          ["BCR / BCT", t.bcrNm !== null ? `${t.bcrNm.toFixed(2)} NM / ${t.bctMin.toFixed(1)} min` : "-- / --"],
          ["DIM (L×B)", `${t.lengthM}m × ${t.beamM}m (TYPE ${t.shipType})`],
        ]
      : [["STATUS", tMdc2060(lang, "lcd.noData")]];

    ctx.font = `700 10.5px ${FONT_MONO}`;
    for (let r = 0; r < rows.length; r++) {
      const ry = 192 + r * 26;
      ctx.textAlign = "left";
      ctx.fillStyle = palette.textSecondary;
      ctx.fillText(rows[r][0], 58, ry, 120);
      ctx.textAlign = "right";
      ctx.fillStyle = palette.textPrimary;
      ctx.fillText(rows[r][1], 422, ry, 236);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 9.5px ${FONT_MONO}`;
    ctx.fillText("ENT / MENU: CLOSE", LCD_WIDTH / 2, 420);
    ctx.restore();
    return;
  }

  if (ov.kind === "confirm-all-reset") {
    ctx.save();
    ctx.fillStyle = palette.menuBg;
    ctx.fillRect(78, 224, 324, 134);
    ctx.strokeStyle = palette.barFillStc;
    ctx.lineWidth = 2;
    ctx.strokeRect(78, 224, 324, 134);

    ctx.fillStyle = palette.textAccent;
    ctx.font = `700 13px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("CONFIRM DEMO / ALL RESET", LCD_WIDTH / 2, 240);
    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 10.5px ${FONT_SANS}`;
    ctx.fillText("Reset all MDC-2060 settings to factory defaults?", LCD_WIDTH / 2, 266);

    const drawChoice = (x, label, active) => {
      ctx.fillStyle = active ? palette.menuHighlight : palette.ppiFill;
      ctx.fillRect(x, 296, 110, 32);
      ctx.strokeStyle = active ? palette.textAccent : palette.menuBorder;
      ctx.strokeRect(x, 296, 110, 32);
      ctx.fillStyle = active ? palette.textAccent : palette.textSecondary;
      ctx.font = `700 12px ${FONT_MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + 55, 312);
    };

    drawChoice(114, "NO", !ov.confirm);
    drawChoice(256, "YES", Boolean(ov.confirm));

    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 9.5px ${FONT_MONO}`;
    ctx.fillText("◀▶: SELECT · ENT: CONFIRM · MENU: CANCEL", LCD_WIDTH / 2, 344);
    ctx.restore();
    return;
  }

  if (ov.kind === "panel-test") {
    ctx.save();
    ctx.fillStyle = palette.menuBg;
    ctx.fillRect(58, 178, 364, 214);
    ctx.strokeStyle = palette.textAccent;
    ctx.lineWidth = 2;
    ctx.strokeRect(58, 178, 364, 214);

    ctx.fillStyle = palette.menuHighlight;
    ctx.fillRect(58, 178, 364, 30);
    ctx.fillStyle = palette.textPrimary;
    ctx.font = `700 12.5px ${FONT_MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tMdc2060(lang, "lcd.panelTestTitle"), LCD_WIDTH / 2, 193);

    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 11px ${FONT_MONO}`;
    ctx.fillText("LAST CONTROL DETECTED:", LCD_WIDTH / 2, 240);
    ctx.fillStyle = palette.textAccent;
    ctx.font = `700 22px ${FONT_MONO}`;
    ctx.fillText(ov.lastControl ? String(ov.lastControl).toUpperCase() : "READY", LCD_WIDTH / 2, 274);

    ctx.fillStyle = palette.textPrimary;
    ctx.font = `700 12px ${FONT_MONO}`;
    ctx.fillText(`KEY / ROTARY EVENTS: ${ov.pressCount ?? 0}`, LCD_WIDTH / 2, 316);

    ctx.fillStyle = palette.textSecondary;
    ctx.font = `700 10px ${FONT_MONO}`;
    ctx.fillText("PRESS ANY KEY TO VERIFY · MENU: EXIT", LCD_WIDTH / 2, 364);
    ctx.restore();
  }
}

/**
 * Create the 60 FPS dual-buffer Canvas 2D PPI renderer for KODEN MDC-2060.
 */
export function createMdc2060PpiRenderer(canvas) {
  if (!canvas || typeof canvas.getContext !== "function") {
    throw new TypeError("Valid HTMLCanvasElement required for createMdc2060PpiRenderer");
  }
  const ctx = canvas.getContext("2d");
  const mainPhosphor = createOffscreenBuffer();
  const subPhosphor = createOffscreenBuffer();
  const trailBuf = createOffscreenBuffer();

  let mainEchoCacheKey = "";
  let mainEchoCache = null;
  let subEchoCacheKey = "";
  let subEchoCache = null;

  let lastStructuralKey = "";
  let lastSignalKey = "";
  let lastTrailKey = "";
  let prevSweepAz = null;
  let seeded = false;

  const evalCachedEcho = (which, rangeNm, subGain, params) => {
    const resolvedPw = (which === "sub" && params.state.settings.pw === "AUTO")
      ? "AUTO"
      : params.state.effectiveModes.pw;
    const key = [
      params.scenario?.id ?? "none",
      params.maritimeBus?.busFingerprint ?? "nobus",
      params.state.simTick,
      rangeNm,
      params.state.gain,
      subGain,
      params.state.stc,
      params.state.settings.stcCurve,
      params.state.effectiveModes.ftc,
      params.state.settings.ir,
      params.state.settings.exp,
      params.state.settings.process,
      resolvedPw,
      params.state.instructor.seaState,
      params.state.instructor.rain,
      params.state.trainingFixture.interferenceSource ? 1 : 0,
    ].join("|");

    if (which === "main" && key === mainEchoCacheKey && mainEchoCache) return mainEchoCache;
    if (which === "sub" && key === subEchoCacheKey && subEchoCache) return subEchoCache;

    const result = evaluatePolarEchoGrid({
      scenario: params.scenario,
      maritimeBus: params.maritimeBus,
      rangeNm,
      gain: params.state.gain,
      subGain,
      stc: params.state.stc,
      stcCurve: params.state.settings.stcCurve,
      ftc: params.state.effectiveModes.ftc,
      ir: params.state.settings.ir,
      exp: params.state.settings.exp,
      process: params.state.settings.process,
      pw: resolvedPw,
      seaStateOverride: params.state.instructor.seaState,
      rainPercentOverride: params.state.instructor.rain,
      interferenceSource: params.state.trainingFixture.interferenceSource,
      simTick: params.state.simTick,
    });

    if (which === "main") {
      mainEchoCacheKey = key;
      mainEchoCache = result;
    } else {
      subEchoCacheKey = key;
      subEchoCache = result;
    }
    return result;
  };

  function resetBuffers() {
    mainPhosphor.ctx.clearRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
    subPhosphor.ctx.clearRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
    trailBuf.ctx.clearRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
    lastStructuralKey = "";
    lastSignalKey = "";
    lastTrailKey = "";
    prevSweepAz = null;
    seeded = false;
  }

  function render({
    state,
    scenario,
    maritimeBus,
    aisProjection,
    visualAzimuthDeg = 0,
    lcdLang = "en",
    nowMs = 0,
  }) {
    if (!state) return;

    if (state.powerMode === "off") {
      ctx.fillStyle = "#04080f";
      ctx.fillRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
      if (seeded) resetBuffers();
      return;
    }

    const paletteKey = state.settings?.colorPalette ?? "DAY";
    const palette = MDC2060_COLOR_PALETTES[paletteKey] ?? MDC2060_COLOR_PALETTES.DAY;
    const screenMode = state.settings?.screenMode ?? "PPI";
    const geom = getScopeGeometry(screenMode);
    const mainRangeDef = MDC2060_RANGES[state.rangeIndex] ?? MDC2060_RANGES[10];
    const subRangeDef = MDC2060_RANGES[state.subRangeIndex] ?? MDC2060_RANGES[7];
    const topRef = topOfScreenRefDeg(state.effectiveModes?.presentationMode, state.ownshipSnapshot);
    const origin = activeSweepOrigin(state);
    const txActive = isActivelyTransmitting(state);
    const sweepAz = normalizeDeg360(visualAzimuthDeg);

    // 1. Background fill
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, LCD_WIDTH, LCD_HEIGHT);

    // 2. Scope phosphor & trails update
    if (txActive) {
      const mainEcho = evalCachedEcho("main", mainRangeDef.nm, 0, { state, scenario, maritimeBus });
      const subEcho = geom.sub
        ? evalCachedEcho("sub", subRangeDef.nm, state.settings?.subGain ?? 0, { state, scenario, maritimeBus })
        : null;

      const structuralKey = [
        scenario?.id ?? "",
        screenMode,
        state.rangeIndex,
        state.subRangeIndex,
        paletteKey,
        state.effectiveModes?.presentationMode,
        state.effectiveModes?.motionMode,
        origin.xFrac.toFixed(3),
        origin.yFrac.toFixed(3),
        Math.round(topRef),
      ].join("|");

      const signalKey = [
        state.gain,
        state.settings?.subGain,
        state.stc,
        state.settings?.stcCurve,
        state.effectiveModes?.ftc,
        state.settings?.ir,
        state.settings?.exp,
        state.settings?.process,
        state.settings?.pw,
        state.effectiveModes?.pw,
        state.instructor?.seaState,
        state.instructor?.rain,
        state.trainingFixture?.interferenceSource ? 1 : 0,
      ].join("|");

      if (!seeded || structuralKey !== lastStructuralKey || signalKey !== lastSignalKey || prevSweepAz === null) {
        seedScopePhosphor(mainPhosphor.ctx, geom.main, origin, mainEcho, topRef, sweepAz, palette);
        if (geom.sub && subEcho) {
          seedScopePhosphor(subPhosphor.ctx, geom.sub, { xFrac: 0, yFrac: 0 }, subEcho, topRef, sweepAz, palette);
        }
        lastStructuralKey = structuralKey;
        lastSignalKey = signalKey;
        prevSweepAz = sweepAz;
        seeded = true;
      } else if (Math.abs(sweepAz - prevSweepAz) > 0.15) {
        stepScopePhosphor(mainPhosphor.ctx, geom.main, origin, mainEcho, topRef, prevSweepAz, sweepAz, palette);
        if (geom.sub && subEcho) {
          stepScopePhosphor(subPhosphor.ctx, geom.sub, { xFrac: 0, yFrac: 0 }, subEcho, topRef, prevSweepAz, sweepAz, palette);
        }
        prevSweepAz = sweepAz;
      }

      const trailKey = `${structuralKey}|${state.simTick}|${state.effectiveModes?.trailMode}|${state.settings?.trailTime}|${state.trails?.length ?? 0}`;
      if (trailKey !== lastTrailKey) {
        renderTrailsBuffer(trailBuf.ctx, geom.main, origin, mainRangeDef.nm, state, topRef, palette);
        lastTrailKey = trailKey;
      }

      // Composite phosphor + trails onto visible canvas
      ctx.drawImage(mainPhosphor.canvas, 0, 0);
      ctx.drawImage(trailBuf.canvas, 0, 0);
      if (geom.sub) {
        ctx.drawImage(subPhosphor.canvas, 0, 0);
      }
    } else {
      if (seeded) resetBuffers();
      // Paint clean inactive PPI background disks
      const paintIdleDisk = (scope) => {
        ctx.fillStyle = palette.ppiFill;
        ctx.beginPath();
        ctx.arc(scope.cx, scope.cy, scope.radius, 0, Math.PI * 2);
        ctx.fill();
      };
      paintIdleDisk(geom.main);
      if (geom.sub) paintIdleDisk(geom.sub);
    }

    // 3. Sharp Vector Layer & Compass Rose on Main Scope
    drawScopeVectors(ctx, geom.main, origin, mainRangeDef, state, topRef, aisProjection, sweepAz, palette, {
      isSubScope: false,
      nowMs,
    });
    drawCompassRose(ctx, geom.main, topRef, palette, screenMode !== "PPI");

    // 4. Independent Sub Scope Vector Layer in PPI/PPI
    if (geom.sub) {
      drawScopeVectors(ctx, geom.sub, { xFrac: 0, yFrac: 0 }, subRangeDef, state, topRef, aisProjection, sweepAz, palette, {
        isSubScope: true,
        nowMs,
      });
      drawCompassRose(ctx, geom.sub, topRef, palette, true);
    }

    // 5. Lower Navigation Panel in PPI/NAV
    if (geom.nav) {
      drawNavPanel(ctx, geom.nav, state, lcdLang, palette);
    }

    // 6. Corner Telemetry, Bottom GAIN/STC/FTC Bars, Fault/Alarm Banners, Modals
    drawCornerTelemetry(ctx, state, aisProjection, lcdLang, palette);
    drawBottomBars(ctx, state, lcdLang, palette);
    drawStatusBanners(ctx, state, lcdLang, palette, nowMs);
    drawOperationalStateCard(ctx, state, lcdLang, palette);
    drawOverlayModal(ctx, state, lcdLang, palette);

    // 7. LCD Brightness Dimming (1..10)
    const brill = Math.max(1, Math.min(10, state.brightness ?? 8));
    if (brill < 10) {
      const dimAlpha = ((10 - brill) * 0.064).toFixed(3);
      ctx.fillStyle = `rgba(0, 0, 0, ${dimAlpha})`;
      ctx.fillRect(0, 0, LCD_WIDTH, LCD_HEIGHT);
    }
  }

  return {
    render,
    resetBuffers,
  };
}
