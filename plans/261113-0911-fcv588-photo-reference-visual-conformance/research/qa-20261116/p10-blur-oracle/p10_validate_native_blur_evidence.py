from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime
from pathlib import Path


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
OUT_DIR = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261116/p10-blur-oracle"
)

SOURCE_SHA256 = {
    "web/hold-input.mjs": "2d2f13800e77f1b01eadf3808c935d4bc0f3b78cf24f42aeb5cf14275de2d086",
    "web/pad-repeat.mjs": "92b6ee102910dfb9f17430a0691b6f365412ddbe879ad2ed28508616f86568ad",
    "web/rotary-input.mjs": "cb314d842ce046137892c66b5799b3b852786b33ceb354032511949c9be01ddc",
    "web/keyboard-shortcuts.mjs": "f80cb8558844703fa9ac0e9b4a4cf29a558164d3f738e083f36b9aa644052ddb",
    "web/instructor-tabs.mjs": "0cb956f9b940f619468c3cf6c31e8d4fcad1758054c35ac1df839c2da26b5800",
    "test/hold-input.test.mjs": "22387a216648038f06f2174a0621b0058d3696fc1f05ecb2aa1cd0e87ce00bc4",
    "test/fcv588-public-pad-repeat.test.mjs": "1ea324d2162e4a11627e8b37183ac4d334e320b1a6411a55392afe6e59a47283",
    "test/fcv588-public-rotary-input.test.mjs": "ca97631c6fee008c23bfe0985394ca41daba5dbc5491d9eed82bfb352940cd9a",
    "test/fcv588-device-focus.test.mjs": "cfc5aff3ee1f835cceb2c91ff37dcd04f8097674acf2bf3803af398623856250",
}
P09_PATH = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261116/p09-geometry-qa/P09_DETERMINISTIC_HOMOGRAPHY_QA_20261116.json"
)
P09_SHA256 = "7e41f688ba684df7aa9720745d665bec323f1f96c7d3a512901563d600571aab"
P07_FINAL_PATH = ROOT / r"docs\qa\FCV588_P07_BOUNDED_20261116\FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json"
P07_FINAL_SHA256 = "024dd1d75c7879fe0df88f939739d854a40aa819a459b6e1fbebd186aca91726"

EXPECTED_TABS = [
    "d15-tab-session",
    "d15-tab-help",
    "d15-tab-fixtures",
    "d15-tab-lessons",
    "d15-tab-sources",
]
EXPECTED_PANELS = [
    "d15-panel-session",
    "d15-panel-help",
    "d15-panel-fixtures",
    "d15-panel-lessons",
    "d15-panel-sources",
]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(ok: bool, message: str) -> None:
    if not ok:
        raise RuntimeError(message)


def write_once(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    blob = (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(blob)


def verify_live_sources() -> list[dict]:
    rows = []
    for rel, expected in SOURCE_SHA256.items():
        path = ROOT / rel
        require(path.is_file(), "missing bound source: " + rel)
        actual = sha(path)
        require(actual == expected, f"source drift {rel}: {actual} != {expected}")
        rows.append({"path": rel, "sha256": actual})
    require(sha(P09_PATH) == P09_SHA256, "sealed P09 drift")
    require(sha(P07_FINAL_PATH) == P07_FINAL_SHA256, "P07 final integrity drift")
    return rows


def verify_provenance(evidence: dict) -> dict:
    provenance = evidence.get("provenance", {})
    require(provenance.get("jsDispatchEventUsed") is False,
            "evidence declares JS dispatchEvent usage")
    require(provenance.get("playwrightDispatchEventUsed") is False,
            "evidence declares page.dispatchEvent/locator.dispatchEvent usage")
    require(provenance.get("windowBlurCalledFromPageJS") is False,
            "evidence declares page-side window.blur() usage")
    require(provenance.get("osForegroundObserved") is True,
            "OS foreground provenance missing")
    require(provenance.get("browserListenersWereObservationOnly") is True,
            "browser instrumentation was not declared observation-only")
    return provenance


def event_of_type(events: list[dict], event_type: str) -> dict:
    matches = [row for row in events if row.get("type") == event_type]
    require(len(matches) == 1, f"expected exactly one {event_type} event, got {len(matches)}")
    return matches[0]


def verify_power_blur(evidence: dict) -> dict:
    section = evidence.get("powerBlur", {})
    baseline = section.get("sessionBeforeCount")
    require(isinstance(baseline, int) and baseline >= 0, "invalid power session baseline")

    os_focus = section.get("osForeground", {})
    chrome_pid = os_focus.get("qaChromePid")
    before = os_focus.get("before", {})
    away = os_focus.get("duringBlur", {})
    after = os_focus.get("afterRefocus", {})
    require(isinstance(chrome_pid, int) and chrome_pid > 0, "QA Chrome PID missing")
    require(before.get("pid") == chrome_pid and after.get("pid") == chrome_pid,
            "Chrome was not foreground both before and after refocus")
    require(isinstance(away.get("pid"), int) and away.get("pid") > 0 and away.get("pid") != chrome_pid,
            "foreground did not move away from QA Chrome")
    require(before.get("hwnd") != away.get("hwnd") and after.get("hwnd") != away.get("hwnd"),
            "foreground HWND did not change away from Chrome")

    browser_events = section.get("browserEvents", [])
    require(isinstance(browser_events, list) and browser_events, "power browser events missing")
    activation = event_of_type(browser_events, "power-activation")
    blur = event_of_type(browser_events, "window-blur")
    focus = event_of_type(browser_events, "window-focus")
    for row, label in ((activation, "activation"), (blur, "window blur"), (focus, "window focus")):
        require(row.get("isTrusted") is True, f"{label} event is not trusted")
        require(isinstance(row.get("performanceNowMs"), (int, float)), f"{label} timestamp missing")
    require(activation.get("targetId") == "key-power", "POWER activation target mismatch")
    require(activation.get("domType") in ("pointerdown", "keydown"), "POWER activation must be real pointerdown/keydown")
    require(activation.get("documentHasFocus") is True, "page did not have focus at POWER activation")
    require(blur.get("documentHasFocus") is False, "document.hasFocus() was not false at blur observation")
    require(focus.get("documentHasFocus") is True, "document.hasFocus() was not true at refocus")
    require(activation["performanceNowMs"] < blur["performanceNowMs"] < focus["performanceNowMs"],
            "POWER activation/blur/refocus timestamps are not monotonic")
    held_ms = blur["performanceNowMs"] - activation["performanceNowMs"]
    require(50 <= held_ms < 3000,
            f"blur must occur during a bounded pre-long-threshold POWER hold, got {held_ms} ms")

    canonical = section.get("canonicalEventsSinceBaseline", [])
    require(len(canonical) == 2, "POWER blur must produce exactly down,cancel canonical events")
    down, cancel = canonical
    require(down.get("seq") == baseline + 1 and down.get("kind") == "down" and down.get("control") == "power",
            "first POWER canonical event is not seq+1 down")
    require(cancel.get("seq") == baseline + 2 and cancel.get("kind") == "cancel" and cancel.get("control") == "power",
            "second POWER canonical event is not seq+2 cancel")
    require("durationMs" not in cancel, "cancel must not carry durationMs")
    require(not any(row.get("kind") == "up" and row.get("control") == "power" for row in canonical),
            "POWER blur evidence contains an up/release event")

    pre = section.get("preBlurState", {})
    post_blur = section.get("postBlurState", {})
    post_focus = section.get("postRefocusState", {})
    require(pre.get("pressing") is True and pre.get("heldPower") is True and
            pre.get("devicePower") == "on" and pre.get("overlayKind") == "power-hold",
            "pre-blur state does not prove active POWER hold")
    require(post_blur.get("pressing") is False and post_blur.get("heldPower") is False and
            post_blur.get("devicePower") == "on" and post_blur.get("notice") == "POWER HOLD CANCELLED",
            "post-blur state did not cancel POWER hold without powering off")
    require(post_focus.get("pressing") is False and post_focus.get("heldPower") is False and
            post_focus.get("devicePower") == "on" and post_focus.get("documentHasFocus") is True,
            "post-refocus state is not clean/focused/powered-on")
    require(post_focus.get("sessionEventCount") == baseline + 2,
            "refocus itself must not append a simulator event")
    require(section.get("freshHoldAfterRefocus", {}).get("status") == "PASS",
            "fresh POWER interaction after refocus was not proven usable")
    return {"status": "PASS", "heldBeforeBlurMs": held_ms,
            "canonicalPair": ["down", "cancel"], "qaChromePid": chrome_pid}


def verify_d15(evidence: dict) -> dict:
    section = evidence.get("d15Keyboard", {})
    baseline = section.get("sessionBeforeCount")
    after_count = section.get("sessionAfterCount")
    require(isinstance(baseline, int) and baseline >= 0 and after_count == baseline,
            "D15 traversal must not append FCV session events")
    require(section.get("tabCount") == 5, "D15 must expose exactly five tabs")
    require(section.get("tabsReady") is True, "D15 enhancement readiness missing")

    key_events = section.get("keyEvents", [])
    require(len(key_events) == 4, "D15 oracle expects four ArrowRight transitions")
    states = section.get("states", [])
    require(len(states) == 5, "D15 oracle expects initial + four resulting states")

    for index, state in enumerate(states):
        expected_tab = EXPECTED_TABS[index]
        expected_panel = EXPECTED_PANELS[index]
        require(state.get("activeElementId") == expected_tab, f"D15 activeElement mismatch at state {index}")
        require(state.get("selectedTabIds") == [expected_tab], f"D15 aria-selected mismatch at state {index}")
        require(state.get("visiblePanelIds") == [expected_panel], f"D15 visible panel mismatch at state {index}")
        tab_indices = state.get("tabIndexById", {})
        require(set(tab_indices) == set(EXPECTED_TABS), f"D15 tabindex map incomplete at state {index}")
        for tab_id in EXPECTED_TABS:
            expected_index = 0 if tab_id == expected_tab else -1
            require(tab_indices.get(tab_id) == expected_index,
                    f"D15 roving tabindex mismatch for {tab_id} at state {index}")

    for index, event in enumerate(key_events):
        require(event.get("domType") == "keydown" and event.get("key") == "ArrowRight",
                f"D15 key event {index} is not ArrowRight keydown")
        require(event.get("isTrusted") is True and event.get("repeat") is False,
                f"D15 key event {index} lacks trusted non-repeat provenance")
        require(event.get("targetId") == EXPECTED_TABS[index],
                f"D15 key target mismatch at transition {index}")
        require(event.get("defaultPreventedAfterHandler") is True,
                f"D15 ArrowRight was not preventDefault-owned at transition {index}")
        require(event.get("fcvShortcutWouldRoute") is False,
                f"D15 key unexpectedly qualifies for FCV global shortcut routing at transition {index}")
    require(section.get("operatorEventDelta") == 0,
            "D15 traversal leaked operator/simulator events")
    return {"status": "PASS", "sequence": EXPECTED_TABS,
            "sessionEventDelta": after_count - baseline}


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate already-captured native OS blur/D15 evidence; never drives UI")
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    require(args.out.parent.resolve() == OUT_DIR.resolve(), "--out must be directly under p10-blur-oracle")
    require(not args.out.exists(), "validator output already exists")
    evidence = json.loads(args.evidence.read_text(encoding="utf-8"))
    require(evidence.get("schema") == "fcv588-p10-native-os-event-evidence-v1", "unexpected evidence schema")
    source_rows = verify_live_sources()
    provenance = verify_provenance(evidence)
    power = verify_power_blur(evidence)
    d15 = verify_d15(evidence)
    payload = {
        "schema": "fcv588-p10-native-os-event-validation-v1",
        "createdAt": datetime.now().astimezone().isoformat(),
        "status": "PASS_NATIVE_EVENT_ORACLE",
        "inputEvidence": {"path": str(args.evidence), "sha256": sha(args.evidence)},
        "sourceBindings": source_rows,
        "p09": {"path": str(P09_PATH), "sha256": P09_SHA256, "physicalTruth": "HOLD"},
        "p07Final": {"path": str(P07_FINAL_PATH), "sha256": P07_FINAL_SHA256},
        "provenance": provenance,
        "powerBlur": power,
        "d15Keyboard": d15,
        "limits": [
            "This validator validates supplied event/OS-foreground evidence; it does not create native events itself.",
            "Event.isTrusted alone is not accepted as OS blur proof; Windows foreground PID/HWND transition is also required.",
            "Synthetic unit tests remain source-contract evidence only and cannot satisfy the native blur oracle.",
            "No Narrator/NVDA/forced-colors/OEM physical or rights claim is created by PASS_NATIVE_EVENT_ORACLE."
        ],
        "operations": {"browserStarted": False, "desktopControlled": False,
                       "serverTouched": False, "runtimeEdited": False,
                       "resultWriteOnce": True},
    }
    write_once(args.out, payload)
    print(json.dumps({"status": payload["status"], "out": str(args.out),
                      "sha256": sha(args.out)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
