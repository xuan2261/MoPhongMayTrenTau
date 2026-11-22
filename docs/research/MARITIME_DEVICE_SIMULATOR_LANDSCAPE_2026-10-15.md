# Maritime training simulators — source and repository landscape (2026-10-15)

This supplements, and does **not replace**, the active FCV-588 v2 plan,
the source-manual archive, or the frozen Phase 1 evidence ledger. It uses
already-accounted official/historical manuals plus bounded public repository
metadata. It does **not** authorize manufacturer media reproduction, source
code imports, new device variants, chart licenses or hardware connection.

## Current archived source coverage and relative workload

The following is an **engineering workload estimate**, not an OEM fidelity
rating, ranking of navigational safety, or source-supported accuracy score.
Only FCV-588 has an implemented PUBLIC_REFERENCE training interface.

| Requested instrument | Actual currently owned source/identity | Relative offline simulator workload | Admission boundary |
| --- | --- | --- | --- |
| FURUNO FCV-588 | OME-23890-E and manufacturer's product/support evidence archived; 480×640 portrait LCD and physical keys independently drawn; profile F1 public | Medium: discrete control/sonar projection, complex capability/position/trip/alarms | Installed firmware, physical transducer, Tankenmaru option, measured panel/hardware response and redistribution rights UNKNOWN |
| FURUNO FAR-2127 | Manufacturer operator manual and guide archived | Very high: radar PPI/tracks, collision alarm/MARPA/trails, control and timing/heading source | RCU-014 versus RCU-015, installed firmware, actual source signal and redistribution rights UNKNOWN |
| KODEN MDC-2060 | MDC-2000 Rev14, Rev15 and quick reference archived | High: radar scan/targets, orientation, guard zones, control version and radar appearance | Unit-specific revision/controller not selected; KODEN restrictions on AI processing/redistribution remain HOLD |
| Navi-Sailor 4000 / NS4000 | Historical v2.00.009 archived; v3.02.350 only public viewer metadata | Very high: ECDIS chart data/ENC rights, safety contours, voyage monitoring, version-specific UI | Target version unknown; v2 evidence cannot be asserted to represent v3; current authorized v3 source not acquired |
| KODEN J2000 | Exact identity NOT VERIFIED, no matched manual | **Not estimable** responsibly until identity resolved | Never relabel a different sounder/radar model as J2000 |
| AIS R5 (context only) | Separate SUPREME and SOLID candidate packages | High after identity selection: safety-critical message and display state | Variant unknown, NO operator UI, NO AIS TX or real NMEA interface |

Primary evidence ledger: sources/manuals/ARCHIVE_COVERAGE.json
(ACCOUNTED_WITH_HOLDS), sources/manuals/MANIFEST.json,
sources/manuals/VERIFICATION_RECEIPT.json and
docs/evidence/device-register.json. The manual verifier reported
24 valid PDFs and two ZIP packages with no local digest failures at
2026-10-15; incomplete/denied references remain listed as gaps.
The exact classroom device variants are not inferred from the archive.

## Public software repositories inspected as *conceptual references only*

1. **OpenCPN** — https://github.com/OpenCPN/OpenCPN
   Public cross-platform navigation/chartplotter codebase covering waypoint,
   AIS decoding and chart UI concepts. It is **not** a verified NS4000
   reproduction or type-approved ECDIS. Upstream has multiple GPL/LGPL
   licenses; do not transplant source or icons without a separate legal and
   technical compatibility assessment.
2. **radar_pi** — https://github.com/opencpn-radar-pi/radar_pi
   GPLv2 OpenCPN radar integration, with a simple emulator and
   examples of PPI/trails, guard-zone and VRM/EBL concepts. Its README
   explicitly says FURUNO radars are **not supported**; it is **not**
   FAR-2127 or MDC-2060 operator/hardware evidence. No reverse-engineered
   transport/controller path is authorized for this project.
3. **Bridge Command** — https://github.com/bridgecommand/bc
   GPLv2 ship/bridge simulation project in C++ (Irrlicht). Useful to
   understand world/time/training architecture, not an FCV-588 panel or
   instrument-specific control oracle. Its readme distinguishes program
   licensing from restrictions on some included 3D model assets.

Metadata was checked against the repositories' own public README/license
descriptions on 2026-10-15. This bounded search did **not verify** a lawful,
model-specific FCV-588/FAR-2127/MDC-2060/NS4000 simulator satisfying the
project's controls, source authority and visual license requirements;
absence in these samples is **not** proof that none exists worldwide.
No third-party code, screenshots, artwork or model assets were downloaded
or imported into the live simulator.

## Implementation decision

Keep this investigation **read-only** for non-FCV devices. The single-world,
typed-observation, device-specific-reducer architecture already provides
test-only future extension via an inert observer, while refusing to fabricate
radar/AIS/NMEA signals. No new device implementation or project plan is
justified without confirmed controller/version/profile and appropriate
source/rights gates.
