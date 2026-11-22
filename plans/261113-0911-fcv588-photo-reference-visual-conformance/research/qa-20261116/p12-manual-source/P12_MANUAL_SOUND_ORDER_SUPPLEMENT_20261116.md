# P12 manual source supplement - Sounder order

This supplements the sealed JSON receipt
`P12_MANUAL_MENU_SOURCE_AUDIT_20261116.json`
(SHA-256 `c28b618cceca8380fa0be4cfdf514a2b12801b08dbccbea1b45255be0bf1c5b5`)
without modifying it.

Source PDF:
`FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf`
SHA-256 `3003e23b9d1eda509ceb968130249fe02aa279c2efb3cf900dde54ab9d709cd3`.

At PDF page 59, printed page **AP-1**, Appendix 1 Menu Tree gives the
Sounder sequence:

`Pic. Advance -> Zoom Mode -> Shift -> Interference -> Color Erase -> Clutter -> White Line -> White Marker -> TVG -> Smoothing -> Bottom Zone -> TX Power -> TX Rate`.

This is DIRECT_SOURCE. It matches the legible order in the separate 2016
`giaoDien.jpg` photo evidence described by prime, but the PDF itself does
not establish that photo's installed firmware version.

Current `src/devices/fcv588/menu-atlas.mjs`
(SHA-256 `992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed`)
orders the same Sounder entries differently: it puts `Interference`,
`Clutter`, `Color Erase` before `White Line` and moves `Zoom Mode` and
`Shift` to the end. Therefore the current atlas order is EXTRAPOLATION
relative to the cited 2025 Appendix order.

White Line semantics are also direct and materially different from the
current boolean training choice. PDF page 30, printed page **22**, section
1.22 says White Line is set by width and also mentions `Edge`; PDF page 59
AP-1 gives `White Line (0 - 50%, 0%)`. Thus `Off/On` is not an exact PDF
value oracle.
