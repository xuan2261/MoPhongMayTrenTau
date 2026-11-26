/**
 * KODEN MDC-2060 (MRD-104 / RB717A) Marine Radar — Deeply Frozen Device Adapter.
 *
 * PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY.
 */
import {
  MDC2060_PROFILE,
  initialMdc2060State,
  reduceMdc2060,
  probeMdc2060,
} from "./model.mjs";
import { MDC2060_ID, MDC2060_PROFILE_REVISION, MDC2060_RADAR_SPECS } from "./spec.mjs";

export const MDC2060_ADAPTER = Object.freeze({
  id: MDC2060_ID,
  revision: MDC2060_PROFILE_REVISION,
  profile: MDC2060_PROFILE,
  controls: Object.freeze([
    "power",
    "ent",
    "menu",
    "stby_tx",
    "range_up",
    "range_down",
    "sub_range_up",
    "sub_range_down",
    "f1",
    "f2",
    "alarm_ack",
    "gain",
    "stc",
    "cursorpad",
    "ppi_cursor",
    "inst_sea_state",
    "inst_rain",
    "inst_ftc",
  ]),
  holdThresholdMs: Object.freeze({
    power: MDC2060_RADAR_SPECS.holdThresholdMs.power,
    ent: MDC2060_RADAR_SPECS.holdThresholdMs.ent,
    menu: MDC2060_RADAR_SPECS.holdThresholdMs.menu,
  }),
  fixtures: Object.freeze([
    "fastPreheat",
    "skipPreheat",
    "ataBoardOption",
    "aisBoardOption",
    "headingSensor",
    "gpsSensor",
    "speedSensor",
    "interferenceSource",
  ]),
  gestures: Object.freeze({
    power: Object.freeze(["down", "up", "cancel"]),
    ent: Object.freeze(["down", "up", "cancel"]),
    menu: Object.freeze(["down", "up", "cancel"]),
    stby_tx: Object.freeze(["press"]),
    range_up: Object.freeze(["press"]),
    range_down: Object.freeze(["press"]),
    sub_range_up: Object.freeze(["press"]),
    sub_range_down: Object.freeze(["press"]),
    f1: Object.freeze(["press"]),
    f2: Object.freeze(["press"]),
    alarm_ack: Object.freeze(["press"]),
    gain: Object.freeze(["rotate", "analog"]),
    stc: Object.freeze(["rotate", "analog"]),
    cursorpad: Object.freeze(["pad"]),
    ppi_cursor: Object.freeze(["pointer", "touch"]),
    inst_sea_state: Object.freeze(["analog"]),
    inst_rain: Object.freeze(["analog"]),
    inst_ftc: Object.freeze(["analog"]),
  }),
  initial: initialMdc2060State,
  reduce: reduceMdc2060,
  probe: probeMdc2060,
});
