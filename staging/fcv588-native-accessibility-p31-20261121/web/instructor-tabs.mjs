/**
 * V56 D15-only navigation. This never dispatches a simulator event or writes
 * replay/settings. Existing controls are MOVED once, not cloned or re-bound.
 * Before JS runs, all instructor sections remain visible (fail-open).
 */
const GROUPS = Object.freeze([
  ["session", [".stats", ".instructor-telemetry", ".trainer-buttons"]],
  ["help", ["#operator-guidance", ".rotary-assist", ".d15-help"]],
  ["fixtures", ['.lesson-panel[aria-label="Nguồn dữ liệu ảo chỉ dành cho giảng viên"]']],
  ["lessons", ['.lesson-panel[aria-labelledby="lesson-panel-title"]']],
  ["sources", ["#instructor-source-matrix", "#lcd-test-status", "#validation-status"]],
]);

export function nextInstructorTabIndex(index, count, key) {
  if (!Number.isInteger(index) || !Number.isInteger(count) ||
      count < 1 || index < 0 || index >= count) return null;
  switch (key) {
    case "ArrowRight": return (index + 1) % count;
    case "ArrowLeft": return (index - 1 + count) % count;
    case "Home": return 0;
    case "End": return count - 1;
    default: return null;
  }
}

export function bindInstructorTabs(root) {
  if (!root || root.dataset.d15TabsReady === "true") return null;
  const tablist = root.querySelector(".d15-tablist");
  const rail = root.querySelector(".d15-live-rail");
  const tabs = [...(tablist?.querySelectorAll('[role="tab"]') ?? [])];
  const panels = GROUPS.map(([key]) => root.querySelector("#d15-panel-" + key));
  const announcements = [
    root.querySelector("#operator-guidance-announcement"),
    root.querySelector("#source-matrix-announcement"),
  ];
  const moves = GROUPS.map(([, selectors]) =>
    selectors.map(selector => root.querySelector(selector)));

  // Validate the entire DOM before moving a single node or hiding any panel.
  // An incomplete page fails open with its original D15 sections still shown.
  if (!tablist || !rail || tabs.length !== GROUPS.length ||
      panels.some(p => !p) || announcements.some(p => !p) ||
      moves.some(group => group.some(node => !node))) return null;
  if (tabs.some((tab, index) =>
    tab.id !== "d15-tab-" + GROUPS[index][0] ||
    tab.getAttribute("aria-controls") !== panels[index].id)) return null;

  for (const live of announcements) rail.append(live);
  moves.forEach((group, index) => panels[index].append(...group));

  const activate = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[i].hidden = !selected;
    });
    if (focus) tabs[index].focus();
  };

  const onClick = event => {
    const tab = event.target.closest?.('[role="tab"]');
    const index = tabs.indexOf(tab);
    if (index >= 0) activate(index);
  };
  const onKeydown = event => {
    const tab = event.target.closest?.('[role="tab"]');
    const index = tabs.indexOf(tab);
    if (index < 0) return;
    const next = nextInstructorTabIndex(index, tabs.length, event.key);
    if (next === null) return;
    event.preventDefault();
    activate(next, true);
  };
  tablist.addEventListener("click", onClick);
  tablist.addEventListener("keydown", onKeydown);
  activate(0);
  root.classList.add("d15-enhanced");
  root.dataset.d15TabsReady = "true";
  tablist.hidden = false;

  return Object.freeze({activate, get selectedIndex() {
    return tabs.findIndex(tab => tab.getAttribute("aria-selected") === "true");
  }});
}
