import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createSession, dispatch, replay, createReplayEnvelope, sessionHash} from "../src/core/session.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {projectFcvAlarmPresentation} from "../web/lcd-presentation.mjs";
import {
  classifyFcvHardwareSound,
  createFcvHardwareBuzzer,
} from "../web/key-feedback.mjs";

const send = (s, ev) => dispatch(s, adapter, ev, scenario);

test("classifyFcvHardwareSound distinguishes power-on, power-off, key beep, rotary detent, §1.18 audible alarm, and speaker mute", () => {
  const s0 = createSession(adapter, scenario);
  const sDown = send(s0, {kind: "down", control: "power"});
  const sBoot = send(sDown, {kind: "up", control: "power", durationMs: 120});

  assert.equal(
    classifyFcvHardwareSound(sDown.deviceState, sBoot.deviceState, {kind: "up", control: "power", durationMs: 120}, null),
    "power-on",
  );
  assert.equal(
    classifyFcvHardwareSound(sDown.deviceState, sBoot.deviceState, {kind: "up", control: "power", durationMs: 120}, null, {speakerEnabled: false}),
    null,
  );

  const sOn = send(sBoot, {kind: "tick", steps: 4});
  const sMenu = send(sOn, {kind: "press", control: "menu"});
  assert.equal(
    classifyFcvHardwareSound(sOn.deviceState, sMenu.deviceState, {kind: "press", control: "menu"}, null),
    "tactile",
    "Key Beep Off plays quiet mechanical switch click",
  );
  const sKeyBeepOn = {
    ...sMenu.deviceState,
    settings: {...sMenu.deviceState.settings, keyBeep: "On"},
  };
  assert.equal(
    classifyFcvHardwareSound(sOn.deviceState, sKeyBeepOn, {kind: "press", control: "menu"}, null),
    "key",
    "Key Beep On plays authentic 2420Hz FURUNO piezo beep",
  );

  const sRot = send(sOn, {kind: "rotate", control: "gain", steps: 1});
  assert.equal(
    classifyFcvHardwareSound(sOn.deviceState, sRot.deviceState, {kind: "rotate", control: "gain", steps: 1}, null),
    "detent",
  );

  // Trigger audible Bottom Alarm (alarm5 defaults to Bottom 20..100m; restore while powered off)
  let sAlarm = send(s0, {
    kind: "restore-settings",
    settings: {...s0.deviceState.settings, alarm5: "On"},
  });
  sAlarm = send(sAlarm, {kind: "down", control: "power"});
  sAlarm = send(sAlarm, {kind: "up", control: "power", durationMs: 120});
  const sAlarmOn = send(sAlarm, {kind: "tick", steps: 4});
  const sTriggered = send(sAlarmOn, {kind: "tick", steps: 1});
  const alarmView = projectFcvAlarmPresentation(sTriggered.deviceState);
  assert.equal(alarmView.audible, true);
  assert.equal(
    classifyFcvHardwareSound(sAlarmOn.deviceState, sTriggered.deviceState, {kind: "tick", steps: 1}, alarmView),
    "alarm",
  );

  // Manual §1.18: pressing any physical key acknowledges and silences audible alarm on subsequent ticks
  const sAck = send(sTriggered, {kind: "press", control: "enter"});
  const ackView = projectFcvAlarmPresentation(sAck.deviceState);
  assert.equal(ackView.audible, false);
  const sNextTick = send(sAck, {kind: "tick", steps: 1});
  assert.equal(
    classifyFcvHardwareSound(sAck.deviceState, sNextTick.deviceState, {kind: "tick", steps: 1}, projectFcvAlarmPresentation(sNextTick.deviceState)),
    null,
  );

  // Power off (>3s hold) emits power-off sound and leaves replay hashes untouched
  const sHold = send(sNextTick, {kind: "down", control: "power"});
  const sOff = send(sHold, {kind: "up", control: "power", durationMs: 3200});
  assert.equal(
    classifyFcvHardwareSound(sHold.deviceState, sOff.deviceState, {kind: "up", control: "power", durationMs: 3200}, null),
    "power-off",
  );
  assert.equal(sessionHash(replay(adapter, scenario, createReplayEnvelope(sOff))), sessionHash(sOff));
});

test("createFcvHardwareBuzzer synthesizes multi-pulse Web Audio envelopes lazily and fails safely without audio hardware", () => {
  let contextsCreated = 0;
  const scheduled = [];
  const fakeContext = {
    currentTime: 10,
    state: "suspended",
    destination: {},
    resumed: 0,
    resume() {
      this.resumed++;
      this.state = "running";
      return Promise.resolve();
    },
    createOscillator() {
      const osc = {
        type: "sine",
        frequency: {value: 0},
        connect() {},
        start(t) { osc.startAt = t; },
        stop(t) { osc.stopAt = t; scheduled.push(osc); },
      };
      return osc;
    },
    createGain() {
      return {
        gain: {setValueAtTime() {}, exponentialRampToValueAtTime() {}},
        connect() {},
      };
    },
  };

  const buzzer = createFcvHardwareBuzzer({
    createAudioContext() {
      contextsCreated++;
      return fakeContext;
    },
  });
  assert.equal(contextsCreated, 0, "lazy AudioContext creation only on user sound");
  assert.equal(buzzer.play("power-on"), true);
  assert.equal(contextsCreated, 1);
  assert.equal(fakeContext.resumed, 1);
  assert.equal(scheduled.length, 2, "power-on plays dual FURUNO pip");

  assert.equal(buzzer.play("alarm"), true);
  assert.equal(scheduled.length, 4, "alarm plays intermittent double pulse");
  assert.equal(buzzer.play("unknown"), false);

  const blocked = createFcvHardwareBuzzer({
    createAudioContext() { throw new Error("audio blocked"); },
  });
  assert.equal(blocked.play("key"), false);
});

test("Workspace toolbar exposes #btn-audio-toggle without polluting initial localStorage or device-frame controls", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../web/app.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="btn-audio-toggle"[^>]*aria-pressed="true"[^>]*>Loa máy: BẬT<\/button>/);
  assert.match(app, /hardwareBuzzer\.play\(soundKind\)/);
  assert.match(app, /\$\("btn-audio-toggle"\)\?\.addEventListener\("click"/);
});
