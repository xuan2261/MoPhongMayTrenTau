"""Short-lived P11 witness window: proves desktop tool can foreground owned HWND."""
import datetime
import json
import os
from pathlib import Path
import time
import tkinter as tk

import win32gui

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p11-os-focus"
QA.mkdir(parents=True,exist_ok=True)
stamp=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat()
previous=win32gui.GetForegroundWindow()
app=tk.Tk()
app.title("P11-OWNED-WIN32-FOREGROUND-WITNESS")
app.geometry("460x180+130+110")
tk.Label(app,text="FCV588 — P11 foreground test-owned window").pack(pady=10)
app.update()
hwnd=app.winfo_id()
print(json.dumps({"status":"WINDOW_READY","pid":os.getpid(),"ownHwnd":hwnd,
    "ownTitle":win32gui.GetWindowText(hwnd),"previousForeground":previous,
    "previousTitle":win32gui.GetWindowText(previous),"startedAt":stamp}),flush=True)
start=time.monotonic()
try:
    while time.monotonic()-start<35:
        app.update()
        time.sleep(0.08)
finally:
    try:app.destroy()
    except Exception:pass
    print(json.dumps({"status":"WINDOW_CLOSED","pid":os.getpid(),"ownHwnd":hwnd}),flush=True)
