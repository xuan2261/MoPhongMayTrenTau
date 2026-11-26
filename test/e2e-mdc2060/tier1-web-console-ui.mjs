import assert from "node:assert/strict";
import {readdir} from "node:fs/promises";
import path from "node:path";
import {
  REPO_ROOT,
  loadBundler,
  loadPpiRenderer,
  readWorkspaceText,
} from "./helpers/module-loader.mjs";

const BANNED_DOM_APIS = new Set([
  "innerHTML", "outerHTML", "insertAdjacentHTML", "write", "writeln",
]);
const BANNED_IO_APIS = new Set([
  "XMLHttpRequest", "WebSocket", "EventSource", "fetch", "serial", "usb", "bluetooth",
]);
const SIMPLE_ESCAPES = Object.freeze({__proto__: null, n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", 0: "\0"});
const STR_ESC_RE = /\\(?:\r\n|[\r\n\u2028\u2029]|x([0-9a-fA-F]{2})|u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|([\s\S]))/g;
const TMPL_ESC_RE = /(\r\n|\r)|\\(?:\r\n|[\r\n\u2028\u2029]|x([0-9a-fA-F]{2})|u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|([\s\S]))/g;
const WS_OR_COMMENT_RE = /[\s\uFEFF]+|\/\/[^\n\r\u2028\u2029]*|\/\*[\s\S]*?\*\//y;

function decodeIdentValue(raw) {
  if (!raw || !raw.includes("\\")) return raw;
  return raw.replace(/\\u(?:\{([0-9a-fA-F]+)\}|([0-9a-fA-F]{4}))/g, (m, braced, fixed) => {
    const cp = Number.parseInt(braced ?? fixed, 16);
    return Number.isFinite(cp) && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
  });
}

function decodeJsLiteralBody(raw, isTemplate = false) {
  if (!raw || (!raw.includes("\\") && (!isTemplate || !raw.includes("\r")))) return raw;
  let invalidTemplate = false;
  const decode = (m, hex2, uBraced, u4, ch, offset) => {
    if (hex2) return String.fromCharCode(Number.parseInt(hex2, 16));
    if (uBraced) {
      const cp = Number.parseInt(uBraced, 16);
      if (Number.isFinite(cp) && cp <= 0x10ffff) return String.fromCodePoint(cp);
      if (isTemplate) invalidTemplate = true;
      return m;
    }
    if (u4) return String.fromCharCode(Number.parseInt(u4, 16));
    if (ch === undefined) return "";
    if (isTemplate) {
      const nextCh = raw[offset + m.length];
      if (
        ch === "u" ||
        ch === "x" ||
        (ch >= "1" && ch <= "9") ||
        (ch === "0" && nextCh !== undefined && nextCh >= "0" && nextCh <= "9")
      ) {
        invalidTemplate = true;
        return m;
      }
    }
    return SIMPLE_ESCAPES[ch] ?? ch;
  };
  if (!isTemplate) return raw.replace(STR_ESC_RE, decode);
  const decoded = raw.replace(
    TMPL_ESC_RE,
    (m, cr, h2, ub, u4, ch, offset) => (cr ? "\n" : decode(m, h2, ub, u4, ch, offset)),
  );
  return invalidTemplate ? null : decoded;
}

function skipWsAndComments(src, start) {
  let pos = start;
  while (pos < src.length) {
    WS_OR_COMMENT_RE.lastIndex = pos;
    if (!WS_OR_COMMENT_RE.test(src)) break;
    pos = WS_OR_COMMENT_RE.lastIndex;
  }
  return pos;
}

const isMemberOrPrivatePunct = tok => Boolean(tok?.type === "punct" && (tok.value === "." || tok.value === "#"));

function assertAllowedApiName(rel, name, kind) {
  if (BANNED_DOM_APIS.has(name)) assert.fail(`${rel} uses forbidden DOM injection (${kind}: ${name})`);
  if (BANNED_IO_APIS.has(name)) assert.fail(`${rel} contains forbidden network/hardware I/O API (${kind}: ${name})`);
}

/**
 * Pure token-by-token lexical policy for MDC-2060 runtime modules (O(N) time, O(1) extra space).
 *
 * Inspects every executable token from `tokenizeModule(src)` in a single flat loop with zero
 * expression evaluation, zero constant folding, and zero token-skipping:
 *   1. `import.meta`: non-member decoded `import` followed by `.` or adjacent `?.` and decoded `meta`.
 *   2. Banned API identifiers: every decoded `ident` matching the 5 DOM APIs (`innerHTML`, `outerHTML`,
 *      `insertAdjacentHTML`, `write`, `writeln`) or 7 I/O APIs (`XMLHttpRequest`, `WebSocket`,
 *      `EventSource`, `fetch`, `serial`, `usb`, `bluetooth`), including Unicode escapes & aliases.
 *   3. Banned exact literal tokens: every single decoded `string` or no-substitution `template` token
 *      (decoding hex/Unicode/line-continuation escapes, even inside tagged templates, IIFEs, `of(...)`,
 *      and postfix chains) equal to any of those 12 banned API names.
 *
 * Scope boundary: comments, regex literals, `obj.import.meta` / `this.#import.meta`, multi-word
 * strings, and non-matching identifiers pass with zero false positives. Expression-evaluated string
 * assembly (`'inner' + 'HTML'`, `Array.join()`, `atob()`, dynamic templates) is intentionally outside
 * static token-level scanning and is enforced at runtime by strict offline CSP
 * (`connect-src 'none'`, `script-src 'self'`).
 */
export function assertCleanExecutableTokens(rel, src, tokenizeModule) {
  const toks = tokenizeModule(src);
  for (let i = 0; i < toks.length; i += 1) {
    const tok = toks[i];
    if (tok.type === "ident") {
      const name = decodeIdentValue(tok.value);
      if (name === "import" && !isMemberOrPrivatePunct(toks[i - 1])) {
        const t1 = toks[i + 1];
        const t2 = toks[i + 2];
        const metaIdx = t1?.type === "punct" && t1.value === "."
          ? i + 2
          : (t1?.type === "punct" && t1.value === "?" && t2?.type === "punct" &&
              t2.value === "." && t2.start === t1.end ? i + 3 : -1);
        if (metaIdx !== -1 && toks[metaIdx]?.type === "ident" && decodeIdentValue(toks[metaIdx].value) === "meta") {
          assert.fail(`${rel} uses forbidden import.meta`);
        }
      }
      assertAllowedApiName(rel, name, "ident");
    } else if (tok.type === "string") {
      assertAllowedApiName(rel, decodeJsLiteralBody(src.slice(tok.start + 1, tok.end - 1), false), "string");
    } else if (tok.type === "template") {
      const anchor = skipWsAndComments(src, i > 0 ? toks[i - 1].end : 0);
      if (anchor < tok.start && src[anchor] === "`") {
        const decoded = decodeJsLiteralBody(src.slice(anchor + 1, tok.start), true);
        if (decoded !== null) assertAllowedApiName(rel, decoded, "template");
      }
    }
  }
}

export const TIER = 1;
export const SUITE = "tier1-web-console-ui";

async function listJsFilesRecursive(relDir) {
  const absDir = path.join(REPO_ROOT, relDir);
  const out = [];
  const walk = async dir => {
    const entries = await readdir(dir, {withFileTypes: true});
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && /\.(?:mjs|js)$/.test(e.name)) out.push(path.relative(REPO_ROOT, p));
    }
  };
  await walk(absDir);
  return out.sort();
}

export const TESTS = [
  {
    id: "T1-108",
    name: "Mandatory Public-Reference Banner & Non-Navigation Disclaimer in web/mdc2060/index.html",
    features: [32],
    async run() {
      const html = await readWorkspaceText("web/mdc2060/index.html");
      assert.ok(
        html.includes("PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY"),
        "web/mdc2060/index.html must include mandatory public-reference banner",
      );
      assert.match(
        html,
        /role=["']note["'][^>]*>[\s\S]{0,400}PUBLIC REFERENCE \/ NOT HARDWARE VALIDATED \/ TRAINING ONLY/,
        "Public reference banner must carry role=\"note\"",
      );
      assert.doesNotMatch(
        html,
        /<meta[^>]+http-equiv=["']Content-Security-Policy["']/i,
        "Source web/mdc2060/index.html must omit <meta http-equiv=\"Content-Security-Policy\"> so server & bundler inject their own CSP",
      );
      assert.match(html, /huấn luyện|training|không dùng|not for navigation/i);
    },
  },
  {
    id: "T1-109",
    name: "MRD-104 Front Panel Contains Portrait 480x640 Canvas & All 10 Physical Control Groups",
    features: [28],
    async run() {
      const html = await readWorkspaceText("web/mdc2060/index.html");
      assert.match(html, /<canvas[^>]*\bwidth=["']480["'][^>]*\bheight=["']640["']|<canvas[^>]*\bheight=["']640["'][^>]*\bwidth=["']480["']/i);
      assert.match(
        html,
        /(?:class|id)=["'][^"']*off[-_]?screen[^"']*["']|data-off[-_]?screen\b/i,
        "Must include dark off-screen veil element for powered-off LCD",
      );
      const asideIdx = html.search(/<aside\b/i);
      const bezelHtml = asideIdx > 0 ? html.slice(0, asideIdx) : html;
      const requiredGroups = [
        {name: "F1", re: /\bF1\b|data-control=["']f1["']/i},
        {name: "F2", re: /\bF2\b|data-control=["']f2["']/i},
        {name: "MENU", re: /\bMENU\b|data-control=["']menu["']/i},
        {name: "ENT / HL OFF", re: /\bENT\b|HL\s*OFF|data-control=["']ent["']/i},
        {name: "4-way cursor pad", re: /cursorpad|▲|▼|◀|▶|aria-label=["'][^"']*(?:up|down|left|right|lên|xuống|trái|phải)/i},
        {name: "- RANGE +", re: /RANGE|range_up|range_down/i},
        {name: "GAIN rotary", re: /\bGAIN\b|data-control=["']gain["']/i},
        {name: "STC rotary", re: /\bSTC\b|data-control=["']stc["']/i},
        {name: "STBY/TX", re: /STBY\s*\/?\s*TX|stby_tx/i},
        {name: "POWER/BRILL", re: /POWER\s*\/?\s*BRILL|data-control=["']power["']/i},
      ];
      for (const grp of requiredGroups) {
        assert.match(bezelHtml, grp.re, `MRD-104 bezel missing physical control group: ${grp.name}`);
      }
    },
  },
  {
    id: "T1-110",
    name: "D15 Instructor Panel Has 5 WAI-ARIA Tabs & Workspace Toolbar Outside Hardware Bezel",
    features: [32],
    async run() {
      const html = await readWorkspaceText("web/mdc2060/index.html");
      assert.match(html, /role=["']toolbar["']/i, "Missing workspace toolbar");
      assert.match(
        html,
        /id=["']device-focus-toggle["']|<input[^>]*type=["']checkbox["'][^>]*(?:focus|tập\s*trung)[^>]*>|(?:tập\s*trung\s*vào\s*máy|focus\s*device)/i,
        "Missing workspace device focus toggle control",
      );
      const asideMatch = html.match(/<aside\b[\s\S]*?<\/aside>/i);
      assert.ok(asideMatch, "Missing <aside> instructor panel");
      const asideHtml = asideMatch[0];
      const beforeAside = html.slice(0, asideMatch.index);

      assert.doesNotMatch(beforeAside, /role=["']tablist["']|role=["']tab["']|role=["']tabpanel["']/i, "Bezel must NEVER contain instructor ARIA tabs");
      assert.match(asideHtml, /role=["']tablist["']/i, "Instructor panel must declare role=\"tablist\"");
      const tabs = asideHtml.match(/role=["']tab["']/gi) ?? [];
      const panels = asideHtml.match(/role=["']tabpanel["']/gi) ?? [];
      assert.equal(tabs.length, 5, `Instructor panel must have exact 5 role="tab" elements, got ${tabs.length}`);
      assert.equal(panels.length, 5, `Instructor panel must have exact 5 role="tabpanel" elements, got ${panels.length}`);
      assert.match(html, /aria-live=["']polite["']/i, "Missing aria-live polite status region");
      assert.doesNotMatch(html, /<canvas[^>]*aria-live/i, "Canvas #lcd must NEVER carry aria-live");
    },
  },
  {
    id: "T1-111",
    name: "Root-Relative Asset Links & Clean CSS Architecture (web/mdc2060/styles.css)",
    features: [28, 32],
    async run() {
      const html = await readWorkspaceText("web/mdc2060/index.html");
      const css = await readWorkspaceText("web/mdc2060/styles.css");
      assert.match(html, /href=["']\/web\/mdc2060\/styles\.css["']/i);
      assert.match(html, /src=["']\/web\/mdc2060\/app\.mjs["']/i);
      assert.match(html, /href=["']\/web\/(?:mdc2060\/)?favicon\.svg["']/i);
      assert.match(css, /(?:\.off[-_]?screen|\[data-off[-_]?screen[^\]]*\])\s*\[hidden\]|\[hidden\]\s*\{[^}]*display\s*:\s*none/i);
      assert.match(css, /:focus-visible/i);
      assert.match(css, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i);
      assert.match(css, /@media\s*\(\s*forced-colors\s*:\s*active\s*\)/i);
      assert.match(
        css,
        /min-(?:height|width)\s*:\s*(?:(?:4[4-9]|[5-9]\d|\d{3,})px|(?:2\.75|2\.[89]|[3-9](?:\.\d+)?)rem)/i,
        "styles.css must enforce >= 44px (2.75rem) touch target minimum",
      );
    },
  },
  {
    id: "T1-112",
    name: "60 FPS Dual-Buffer PPI Renderer Module Public Contract (web/mdc2060/ppi-renderer.mjs)",
    features: [29],
    async run() {
      const src = await readWorkspaceText("web/mdc2060/ppi-renderer.mjs");
      const hadDocument = Object.hasOwn(globalThis, "document");
      const prevDocument = globalThis.document;
      if (globalThis.document === undefined) {
        globalThis.document = {
          createElement: () => ({width: 480, height: 640, getContext: () => null}),
        };
      }
      let rendererMod;
      try {
        rendererMod = await loadPpiRenderer();
      } finally {
        if (!hadDocument) delete globalThis.document;
        else globalThis.document = prevDocument;
      }

      assert.ok(
        Object.values(rendererMod).some(v => typeof v === "function"),
        "web/mdc2060/ppi-renderer.mjs must export at least one callable renderer or factory function",
      );
      assert.match(src, /evaluatePolarEchoGrid|radar-signal\.mjs/, "ppi-renderer.mjs must integrate evaluatePolarEchoGrid / radar-signal.mjs");
      assert.match(src, /MDC2060_COLOR_PALETTES/, "ppi-renderer.mjs must use MDC2060_COLOR_PALETTES");
      assert.match(src, /["']PPI\/PPI["']/, "ppi-renderer.mjs must render Dual-Range PPI/PPI mode");
      assert.match(src, /["']PPI\/NAV["']/, "ppi-renderer.mjs must render PPI/NAV mode");
      assert.match(src, /phosphor/i, "ppi-renderer.mjs must implement offscreen phosphor persistence buffer");
      assert.match(src, /trail/i, "ppi-renderer.mjs must implement offscreen target trail buffer");
      assert.match(
        src,
        /createElement\s*\(\s*["']canvas["']\s*\)|OffscreenCanvas/,
        "ppi-renderer.mjs must create offscreen 2D canvas buffers",
      );
      assert.doesNotMatch(src, /\.innerHTML\s*=|\.outerHTML\s*=|document\.write\s*\(/, "ppi-renderer.mjs must never inject raw HTML");
      assert.doesNotMatch(src, /\bimport\.meta\b/, "ppi-renderer.mjs must never use import.meta");
      assert.doesNotMatch(src, /\b(?:fetch\s*\(|WebSocket|XMLHttpRequest)\b/, "ppi-renderer.mjs must stay 100% offline");
    },
  },
  {
    id: "T1-113",
    name: "Zero innerHTML=, Zero import.meta, Zero External Network Calls in web/mdc2060/ & src/devices/mdc2060/",
    features: [28],
    async run() {
      // Ensure required dirs exist first via module-loader
      await readWorkspaceText("web/mdc2060/app.mjs");
      await readWorkspaceText("src/devices/mdc2060/spec.mjs");
      const {tokenizeModule} = await loadBundler();
      const files = [
        ...(await listJsFilesRecursive("src/devices/mdc2060")),
        ...(await listJsFilesRecursive("web/mdc2060")),
      ];
      assert.ok(files.length >= 10, `Expected >= 10 MDC-2060 JS/MJS files, found ${files.length}`);
      for (const rel of files) {
        const src = await readWorkspaceText(rel);
        assertCleanExecutableTokens(rel, src, tokenizeModule);
      }
    },
  },
  {
    id: "T1-114",
    name: "Input Controls Reuse web/hold-input.mjs & web/key-feedback.mjs Without Modifying FCV-588 Utilities",
    features: [28],
    async run() {
      const appSrc = await readWorkspaceText("web/mdc2060/app.mjs");
      const inputSrc = await readWorkspaceText("web/mdc2060/input-controls.mjs");
      const combined = `${appSrc}\n${inputSrc}`;
      assert.match(combined, /from\s+["']\.\.\/hold-input\.mjs["']/, "MDC-2060 web console must reuse ../hold-input.mjs");
      assert.match(combined, /from\s+["']\.\.\/key-feedback\.mjs["']/, "MDC-2060 web console must reuse ../key-feedback.mjs");
      const holdSrc = await readWorkspaceText("web/hold-input.mjs");
      const rotarySrc = await readWorkspaceText("web/rotary-input.mjs");
      const padSrc = await readWorkspaceText("web/pad-repeat.mjs");
      assert.doesNotMatch(holdSrc, /MDC-2060|mdc2060/i, "web/hold-input.mjs must stay generic & unmodified");
      assert.doesNotMatch(rotarySrc, /MDC-2060|mdc2060/i, "web/rotary-input.mjs must stay FCV-588 unmodified");
      assert.doesNotMatch(padSrc, /MDC-2060|mdc2060/i, "web/pad-repeat.mjs must stay FCV-588 unmodified");
    },
  },
];
