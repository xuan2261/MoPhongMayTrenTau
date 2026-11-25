/**
 * Pure, deterministic FCV-588 English / Tieng Viet display dictionary.
 * Non-diacritic ASCII-Vietnamese strings follow authorized 2016 FCV-588
 * hardware reference photographs (giaoDien.jpg, nav1.jpg, nav2.jpg).
 */

export const FCV_LANGUAGES = Object.freeze(["English", "Tieng Viet"]);

const MENU_LEGEND_EN = Object.freeze([
  "▲/▼/◀/▶: Select",
  "[ENTER] : Enter",
  "[MENU]  : Back",
]);

const MENU_LEGEND_VI = Object.freeze([
  "▲/▼/◀/▶: Chon lua",
  "[ENTER] : Nhap vao",
  "[MENU]  : Quay lai",
]);

const CATEGORY_VI = Object.freeze({
  Sounder: "Do sau",
  Display: "Man hinh",
  Alarm: "Bao dong",
  Data: "Du lieu",
  System: "He thong",
  Installation: "Cai dat",
  INSTALLATION: "CAI DAT",
  UNITS: "DON VI",
  CALIBRATION: "HIEU CHUAN",
  "RANGE BANK": "THANG DO",
  "NAV1 DATA BOXES": "O DU LIEU NAV1",
  "NAV2 DATA BOXES": "O DU LIEU NAV2",
  ALARM1: "BAO DONG 1",
  ALARM2: "BAO DONG 2",
  ALARM3: "BAO DONG 3",
  ALARM4: "BAO DONG 4",
  ALARM5: "BAO DONG 5",
  "ALARM1 / SETTING": "BAO DONG 1 / THIET LAP",
  "ALARM2 / SETTING": "BAO DONG 2 / THIET LAP",
  "ALARM3 / SETTING": "BAO DONG 3 / THIET LAP",
  "ALARM4 / SETTING": "BAO DONG 4 / THIET LAP",
  "ALARM5 / SETTING": "BAO DONG 5 / THIET LAP",
  "FUNC Key · ASSIGN": "PHIM FUNC / GAN",
});

const MENU_LABEL_VI = Object.freeze({
  // Sounder (13 rows — 100% match to giaoDien.jpg)
  "sounder.pictureAdvance": "Keo Hinh",
  pictureAdvance: "Keo Hinh",
  "Pic. Advance": "Keo Hinh",
  "sounder.zoomMode": "K. Phong dai",
  zoomMode: "K. Phong dai",
  "Zoom Mode": "K. Phong dai",
  "sounder.shift": "Dich chuyen",
  shift: "Dich chuyen",
  Shift: "Dich chuyen",
  "sounder.interference": "Nhieu can",
  interference: "Nhieu can",
  Interference: "Nhieu can",
  "sounder.colorErase": "Xoa mau",
  colorErase: "Xoa mau",
  "Color Erase": "Xoa mau",
  "sounder.clutter": "Nhieu tap",
  clutter: "Nhieu tap",
  Clutter: "Nhieu tap",
  "sounder.whiteLine": "Duong trang",
  whiteLine: "Duong trang",
  "White Line": "Duong trang",
  "sounder.whiteMarker": "Dau Trang",
  whiteMarker: "Dau Trang",
  "White Marker": "Dau Trang",
  "sounder.tvg": "TVG",
  tvg: "TVG",
  TVG: "TVG",
  "sounder.smoothing": "Lam nhan",
  smoothing: "Lam nhan",
  Smoothing: "Lam nhan",
  "sounder.bottomZone": "Khu vuc Day",
  bottomZone: "Khu vuc Day",
  "Bottom Zone": "Khu vuc Day",
  "sounder.txPower": "C. suat Phat",
  txPower: "C. suat Phat",
  "TX Power": "C. suat Phat",
  "sounder.txRate": "Ti le Phat",
  txRate: "Ti le Phat",
  "TX Rate": "Ti le Phat",

  // Display (16 rows)
  "display.aScope": "A-Scope",
  aScope: "A-Scope",
  "A-Scope": "A-Scope",
  "display.colors": "Mau sac",
  colors: "Mau sac",
  Colors: "Mau sac",
  "display.depthSize": "Co so Do sau",
  depthSize: "Co so Do sau",
  "Depth Size": "Co so Do sau",
  "display.zoomMarker": "Vach Phong",
  zoomMarker: "Vach Phong",
  "Zoom Marker": "Vach Phong",
  "display.accuFish": "ACCU-FISH",
  accuFish: "ACCU-FISH",
  "ACCU-FISH": "ACCU-FISH",
  "display.bottomDiscrimination": "Phan loai Day",
  bottomDiscrimination: "Phan loai Day",
  "Bottom Disc.": "Phan loai Day",
  "display.rezBoost": "RezBoost",
  rezBoost: "RezBoost",
  "RezBoost Mode": "RezBoost",
  "display.fishSymbol": "Bieu tuong Ca",
  fishSymbol: "Bieu tuong Ca",
  "Fish Symbol": "Bieu tuong Ca",
  "Fish Symbols": "Bieu tuong Ca",
  "display.fishSize": "Co Ca",
  fishSize: "Co Ca",
  "Fish Size": "Co Ca",
  "display.palette": "Bang mau",
  palette: "Bang mau",
  Palette: "Bang mau",
  "display.colorBar": "Thang mau",
  colorBar: "Thang mau",
  "Color Bar": "Thang mau",
  "display.tempGraph": "Do thi Nhiet",
  tempGraph: "Do thi Nhiet",
  "Temp Graph": "Do thi Nhiet",
  "display.windowSize": "Co Cua so",
  windowSize: "Co Cua so",
  "Window Size": "Co Cua so",
  "display.battery": "Dien ap",
  battery: "Dien ap",
  Battery: "Dien ap",
  "display.headerInfo": "Thanh Tieu de",
  headerInfo: "Thanh Tieu de",
  "Header Info": "Thanh Tieu de",
  "display.navData": "Du lieu H.Hai",
  navData: "Du lieu H.Hai",
  "Navigation Data": "Du lieu H.Hai",

  // Alarm (7 rows + Fish Alarm subfields)
  "alarm.alarm1": "BAO DONG 1",
  alarm1: "BAO DONG 1",
  ALARM1: "BAO DONG 1",
  "alarm.alarm2": "BAO DONG 2",
  alarm2: "BAO DONG 2",
  ALARM2: "BAO DONG 2",
  "alarm.alarm3": "BAO DONG 3",
  alarm3: "BAO DONG 3",
  ALARM3: "BAO DONG 3",
  "alarm.alarm4": "BAO DONG 4",
  alarm4: "BAO DONG 4",
  ALARM4: "BAO DONG 4",
  "alarm.alarm5": "BAO DONG 5",
  alarm5: "BAO DONG 5",
  ALARM5: "BAO DONG 5",
  "alarm.arrivalAlarm": "Bao dong Den",
  arrivalAlarm: "Bao dong Den",
  "Arrival Alarm · SIM": "Bao dong Den",
  "alarm.arrivalRadius": "Ban kinh Den",
  arrivalRadius: "Ban kinh Den",
  "Arrival Radius · SIM": "Ban kinh Den",
  Setting: "Thiet lap",
  Alarm: "Bao dong",
  bottomEnabled: "Day",
  Bottom: "Day",
  bottomFrom: "Day Tu",
  "Bottom From": "Day Tu",
  bottomSpan: "Khoang Day",
  "Bottom Span": "Khoang Day",
  bottomType: "Loai Day",
  "Bottom Type": "Loai Day",
  fishType: "Loai Ca",
  "Fish Type": "Loai Ca",
  fishLevel: "Muc Ca",
  "Fish Level": "Muc Ca",
  temperature: "Nhiet do",
  Temperature: "Nhiet do",
  tempFrom: "Nhiet Tu",
  "Temp From": "Nhiet Tu",
  tempSpan: "Khoang Nhiet",
  "Temp Span": "Khoang Nhiet",
  speedType: "Toc do",
  Speed: "Toc do",
  speedFrom: "Toc do Tu",
  "Speed From": "Toc do Tu",
  speedSpan: "Khoang Toc do",
  "Speed Span": "Khoang Toc do",
  sound: "Am bao",
  Sound: "Am bao",

  // Data (12 rows)
  "data.nav1": "O NAV1",
  nav1: "O NAV1",
  "NAV1 Boxes": "O NAV1",
  "data.nav2": "O NAV2",
  nav2: "O NAV2",
  "NAV2 Boxes": "O NAV2",
  "data.waypoint": "Danh sach WPT",
  waypoint: "Danh sach WPT",
  "WPT List": "Danh sach WPT",
  "data.destination": "Di toi WPT",
  destination: "Di toi WPT",
  "Go to WPT": "Di toi WPT",
  "data.deleteAllWaypoint": "Xoa tat ca WPT",
  deleteAllWaypoint: "Xoa tat ca WPT",
  "Delete All WPT": "Xoa tat ca WPT",
  "data.trip": "Hanh trinh",
  trip: "Hanh trinh",
  "Trip / Odometer · SIM": "Hanh trinh",
  "data.resetTrip": "Xoa Hanh trinh",
  resetTrip: "Xoa Hanh trinh",
  "Reset Trip · SIM": "Xoa Hanh trinh",
  "data.bearing": "Phuong vi",
  bearing: "Phuong vi",
  Bearing: "Phuong vi",
  "data.windSpeedDirection": "Toc/Huong Gio",
  windSpeedDirection: "Toc/Huong Gio",
  "Wind Spd/Dir": "Toc/Huong Gio",
  "data.tripSource": "Nguon H.Trinh",
  tripSource: "Nguon H.Trinh",
  "Trip Source": "Nguon H.Trinh",
  "data.tempSource": "Nguon Nhiet",
  tempSource: "Nguon Nhiet",
  "Temp Source": "Nguon Nhiet",
  "data.speedSource": "Nguon Toc do",
  speedSource: "Nguon Toc do",
  "Speed Source": "Nguon Toc do",

  // System (19 rows)
  "system.rangePresets": "Thang do",
  rangePresets: "Thang do",
  "Range Presets": "Thang do",
  "system.zoomRange": "Tam Phong",
  zoomRange: "Tam Phong",
  "Zoom Range": "Tam Phong",
  "system.blRange": "Tam Bam Day",
  blRange: "Tam Bam Day",
  "B/L Range": "Tam Bam Day",
  "system.language": "Ngon ngu",
  language: "Ngon ngu",
  Language: "Ngon ngu",
  "system.units": "Don vi",
  units: "Don vi",
  Units: "Don vi",
  "system.calibration": "Hieu chuan",
  calibration: "Hieu chuan",
  Calibration: "Hieu chuan",
  "system.transducer": "Dau do",
  transducer: "Dau do",
  Transducer: "Dau do",
  "system.demo": "Mo phong",
  demo: "Mo phong",
  Demo: "Mo phong",
  Demonstrate: "Mo phong",
  "system.diagnostics": "Tu kiem tra",
  diagnostics: "Tu kiem tra",
  Diagnostics: "Tu kiem tra",
  "system.lcdTest": "Kiem tra LCD",
  lcdTest: "Kiem tra LCD",
  "LCD Test": "Kiem tra LCD",
  "system.restore": "Mac dinh",
  restore: "Mac dinh",
  "Restore Defaults": "Mac dinh",
  "system.tankenmaru": "Tankenmaru",
  tankenmaru: "Tankenmaru",
  "Tankenmaru System": "Tankenmaru",
  "system.tankenmaruDetails": "TT Tankenmaru",
  tankenmaruDetails: "TT Tankenmaru",
  "Tankenmaru Details · SIM": "TT Tankenmaru",
  "system.nmea": "NMEA",
  nmea: "NMEA",
  NMEA: "NMEA",
  "system.receiverStatus": "TT Dau thu",
  receiverStatus: "TT Dau thu",
  "Receiver Status · SIM": "TT Dau thu",
  "system.keySetup": "Phim FUNC",
  keySetup: "Phim FUNC",
  "FUNC Key": "Phim FUNC",
  "system.keyBeep": "Tieng Phim",
  keyBeep: "Tieng Phim",
  "Key Beep": "Tieng Phim",
  "system.draft": "Mon nuoc",
  draft: "Mon nuoc",
  Draft: "Mon nuoc",
  "system.installation": "Cai dat",
  installation: "Cai dat",
  "Installation Settings": "Cai dat",

  // Installation / Calibration / Units / Range Bank / Nav Box slots
  Type: "Loai Dau do",
  gainAdjHF: "Chinh Gain HF",
  "Gain ADJ HF": "Chinh Gain HF",
  gainAdjLF: "Chinh Gain LF",
  "Gain ADJ LF": "Chinh Gain LF",
  tempAdjust: "Nhiet do",
  Temp: "Nhiet do",
  speedAdjust: "Toc do (STW)",
  "Speed (STW)": "Toc do (STW)",
  fishSizeAdjust: "Co Ca",
  waterType: "Loai Nuoc",
  "Water Type": "Loai Nuoc",
  zeroLineRejector: "Khu Vach 0",
  "Zero Line Rejector": "Khu Vach 0",
  Depth: "Do sau",
  tempUnit: "Nhiet do",
  fishSizeUnit: "Co Ca",
  speedUnit: "Toc do",
  windUnit: "Gio",
  Wind: "Gio",
  distanceUnit: "Quang duong",
  Distance: "Quang duong",
  rangePreset1: "Thang 1",
  "Range 1": "Thang 1",
  rangePreset2: "Thang 2",
  "Range 2": "Thang 2",
  rangePreset3: "Thang 3",
  "Range 3": "Thang 3",
  rangePreset4: "Thang 4",
  "Range 4": "Thang 4",
  rangePreset5: "Thang 5",
  "Range 5": "Thang 5",
  rangePreset6: "Thang 6",
  "Range 6": "Thang 6",
  rangePreset7: "Thang 7",
  "Range 7": "Thang 7",
  rangePreset8: "Thang 8",
  "Range 8": "Thang 8",
  nav1Box1: "O 1",
  nav1Box2: "O 2",
  nav1Box3: "O 3",
  nav1Box4: "O 4",
  nav2Box1: "O 1",
  nav2Box2: "O 2",
  nav2Box3: "O 3",
  nav2Box4: "O 4",
  "Box 1": "O 1",
  "Box 2": "O 2",
  "Box 3": "O 3",
  "Box 4": "O 4",
});

const CHOICE_VI = Object.freeze({
  Auto: "Tu Dong",
  Off: "Tat",
  On: "Bat",
  Edge: "Bien",
  "Bottom Lock": "Bam Day",
  "Bottom Zoom": "Phong Day",
  "Marker Zoom": "Phong VRM",
  Low: "Thap",
  Medium: "Tr. Binh",
  High: "Cao",
  Narrow: "Hep",
  Standard: "Tieu chuan",
  Wide: "Rong",
  Small: "Nho",
  Large: "Lon",
  White: "Trang",
  Gray: "Xam",
  Blue: "Xanh",
  Black: "Den",
  Mono: "Don sac",
  Night: "Ban dem",
  Normal: "Thuong",
  Peak: "Dinh",
  Graphic: "Do hoa",
  Probability: "Xac suat",
  Enhanced: "Tang cuong",
  Fish: "Ca",
  Circle: "Vong tron",
  Basic: "Co ban",
  Expanded: "Mo rong",
  True: "Thuc",
  Mag: "Tu",
  Apparent: "Bieu kien",
  Own: "Noi bo",
  Metric: "Met",
  Feet: "Feet",
  Fathom: "Sai",
  Salt: "Nuoc man",
  Fresh: "Nuoc ngot",
  Rock: "Da",
  Gravel: "Soi",
  Sand: "Cat",
  Mud: "Bun",
  "Fish School": "Dan ca",
  "Bottom Fish": "Ca day",
  Inside: "Trong khoang",
  Outside: "Ngoai khoang",
  Sound1: "Am 1",
  Sound2: "Am 2",
  Sound3: "Am 3",
  Stop: "Dung",
  Max: "Toi da",
  Yes: "Co",
  No: "Khong",
});

const PICTURE_ADVANCE_VI = Object.freeze({
  "4x": "x4",
  "2x": "x2",
  "1x": "x1",
  Stop: "Dung",
});

const NAV_LABEL_VI = Object.freeze({
  POSITION: "Vi tri",
  DEPTH: "Do sau",
  SPEED: "Toc do (STW)",
  STW: "Toc do (STW)",
  "SPEED (STW)": "Toc do (STW)",
  SOG: "Toc do (SOG)",
  "SPEED (SOG)": "Toc do (SOG)",
  TEMPERATURE: "Nhiet do",
  "WATER TEMP": "Nhiet do",
  TEMP: "Nhiet do",
  TRIP: "Hanh trinh",
  ODOMETER: "Tong hanh trinh",
  COURSE: "Huong di",
  WIND: "Gio",
  "WIND (APPARENT)": "Gio (Bieu kien)",
  RANGE: "Khoang cach",
  BEARING: "Phuong vi",
  "BEARING (MAG)": "Phuong vi (Tu)",
  HEADING: "Huong mui",
  "BAROM PRESS": "Ap suat",
  "TIME TO GO": "Thoi gian den",
  XTE: "Lech tuyen",
});

function resolveSettings(settingsOrState) {
  if (typeof settingsOrState === "string") return {language: settingsOrState};
  if (settingsOrState && typeof settingsOrState === "object") {
    if (typeof settingsOrState.language === "string") return settingsOrState;
    if (settingsOrState.settings && typeof settingsOrState.settings === "object") {
      return settingsOrState.settings;
    }
    return settingsOrState;
  }
  return {};
}

export function isVietnameseFcv(settings) {
  return resolveSettings(settings)?.language === "Tieng Viet";
}

export function localizeFcvMenuHeader(settings) {
  return isVietnameseFcv(settings) ? "B. Lenh" : "Menu";
}

export function localizeFcvCategory(category, settings) {
  const raw = String(category ?? "");
  if (!isVietnameseFcv(settings)) return raw;
  return Object.hasOwn(CATEGORY_VI, raw) ? CATEGORY_VI[raw] : raw;
}

export function localizeFcvMenuLabel(idOrKey, fallbackLabel, settings) {
  let effectiveFallback = fallbackLabel;
  let effectiveSettings = settings;
  if (effectiveSettings === undefined && effectiveFallback && typeof effectiveFallback === "object") {
    effectiveSettings = effectiveFallback;
    effectiveFallback = undefined;
  }
  const key = String(idOrKey ?? "");
  if (!isVietnameseFcv(effectiveSettings)) {
    return effectiveFallback ?? key;
  }
  if (key === "units" && effectiveFallback === "Depth") return "Do sau";
  if (key === "transducer" && effectiveFallback === "Type") return "Loai Dau do";
  const alarmMatch = /^alarm([1-5])([A-Z]\w*)$/.exec(key);
  if (alarmMatch) {
    const suffixKey = alarmMatch[2][0].toLowerCase() + alarmMatch[2].slice(1);
    if (Object.hasOwn(MENU_LABEL_VI, suffixKey)) return MENU_LABEL_VI[suffixKey];
  }
  if (Object.hasOwn(MENU_LABEL_VI, key)) return MENU_LABEL_VI[key];
  if (typeof effectiveFallback === "string" && Object.hasOwn(MENU_LABEL_VI, effectiveFallback)) {
    return MENU_LABEL_VI[effectiveFallback];
  }
  return effectiveFallback ?? key;
}

export function localizeFcvNavLabel(boxName, fallbackLabel, settings) {
  let effectiveFallback = fallbackLabel;
  let effectiveSettings = settings;
  if (effectiveSettings === undefined && effectiveFallback && typeof effectiveFallback === "object") {
    effectiveSettings = effectiveFallback;
    effectiveFallback = undefined;
  }
  const fallback = effectiveFallback ?? String(boxName ?? "");
  if (!isVietnameseFcv(effectiveSettings)) return fallback;
  const normalized = String(boxName ?? "").trim().toUpperCase();
  if (Object.hasOwn(NAV_LABEL_VI, normalized)) return NAV_LABEL_VI[normalized];
  const fallbackNorm = String(fallback).trim().toUpperCase();
  if (Object.hasOwn(NAV_LABEL_VI, fallbackNorm)) return NAV_LABEL_VI[fallbackNorm];
  return fallback;
}

export function localizeFcvChoiceValue(settingKey, value, settings) {
  if (value === null || value === undefined) return "--";
  const raw = String(value);
  const resolved = resolveSettings(settings);
  if (!isVietnameseFcv(resolved)) return raw;
  const key = String(settingKey ?? "");
  const shortKey = key.includes(".") ? key.split(".").pop() : key;
  if (shortKey === "pictureAdvance" && Object.hasOwn(PICTURE_ADVANCE_VI, raw)) {
    return PICTURE_ADVANCE_VI[raw];
  }
  if ((shortKey === "colorErase" || shortKey === "clutter") && /^-?\d+$/.test(raw)) {
    return raw + "%";
  }
  if (shortKey === "shift" && /^-?\d+$/.test(raw)) {
    const unit = resolved.units === "Feet" ? "ft" : resolved.units === "Fathom" ? "fm" : "m";
    return raw + unit;
  }
  if (shortKey === "keySetup" && Object.hasOwn(MENU_LABEL_VI, raw)) {
    return MENU_LABEL_VI[raw];
  }
  if (/^nav[12]Box[1-4]$/.test(shortKey)) {
    if (raw === "Off") return "Tat";
    return localizeFcvNavLabel(raw, raw, resolved);
  }
  if (Object.hasOwn(CHOICE_VI, raw)) return CHOICE_VI[raw];
  return raw;
}

export function localizeFcvMenuLegend(settings) {
  return isVietnameseFcv(settings) ? MENU_LEGEND_VI : MENU_LEGEND_EN;
}

const CONTROL_TITLE_EN = Object.freeze({
  range: "Range",
  gain: "Auto Gain",
  brill: "Brill",
  mode: "MODE",
});

const CONTROL_TITLE_VI = Object.freeze({
  range: "Thang do",
  gain: "Khuech dai TD",
  brill: "Do sang",
  mode: "Che do",
});

const CONTROL_LEGEND_EN = Object.freeze({
  range: Object.freeze(["◀/▶: Mode  ▲/▼: Preset", "[ENTER]: Enter  [MENU]: Back"]),
  gain: Object.freeze(["▲/▼: Mode  ◀/▶: Offset", "[ENTER]: Enter  [MENU]: Back"]),
  brill: Object.freeze(["◀/▶: Level  [BRILL]: Step", "[ENTER] / [MENU]: Save"]),
  mode: Object.freeze(["MODE: Select", "[MENU]: Cancel"]),
});

const CONTROL_LEGEND_VI = Object.freeze({
  range: Object.freeze(["◀/▶: Che do  ▲/▼: Thang", "[ENTER]: Nhap vao  [MENU]: Quay lai"]),
  gain: Object.freeze(["▲/▼: Che do  ◀/▶: Bu", "[ENTER]: Nhap vao  [MENU]: Quay lai"]),
  brill: Object.freeze(["◀/▶: Muc  [BRILL]: Doi", "[ENTER] / [MENU]: Luu"]),
  mode: Object.freeze(["MODE: Chon lua", "[MENU]: Huy"]),
});

export function localizeFcvControlTitle(kind, settings) {
  const table = isVietnameseFcv(settings) ? CONTROL_TITLE_VI : CONTROL_TITLE_EN;
  return Object.hasOwn(table, kind) ? table[kind] : String(kind ?? "");
}

export function localizeFcvControlLegend(kind, settings) {
  const table = isVietnameseFcv(settings) ? CONTROL_LEGEND_VI : CONTROL_LEGEND_EN;
  return Object.hasOwn(table, kind) ? table[kind] : MENU_LEGEND_EN;
}
