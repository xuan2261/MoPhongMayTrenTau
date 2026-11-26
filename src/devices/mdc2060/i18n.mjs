/**
 * KODEN MDC-2060 Marine Radar — Bilingual English / Vietnamese Dictionaries.
 *
 * Standard maritime English is the default LCD language; Vietnamese is
 * supported for LCD switching and D15 instructor controls. All dictionary
 * lookups are strictly prototype-safe via Object.hasOwn.
 */

export const MDC2060_LANGUAGES = Object.freeze(["en", "vi"]);

const DICT_EN = Object.freeze({
  // Power & TX states
  "power.off": "OFF",
  "power.preheat": "PREHEAT",
  "power.standby": "ST'BY",
  "power.transmit": "TX",
  "power.sleep": "SLEEP",
  "power.preheatWait": "MAGNETRON PREHEAT",
  "power.sleepRest": "SLEEP STANDBY",
  "power.sleepTx": "SLEEP TX BURST",

  // LCD telemetry & overlays
  "lcd.rng": "RNG",
  "lcd.ring": "RING",
  "lcd.subRng": "SUB RNG",
  "lcd.hdg": "HDG",
  "lcd.cog": "COG",
  "lcd.sog": "SOG",
  "lcd.pos": "POS",
  "lcd.depth": "DEPTH",
  "lcd.temp": "TEMP",
  "lcd.gain": "GAIN",
  "lcd.stc": "STC",
  "lcd.ftc": "FTC",
  "lcd.ir": "IR",
  "lcd.exp": "EXP",
  "lcd.pw": "PW",
  "lcd.tune": "TUNE",
  "lcd.brill": "BRILLIANCE",
  "lcd.hlOff": "HL OFF",
  "lcd.offCenter": "OFF CENT",
  "lcd.cursor": "CURSOR",
  "lcd.brg": "BRG",
  "lcd.cpa": "CPA",
  "lcd.tcpa": "TCPA",
  "lcd.bcr": "BCR",
  "lcd.bct": "BCT",
  "lcd.ebl1": "EBL1",
  "lcd.ebl2": "EBL2",
  "lcd.vrm1": "VRM1",
  "lcd.vrm2": "VRM2",
  "lcd.pi": "PI",
  "lcd.trail": "TRAIL",
  "lcd.vector": "VECTOR",
  "lcd.ata": "ATA",
  "lcd.ais": "AIS",
  "lcd.guardZone": "GUARD ZONE",
  "lcd.navTitle": "NAVIGATION DATA",
  "lcd.panelTestTitle": "PANEL KEY TEST",
  "lcd.lcdTestTitle": "LCD COLOR BAR TEST",
  "lcd.txHours": "TX HOURS",
  "lcd.noData": "NO DATA",
  "lcd.twoPoint": "2-PT MEASURE",
  "lcd.f1": "F1",
  "lcd.f2": "F2",
  "lcd.menuTitle": "MAIN MENU",
  "lcd.systemMenuTitle": "SYSTEM MENU",
  "lcd.legendNav": "UP/DN: SELECT",
  "lcd.legendEnter": "ENT: SET",
  "lcd.legendMenu": "MENU: EXIT",

  // Presentation, motion, screen modes
  "mode.H-UP": "H-UP",
  "mode.N-UP": "N-UP",
  "mode.C-UP": "C-UP",
  "mode.W-UP": "W-UP",
  "mode.RM": "RM",
  "mode.TM": "TM",
  "mode.PPI": "PPI",
  "mode.PPI/PPI": "PPI/PPI",
  "mode.PPI/NAV": "PPI/NAV",

  // LCD color palettes
  "palette.DAY": "DAY",
  "palette.NIGHT": "NIGHT",
  "palette.GREEN": "GREEN",
  "palette.WHITE": "WHITE",

  // Main & System menu groups
  "menu.group.echo": "ECHO",
  "menu.group.display": "DISPLAY",
  "menu.group.ebl_vrm": "EBL/VRM",
  "menu.group.alarm": "ALARM",
  "menu.group.ata": "ATA",
  "menu.group.ais": "AIS",
  "menu.group.sleep": "SLEEP",
  "menu.group.system": "SYSTEM",
  "menu.group.assist": "ASSIST",
  "menu.group.adjust": "ADJUST",
  "menu.group.preset": "PRESET",
  "menu.group.maint": "MAINT",

  // Main menu items
  "menu.item.ftc": "FTC",
  "menu.item.ir": "IR",
  "menu.item.exp": "EXP",
  "menu.item.process": "PROCESS",
  "menu.item.pw": "PW",
  "menu.item.subGain": "SUB GAIN",
  "menu.item.presentationMode": "MODE",
  "menu.item.motionMode": "MOTION",
  "menu.item.screenMode": "SCREEN",
  "menu.item.offCenter": "OFF CENT",
  "menu.item.trailMode": "TRAIL MODE",
  "menu.item.trailTime": "TRAIL TIME",
  "menu.item.colorPalette": "COLOR",
  "menu.item.piLine": "PI LINE",
  "menu.item.brgMode": "BRG MODE",
  "menu.item.vectorMode": "VECTOR",
  "menu.item.ebl1": "EBL1",
  "menu.item.ebl2": "EBL2",
  "menu.item.vrm1": "VRM1",
  "menu.item.vrm2": "VRM2",
  "menu.item.ebl1Float": "EBL1 FLOAT",
  "menu.item.alarmMode": "MODE",
  "menu.item.alarmInnerNm": "INNER RNG",
  "menu.item.alarmOuterNm": "OUTER RNG",
  "menu.item.alarmStartBrgDeg": "START BRG",
  "menu.item.alarmEndBrgDeg": "END BRG",
  "menu.item.alarmLevel": "LEVEL",
  "menu.item.ataAcq": "ACQ",
  "menu.item.ataDel": "DEL",
  "menu.item.ataDelAll": "DEL ALL",
  "menu.item.ataAutoArea": "AUTO AREA",
  "menu.item.ataCpaLimitNm": "CPA LIMIT",
  "menu.item.ataTcpaLimitMin": "TCPA LIMIT",
  "menu.item.ataVectorTimeMin": "VECTOR TIME",
  "menu.item.ataPastPos": "PAST POS",
  "menu.item.aisDisplay": "DISPLAY",
  "menu.item.aisFilterRangeNm": "FILTER RNG",
  "menu.item.aisInfo": "INFO",
  "menu.item.aisCpaAlarm": "CPA ALARM",
  "menu.item.sleepMode": "MODE",
  "menu.item.sleepIntervalMin": "INTERVAL",
  "menu.item.openSystemMenu": "SYSTEM MENU",

  // System menu items
  "menu.item.rings": "RINGS",
  "menu.item.rangeUnit": "RANGE UNIT",
  "menu.item.motorRpm": "MOTOR",
  "menu.item.buzzer": "BUZZER",
  "menu.item.cursorShape": "CURSOR SHAPE",
  "menu.item.language": "LANGUAGE",
  "menu.item.stcCurve": "STC CURVE",
  "menu.item.brgAdjDeg": "BRG ADJ",
  "menu.item.tuneMode": "TUNE",
  "menu.item.f1Key": "F1 KEY",
  "menu.item.f2Key": "F2 KEY",
  "menu.item.demoAllReset": "DEMO/ALL RESET",
  "menu.item.panelTest": "PANEL TEST",
  "menu.item.lcdTest": "LCD TEST",
  "menu.item.txHours": "TX HOURS",

  // Choice values
  "choice.OFF": "OFF",
  "choice.ON": "ON",
  "choice.AUTO": "AUTO",
  "choice.MAN": "MAN",
  "choice.LOW": "LOW",
  "choice.MID": "MID",
  "choice.HIGH": "HIGH",
  "choice.R": "R",
  "choice.T": "T",
  "choice.CONT": "CONT",
  "choice.CROSS": "CROSS",
  "choice.SMALL": "SMALL",
  "choice.FULL": "FULL",
  "choice.AVG1": "AVG1",
  "choice.AVG2": "AVG2",
  "choice.PEAK": "PEAK",
  "choice.IN": "IN",
  "choice.OUT": "OUT",
  "choice.en": "English",
  "choice.vi": "Tieng Viet",
  "choice.NM": "NM",
  "choice.km": "km",
  "choice.sm": "sm",
  "choice.15s": "15s",
  "choice.30s": "30s",
  "choice.1m": "1m",
  "choice.3m": "3m",
  "choice.5m": "5m",
  "choice.6m": "6m",
  "choice.10m": "10m",
  "choice.15m": "15m",
  "choice.30m": "30m",
  "choice.24": "24 RPM",
  "choice.48": "48 RPM",
  "choice.S1": "S1",
  "choice.S2": "S2",
  "choice.M1": "M1",
  "choice.M2": "M2",
  "choice.L": "L",
  "choice.1": "1",
  "choice.2": "2",
  "choice.3": "3",
  "choice.4": "4",

  // F-key presets
  "fkey.EBL1_VRM1": "EBL1/VRM1",
  "fkey.ATA_ACQ": "ATA ACQ",
  "fkey.MODE_CYCLE": "MODE",
  "fkey.SCREEN_CYCLE": "SCREEN",
  "fkey.OFF_CENTER": "OFF CENT",
  "fkey.TRAIL_TOGGLE": "TRAIL",
  "fkey.FTC_STEP": "FTC",
  "fkey.IR_STEP": "IR",
  "fkey.AIS_TOGGLE": "AIS",
  "fkey.ALARM_TOGGLE": "GUARD",
  "fkey.COLOR_CYCLE": "COLOR",
  "fkey.ALARM_ACK": "ALM ACK",

  // Alarms
  "alarm.cpaDanger": "ATA CPA/TCPA ALARM",
  "alarm.aisCpaDanger": "AIS CPA/TCPA ALARM",
  "alarm.guardIn": "GUARD ZONE IN ALARM",
  "alarm.guardOut": "GUARD ZONE OUT ALARM",
  "alarm.ataLost": "ATA TARGET LOST",
  "alarm.ataMaxCap": "ATA FULL (50 MAX)",
  "alarm.ataBoardMissing": "NO ATA BOARD (MRE-340)",
  "alarm.aisBoardMissing": "NO AIS INTERFACE",
  "alarm.ackHint": "PRESS ACK TO SILENCE",

  // Sensor faults
  "fault.hdgNoSignal": "HDG NO SIGNAL",
  "fault.gpsNoSignal": "GPS NO SIGNAL",
  "fault.spdNoSignal": "SPD NO SIGNAL",
  "fault.llNoSignal": "L/L NO SIGNAL",
  "fault.sensorOk": "SENSORS OK",

  // ATA & AIS target statuses
  "ataStatus.acquiring": "ACQ",
  "ataStatus.tracking": "TRK",
  "ataStatus.lost": "LOST",
  "aisStatus.sleeping": "SLEEP",
  "aisStatus.active": "ACTIVE",
  "aisStatus.dangerous": "DANGER",

  // D15 Instructor console (5 tabs & toolbar)
  "d15.focusDevice": "Focus Device",
  "d15.audioOn": "Buzzer ON",
  "d15.audioOff": "Buzzer OFF",
  "d15.fullscreen": "Fullscreen",
  "d15.langToggle": "VI / EN",
  "d15.tabSession": "Session & Ownship",
  "d15.tabWeather": "Weather & Sensors",
  "d15.tabArpaNmea": "ATA / AIS & NMEA",
  "d15.tabLessons": "Lessons (7)",
  "d15.tabSettings": "Config & Replay",
  "d15.scenario": "Training Scenario",
  "d15.pause": "Pause",
  "d15.resume": "Resume",
  "d15.step1s": "+1s",
  "d15.reset": "Reset",
  "d15.verifyReplay": "Verify Replay",
  "d15.ownshipHelm": "Ownship Maneuvering",
  "d15.applyOwnship": "Apply Ownship",
  "d15.fastPreheat": "Fast Preheat (5s fixture)",
  "d15.skipPreheat": "Skip Preheat",
  "d15.rotaryAssist": "GAIN / STC / FTC Assist",
  "d15.seaState": "Sea State (0-6)",
  "d15.rainIntensity": "Rain Intensity (0-100%)",
  "d15.interference": "Radar Interference",
  "d15.sensorFaults": "Sensor & Option Board Faults",
  "d15.headingSensor": "Heading Sensor (HDG)",
  "d15.gpsSensor": "GPS Position (L/L)",
  "d15.speedSensor": "Speed Log (SPD)",
  "d15.ataBoard": "ATA Option Board (MRE-340)",
  "d15.aisBoard": "AIS Option Interface",
  "d15.ataList": "ATA Tracked Targets",
  "d15.aisList": "AIS Targets",
  "d15.nmeaFeed": "Live NMEA-0183 Bus",
  "d15.bridgeSync": "FCV-588 Bridge Sync",
  "d15.bridgeDepth": "Shared Seabed Depth",
  "d15.acquireBtn": "Acquire ATA",
  "d15.deleteAllBtn": "Delete All ATA",
  "d15.lessonSelect": "Select Lesson",
  "d15.startLesson": "Start Lesson",
  "d15.gradeLesson": "Assess Lesson",
  "d15.lessonPassed": "PASSED",
  "d15.lessonFailed": "INCOMPLETE",
  "d15.exportSettings": "Export Settings JSON",
  "d15.importSettings": "Import Settings JSON",
  "d15.exportReplay": "Export Replay Envelope",
  "d15.importReplay": "Verify Replay Envelope",
  "d15.disclaimerTitle": "PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY",
  "d15.disclaimerBody": "Deterministic classroom training simulator for KODEN MDC-2060. Not connected to live navigation sensors and not fit for shipboard navigation.",
});

const DICT_VI = Object.freeze({
  // Power & TX states
  "power.off": "TẮT",
  "power.preheat": "SẤY ĐÈN",
  "power.standby": "CHỜ PHÁT (ST'BY)",
  "power.transmit": "PHÁT (TX)",
  "power.sleep": "NGỦ TIẾT KIỆM",
  "power.preheatWait": "ĐANG SẤY MAGNETRON",
  "power.sleepRest": "NGỦ CHỜ CHU KỲ",
  "power.sleepTx": "PHÁT XUNG 30s",

  // LCD telemetry & overlays
  "lcd.rng": "THANG",
  "lcd.ring": "VÒNG",
  "lcd.subRng": "THANG PHỤ",
  "lcd.hdg": "MŨI (HDG)",
  "lcd.cog": "HƯỚNG (COG)",
  "lcd.sog": "TỐC ĐỘ (SOG)",
  "lcd.pos": "VỊ TRÍ",
  "lcd.depth": "ĐỘ SÂU",
  "lcd.temp": "NHIỆT ĐỘ",
  "lcd.gain": "GAIN",
  "lcd.stc": "STC",
  "lcd.ftc": "FTC",
  "lcd.ir": "IR",
  "lcd.exp": "EXP",
  "lcd.pw": "XUNG (PW)",
  "lcd.tune": "TUNE",
  "lcd.brill": "ĐỘ SÁNG",
  "lcd.hlOff": "ẨN MŨI (HL OFF)",
  "lcd.offCenter": "LỆCH TÂM",
  "lcd.cursor": "CON TRỎ",
  "lcd.brg": "PHƯƠNG VỊ",
  "lcd.cpa": "CPA",
  "lcd.tcpa": "TCPA",
  "lcd.bcr": "BCR",
  "lcd.bct": "BCT",
  "lcd.ebl1": "EBL1",
  "lcd.ebl2": "EBL2",
  "lcd.vrm1": "VRM1",
  "lcd.vrm2": "VRM2",
  "lcd.pi": "ĐƯỜNG PI",
  "lcd.trail": "VỆT",
  "lcd.vector": "VÉC-TƠ",
  "lcd.ata": "ATA",
  "lcd.ais": "AIS",
  "lcd.guardZone": "VÙNG CẢNH GIỚI",
  "lcd.navTitle": "DỮ LIỆU HÀNH HẢI",
  "lcd.panelTestTitle": "KIỂM TRA PHÍM MẶT MÁY",
  "lcd.lcdTestTitle": "KIỂM TRA MÀU MÀN HÌNH LCD",
  "lcd.txHours": "GIỜ PHÁT TX",
  "lcd.noData": "KHÔNG DỮ LIỆU",
  "lcd.twoPoint": "ĐO 2 ĐIỂM",
  "lcd.f1": "F1",
  "lcd.f2": "F2",
  "lcd.menuTitle": "MENU CHÍNH",
  "lcd.systemMenuTitle": "MENU HỆ THỐNG",
  "lcd.legendNav": "▲▼: CHỌN",
  "lcd.legendEnter": "ENT: XÁC NHẬN",
  "lcd.legendMenu": "MENU: THOÁT",

  // Presentation, motion, screen modes
  "mode.H-UP": "H-UP (Mũi tàu)",
  "mode.N-UP": "N-UP (Bắc thật)",
  "mode.C-UP": "C-UP (Hướng đi)",
  "mode.W-UP": "W-UP (Điểm đến)",
  "mode.RM": "RM (Tương đối)",
  "mode.TM": "TM (Chuyển động thật)",
  "mode.PPI": "PPI",
  "mode.PPI/PPI": "PPI/PPI (2 Thang)",
  "mode.PPI/NAV": "PPI/NAV (Dẫn đường)",

  // LCD color palettes
  "palette.DAY": "BAN NGÀY",
  "palette.NIGHT": "BAN ĐÊM",
  "palette.GREEN": "XANH LÁ",
  "palette.WHITE": "NỀN TRẮNG",

  // Main & System menu groups
  "menu.group.echo": "HỒI ÂM",
  "menu.group.display": "HIỂN THỊ",
  "menu.group.ebl_vrm": "EBL/VRM",
  "menu.group.alarm": "CẢNH BÁO",
  "menu.group.ata": "BÁM ATA",
  "menu.group.ais": "AIS",
  "menu.group.sleep": "NGỦ",
  "menu.group.system": "HỆ THỐNG",
  "menu.group.assist": "HỖ TRỢ",
  "menu.group.adjust": "HIỆU CHỈNH",
  "menu.group.preset": "PHÍM TẮT",
  "menu.group.maint": "BẢO TRÌ",

  // Main menu items
  "menu.item.ftc": "Khử mưa FTC",
  "menu.item.ir": "Khử giao thoa IR",
  "menu.item.exp": "Mở rộng mục tiêu EXP",
  "menu.item.process": "Xử lý hồi âm",
  "menu.item.pw": "Độ rộng xung PW",
  "menu.item.subGain": "Tinh chỉnh SUB GAIN",
  "menu.item.presentationMode": "Chế độ hướng",
  "menu.item.motionMode": "Chế độ chuyển động",
  "menu.item.screenMode": "Hệ hiển thị",
  "menu.item.offCenter": "Lệch tâm OFF CENT",
  "menu.item.trailMode": "Kiểu vệt (R/T)",
  "menu.item.trailTime": "Thời gian vệt",
  "menu.item.colorPalette": "Bảng màu LCD",
  "menu.item.piLine": "Đường song song PI",
  "menu.item.brgMode": "Hệ phương vị (T/R)",
  "menu.item.vectorMode": "Hệ véc-tơ (T/R)",
  "menu.item.ebl1": "Tia phương vị EBL1",
  "menu.item.ebl2": "Tia phương vị EBL2",
  "menu.item.vrm1": "Vòng cự ly VRM1",
  "menu.item.vrm2": "Vòng cự ly VRM2",
  "menu.item.ebl1Float": "Gốc trượt EBL1",
  "menu.item.alarmMode": "Chế độ vùng",
  "menu.item.alarmInnerNm": "Bán kính trong",
  "menu.item.alarmOuterNm": "Bán kính ngoài",
  "menu.item.alarmStartBrgDeg": "Góc bắt đầu",
  "menu.item.alarmEndBrgDeg": "Góc kết thúc",
  "menu.item.alarmLevel": "Mức nhạy báo động",
  "menu.item.ataAcq": "Bắt mục tiêu (ACQ)",
  "menu.item.ataDel": "Xóa mục tiêu (DEL)",
  "menu.item.ataDelAll": "Xóa tất cả ATA",
  "menu.item.ataAutoArea": "Vùng tự động bắt",
  "menu.item.ataCpaLimitNm": "Giới hạn CPA",
  "menu.item.ataTcpaLimitMin": "Giới hạn TCPA",
  "menu.item.ataVectorTimeMin": "Thời gian véc-tơ",
  "menu.item.ataPastPos": "Vị trí quá khứ",
  "menu.item.aisDisplay": "Hiển thị AIS",
  "menu.item.aisFilterRangeNm": "Bán kính lọc AIS",
  "menu.item.aisInfo": "Chi tiết tàu AIS",
  "menu.item.aisCpaAlarm": "Báo động CPA AIS",
  "menu.item.sleepMode": "Chế độ ngủ tiết kiệm",
  "menu.item.sleepIntervalMin": "Chu kỳ ngủ",
  "menu.item.openSystemMenu": "Mở Menu Hệ thống",

  // System menu items
  "menu.item.rings": "Vòng cự ly cố định",
  "menu.item.rangeUnit": "Đơn vị cự ly",
  "menu.item.motorRpm": "Tốc độ quay ăng-ten",
  "menu.item.buzzer": "Còi phím & báo động",
  "menu.item.cursorShape": "Kiểu con trỏ",
  "menu.item.language": "Ngôn ngữ",
  "menu.item.stcCurve": "Đường cong STC",
  "menu.item.brgAdjDeg": "Hiệu chỉnh phương vị",
  "menu.item.tuneMode": "Chỉnh cộng hưởng TUNE",
  "menu.item.f1Key": "Gán phím F1",
  "menu.item.f2Key": "Gán phím F2",
  "menu.item.demoAllReset": "Đặt lại mặc định",
  "menu.item.panelTest": "Kiểm tra mặt phím",
  "menu.item.lcdTest": "Kiểm tra màn hình LCD",
  "menu.item.txHours": "Tổng giờ phát TX",

  // Choice values
  "choice.OFF": "TẮT",
  "choice.ON": "BẬT",
  "choice.AUTO": "TỰ ĐỘNG",
  "choice.MAN": "THỦ CÔNG",
  "choice.LOW": "THẤP",
  "choice.MID": "TRUNG BÌNH",
  "choice.HIGH": "CAO",
  "choice.R": "Tương đối (R)",
  "choice.T": "Thật (T)",
  "choice.CONT": "LIÊN TỤC",
  "choice.CROSS": "CHỮ THẬP",
  "choice.SMALL": "NHỎ",
  "choice.FULL": "TOÀN MÀN",
  "choice.AVG1": "TB1 (AVG1)",
  "choice.AVG2": "TB2 (AVG2)",
  "choice.PEAK": "ĐỈNH (PEAK)",
  "choice.IN": "XÂM NHẬP",
  "choice.OUT": "RỜI VÙNG",
  "choice.en": "Tiếng Anh",
  "choice.vi": "Tiếng Việt",
  "choice.NM": "NM",
  "choice.km": "km",
  "choice.sm": "sm",
  "choice.15s": "15 giây",
  "choice.30s": "30 giây",
  "choice.1m": "1 phút",
  "choice.3m": "3 phút",
  "choice.5m": "5 phút",
  "choice.6m": "6 phút",
  "choice.10m": "10 phút",
  "choice.15m": "15 phút",
  "choice.30m": "30 phút",
  "choice.24": "24 vòng/phút",
  "choice.48": "48 vòng/phút",
  "choice.S1": "S1",
  "choice.S2": "S2",
  "choice.M1": "M1",
  "choice.M2": "M2",
  "choice.L": "L",
  "choice.1": "1",
  "choice.2": "2",
  "choice.3": "3",
  "choice.4": "4",

  // F-key presets
  "fkey.EBL1_VRM1": "EBL1/VRM1",
  "fkey.ATA_ACQ": "Bắt ATA",
  "fkey.MODE_CYCLE": "Đổi hướng",
  "fkey.SCREEN_CYCLE": "Đổi màn hình",
  "fkey.OFF_CENTER": "Lệch tâm",
  "fkey.TRAIL_TOGGLE": "Bật/tắt vệt",
  "fkey.FTC_STEP": "Chỉnh FTC",
  "fkey.IR_STEP": "Chỉnh IR",
  "fkey.AIS_TOGGLE": "Bật/tắt AIS",
  "fkey.ALARM_TOGGLE": "Vùng cảnh giới",
  "fkey.COLOR_CYCLE": "Đổi bảng màu",
  "fkey.ALARM_ACK": "Tắt còi",

  // Alarms
  "alarm.cpaDanger": "BÁO ĐỘNG VA CHẠM ATA",
  "alarm.aisCpaDanger": "BÁO ĐỘNG VA CHẠM AIS",
  "alarm.guardIn": "XÂM NHẬP VÙNG CẢNH GIỚI",
  "alarm.guardOut": "RỜI KHỎI VÙNG CẢNH GIỚI",
  "alarm.ataLost": "MẤT MỤC TIÊU ATA",
  "alarm.ataMaxCap": "ĐẦY BỘ NHỚ ATA (50)",
  "alarm.ataBoardMissing": "KHÔNG CÓ BO ATA (MRE-340)",
  "alarm.aisBoardMissing": "KHÔNG CÓ CỔNG AIS",
  "alarm.ackHint": "NHẤN XÁC NHẬN ĐỂ TẮT CÒI",

  // Sensor faults
  "fault.hdgNoSignal": "MẤT TÍN HIỆU LA BÀN (HDG)",
  "fault.gpsNoSignal": "MẤT TÍN HIỆU GPS",
  "fault.spdNoSignal": "MẤT TÍN HIỆU TỐC ĐỘ",
  "fault.llNoSignal": "MẤT TÍN HIỆU GPS (L/L)",
  "fault.sensorOk": "CẢM BIẾN ỔN ĐỊNH",

  // ATA & AIS target statuses
  "ataStatus.acquiring": "Đang bắt",
  "ataStatus.tracking": "Đang bám",
  "ataStatus.lost": "Mất mục tiêu",
  "aisStatus.sleeping": "Ngủ",
  "aisStatus.active": "Kích hoạt",
  "aisStatus.dangerous": "Nguy hiểm",

  // D15 Instructor console (5 tabs & toolbar)
  "d15.focusDevice": "Tập trung vào máy",
  "d15.audioOn": "Loa máy: BẬT",
  "d15.audioOff": "Loa máy: TẮT",
  "d15.fullscreen": "Toàn màn hình",
  "d15.langToggle": "VI / EN",
  "d15.tabSession": "Phiên & Tàu mình",
  "d15.tabWeather": "Thời tiết & Nguồn",
  "d15.tabArpaNmea": "ATA / AIS & NMEA",
  "d15.tabLessons": "Bài học (7)",
  "d15.tabSettings": "Cấu hình & Replay",
  "d15.scenario": "Kịch bản huấn luyện",
  "d15.pause": "Tạm dừng",
  "d15.resume": "Tiếp tục",
  "d15.step1s": "+1 giây",
  "d15.reset": "Đặt lại",
  "d15.verifyReplay": "Kiểm tra Replay",
  "d15.ownshipHelm": "Điều khiển tàu mình",
  "d15.applyOwnship": "Áp dụng tàu mình",
  "d15.fastPreheat": "Sấy nhanh huấn luyện (5 giây)",
  "d15.skipPreheat": "Bỏ qua sấy",
  "d15.rotaryAssist": "Trợ xoay GAIN / STC / FTC",
  "d15.seaState": "Trạng thái biển (0–6)",
  "d15.rainIntensity": "Cường độ mưa (0–100%)",
  "d15.interference": "Nhiễu radar lân cận",
  "d15.sensorFaults": "Giả lập mất cảm biến & bo tùy chọn",
  "d15.headingSensor": "Cảm biến la bàn (HDG)",
  "d15.gpsSensor": "Cảm biến GPS (L/L)",
  "d15.speedSensor": "Cảm biến tốc độ (SPD)",
  "d15.ataBoard": "Bo tùy chọn ATA (MRE-340)",
  "d15.aisBoard": "Cổng tùy chọn AIS",
  "d15.ataList": "Danh sách mục tiêu ATA",
  "d15.aisList": "Danh sách mục tiêu AIS",
  "d15.nmeaFeed": "Luồng câu NMEA-0183 sống",
  "d15.bridgeSync": "Đồng bộ buồng lái FCV-588",
  "d15.bridgeDepth": "Độ sâu đáy biển dùng chung",
  "d15.acquireBtn": "Bắt mục tiêu ATA",
  "d15.deleteAllBtn": "Xóa tất cả ATA",
  "d15.lessonSelect": "Chọn bài học",
  "d15.startLesson": "Bắt đầu bài học",
  "d15.gradeLesson": "Chấm điểm bài học",
  "d15.lessonPassed": "ĐẠT",
  "d15.lessonFailed": "CHƯA ĐẠT",
  "d15.exportSettings": "Xuất cấu hình JSON",
  "d15.importSettings": "Nạp cấu hình JSON",
  "d15.exportReplay": "Xuất tệp Replay",
  "d15.importReplay": "Kiểm chứng Replay",
  "d15.disclaimerTitle": "THAM CHIẾU CÔNG KHAI / CHƯA KIỂM ĐỊNH PHẦN CỨNG / CHỈ DÙNG HUẤN LUYỆN",
  "d15.disclaimerBody": "Bộ mô phỏng huấn luyện tất định cho KODEN MDC-2060. Không kết nối cảm biến tàu thật và không dùng cho điều khiển hành hải.",
});

export const MDC2060_I18N_KEYS = Object.freeze(Object.keys(DICT_EN).sort());
export const MDC2060_I18N_VI_KEYS = Object.freeze(Object.keys(DICT_VI).sort());

const CHOICE_KEY_PREFIXES = Object.freeze(["choice.", "mode.", "palette.", "fkey."]);

export function resolveMdc2060Lang(langOrState) {
  let raw = langOrState;
  if (raw && typeof raw === "object") {
    raw = raw.language ?? raw.settings?.language ?? "en";
  }
  return raw === "vi" ? "vi" : "en";
}

export function isVietnameseMdc2060(langOrState) {
  return resolveMdc2060Lang(langOrState) === "vi";
}

/**
 * Strict prototype-safe key presence check on ONLY the requested language
 * dictionary ("en" or "vi") with NO fallback across languages.
 */
export function hasMdc2060Key(lang, key) {
  if (typeof key !== "string" || key.length === 0) return false;
  if (lang === "en") return Object.hasOwn(DICT_EN, key);
  if (lang === "vi") return Object.hasOwn(DICT_VI, key);
  return false;
}

export function tMdc2060(lang, key, fallback) {
  const safeLang = resolveMdc2060Lang(lang);
  if (typeof key !== "string" || key.length === 0) {
    return fallback !== undefined ? String(fallback) : "";
  }
  const dict = safeLang === "vi" ? DICT_VI : DICT_EN;
  if (Object.hasOwn(dict, key)) return dict[key];
  if (safeLang !== "en" && Object.hasOwn(DICT_EN, key)) return DICT_EN[key];
  return fallback !== undefined ? String(fallback) : key;
}

export function localizeMdc2060MenuGroup(groupId, langOrState) {
  const raw = String(groupId ?? "");
  return tMdc2060(langOrState, `menu.group.${raw}`, raw);
}

export function localizeMdc2060MenuItem(itemKey, langOrState, fallback) {
  const raw = String(itemKey ?? "");
  return tMdc2060(langOrState, `menu.item.${raw}`, fallback !== undefined ? fallback : raw);
}

export function localizeMdc2060Choice(value, langOrState) {
  const raw = value === null || value === undefined ? "" : String(value);
  if (raw.length === 0) return "--";
  const safeLang = resolveMdc2060Lang(langOrState);
  const activeDict = safeLang === "vi" ? DICT_VI : DICT_EN;
  for (let i = 0; i < CHOICE_KEY_PREFIXES.length; i++) {
    const k = `${CHOICE_KEY_PREFIXES[i]}${raw}`;
    if (Object.hasOwn(activeDict, k)) return activeDict[k];
  }
  if (safeLang !== "en") {
    for (let i = 0; i < CHOICE_KEY_PREFIXES.length; i++) {
      const k = `${CHOICE_KEY_PREFIXES[i]}${raw}`;
      if (Object.hasOwn(DICT_EN, k)) return DICT_EN[k];
    }
  }
  return raw;
}

export function localizeMdc2060PowerMode(powerMode, langOrState) {
  const raw = String(powerMode ?? "");
  return tMdc2060(langOrState, `power.${raw}`, raw);
}

export function localizeMdc2060Alarm(alarmKey, langOrState) {
  const raw = String(alarmKey ?? "");
  return tMdc2060(langOrState, `alarm.${raw}`, raw);
}
