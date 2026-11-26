/**
 * Zero-dependency ESM static bundler for KODEN MDC-2060 standalone HTML.
 * Compiles web/mdc2060/index.html, web/mdc2060/styles.css, web/favicon.svg,
 * and all reachable ES modules in web/** and src/** into a single offline
 * file:// HTML document using native <script type="importmap"> + Base64 data:
 * module URLs.
 */
import {createHash} from "node:crypto";
import {realpathSync} from "node:fs";
import {lstat, mkdir, readdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT_REL = "dist/MDC-2060-Standalone.html";
const SPECIFIER_PREFIX = "mdc2060://";
const MAX_ASSET_BYTES = 4_000_000;
const INDEX_REL = "web/mdc2060/index.html";

const ALLOWED_RUNTIME_EXT = Object.freeze({
  web: new Set([".html", ".mjs", ".js", ".css", ".svg"]),
  src: new Set([".mjs", ".js"]),
});

const REGEX_PRECEDING_KEYWORDS = new Set([
  "return", "throw", "case", "default", "typeof", "void", "delete",
  "in", "instanceof", "new", "yield", "await", "else", "do",
  "debugger", "break", "continue",
]);

const CONTROL_PAREN_KEYWORDS = new Set(["if", "while", "for", "with"]);
const BLOCK_PAREN_KEYWORDS = new Set(["switch", "catch"]);
const EXPR_PRECEDING_PUNCT = new Set([
  "=", "(", "[", ",", "?", "+", "-", "*", "/", "%", "&", "|", "^", "!", "~", "<", ">", "${", "...",
]);
const EXPR_PRECEDING_KEYWORDS = new Set([
  "return", "throw", "case", "typeof", "void", "delete",
  "in", "instanceof", "new", "yield", "await", "extends",
]);
const LINE_BREAK_EXPR_KEYWORDS = new Set(["return", "throw", "yield"]);
const METHOD_MODIFIER_KEYWORDS = new Set(["static", "async", "get", "set"]);
const CLASS_MEMBER_PRECEDING_PUNCT = new Set(["{", ";", "}", "]", ")", "++", "--"]);
const BINARY_CONT_SINGLE_PUNCT = new Set([
  ",", "(", "[", "?", ":", "*", "/", "%", "&", "|", "^", "<", ">", "=", "`",
]);
const LINE_TERMINATOR_RE = /[\n\r\u2028\u2029]/;

const ID_START_RE = /^[$_\p{ID_Start}]$/u;
const ID_CONTINUE_RE = /^[$_\u200C\u200D\p{ID_Continue}]$/u;

// Private lexical metadata WeakSets preserving the clean public `{type, value, start, end}` token shape.
const METHOD_IMPORT_TOKENS = new WeakSet();
const TOP_LEVEL_MODULE_TOKENS = new WeakSet();
const EXPR_BRACE_CLOSE_TOKENS = new WeakSet();

function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

function toPosix(p) {
  return p.replaceAll("\\", "/");
}

async function verifyRuntimeTree(rootDir) {
  for (const [tree, allowedExts] of Object.entries(ALLOWED_RUNTIME_EXT)) {
    const baseDir = path.join(rootDir, tree);
    const baseStat = await lstat(baseDir);
    if (baseStat.isSymbolicLink() || !baseStat.isDirectory()) {
      throw new Error(`Forbidden hidden or symlink asset: ${tree}`);
    }
    async function walk(dir) {
      const entries = await readdir(dir, {withFileTypes: true});
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = toPosix(path.relative(rootDir, full));
        if (entry.name.startsWith(".") || entry.isSymbolicLink()) {
          throw new Error(`Forbidden hidden or symlink asset: ${rel}`);
        }
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (!entry.isFile() || !allowedExts.has(ext)) {
          throw new Error(`Forbidden runtime asset type: ${rel}`);
        }
        const st = await lstat(full);
        if (st.isSymbolicLink() || st.size > MAX_ASSET_BYTES) {
          throw new Error(`Oversize or symlink runtime asset: ${rel}`);
        }
      }
    }
    await walk(baseDir);
  }
}

function isMemberOrPrivateAccess(token) {
  return token?.type === "punct" && (token.value === "." || token.value === "#");
}

function hasLineTerminatorBetween(source, startIdx, endIdx) {
  return LINE_TERMINATOR_RE.test(source.slice(startIdx, endIdx));
}

function isStatementBlockFrame(frame) {
  return frame.kind === "root" ||
    (frame.kind === "brace" && frame.braceKind === "block" && !frame.isModuleClause);
}

function isValueEndingToken(prev, prevPrev) {
  if (!prev) return false;
  if (
    prev.type === "number" ||
    prev.type === "string" ||
    prev.type === "template" ||
    prev.type === "regex"
  ) {
    return true;
  }
  if (prev.type === "punct") {
    return prev.value === ")" || prev.value === "]" || prev.value === "}" ||
      prev.value === "++" || prev.value === "--";
  }
  if (prev.type === "ident") {
    return isMemberOrPrivateAccess(prevPrev) || !EXPR_PRECEDING_KEYWORDS.has(prev.value);
  }
  return false;
}

function isBinaryContinuationAt(source, idx) {
  const ch = source[idx];
  if (BINARY_CONT_SINGLE_PUNCT.has(ch)) return true;
  if (ch === ".") return !(source[idx + 1] === "." && source[idx + 2] === ".");
  if (ch === "+") return source[idx + 1] !== "+";
  if (ch === "-") return source[idx + 1] !== "-";
  if (ch === "!") return source[idx + 1] === "=";
  return false;
}

function canStartRegex(prevToken, prevPrevToken, prevCanStartRegex) {
  if (!prevToken) return true;
  if (prevCanStartRegex) return true;
  if (prevToken.type === "punct") {
    if (prevToken.value === ")" || prevToken.value === "}") {
      return false;
    }
    return prevToken.value !== "]" &&
      prevToken.value !== "++" &&
      prevToken.value !== "--";
  }
  if (prevToken.type === "ident") {
    if (isMemberOrPrivateAccess(prevPrevToken)) {
      return false;
    }
    return REGEX_PRECEDING_KEYWORDS.has(prevToken.value);
  }
  return false;
}

function readIdentEscape(source, index) {
  if (source[index] !== "\\" || source[index + 1] !== "u") return null;
  if (source[index + 2] === "{") {
    const close = source.indexOf("}", index + 3);
    if (close === -1 || close === index + 3) {
      throw new SyntaxError("Invalid Unicode escape sequence in identifier");
    }
    const hex = source.slice(index + 3, close);
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      throw new SyntaxError("Invalid Unicode escape sequence in identifier");
    }
    const cp = Number.parseInt(hex, 16);
    if (cp > 0x10ffff) {
      throw new SyntaxError("Invalid Unicode escape sequence in identifier");
    }
    return {char: String.fromCodePoint(cp), end: close + 1};
  }
  const hex = source.slice(index + 2, index + 6);
  if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
    throw new SyntaxError("Invalid Unicode escape sequence in identifier");
  }
  const cp = Number.parseInt(hex, 16);
  return {char: String.fromCodePoint(cp), end: index + 6};
}

function isMemberHeaderPosition(source, tokens, endIndex, currentFrame, targetStart) {
  const prev = tokens[endIndex - 1];
  if (isMemberOrPrivateAccess(prev)) return true;
  if (currentFrame.braceKind !== "object" && currentFrame.braceKind !== "class") {
    return false;
  }
  let p = endIndex - 1;
  let headerStart = targetStart;
  let hasStar = false;
  let hasModifier = false;

  if (p >= 0 && tokens[p].type === "punct" && tokens[p].value === "*") {
    hasStar = true;
    headerStart = tokens[p].start;
    p -= 1;
  }
  while (
    p >= 0 &&
    tokens[p].type === "ident" &&
    METHOD_MODIFIER_KEYWORDS.has(tokens[p].value) &&
    !isMemberOrPrivateAccess(tokens[p - 1])
  ) {
    const mod = tokens[p].value;
    if (hasStar && !hasModifier && (mod === "get" || mod === "set")) {
      break;
    }
    if (mod === "async" && hasLineTerminatorBetween(source, tokens[p].end, headerStart)) {
      break;
    }
    if (
      currentFrame.braceKind === "class" &&
      tokens[p - 1]?.type === "punct" &&
      !CLASS_MEMBER_PRECEDING_PUNCT.has(tokens[p - 1].value)
    ) {
      break;
    }
    hasModifier = true;
    headerStart = tokens[p].start;
    p -= 1;
  }
  if (p < 0) return false;
  const anchor = tokens[p];
  if (currentFrame.braceKind === "object") {
    return anchor.type === "punct" && (anchor.value === "{" || anchor.value === ",");
  }
  const hadNewlineBeforeHeader = hasLineTerminatorBetween(source, anchor.end, headerStart);
  // Class body: bare generator `*` cannot follow a field initializer via ASI
  if (hasStar && !hasModifier) {
    if (currentFrame.inClassFieldInit) return false;
    if (anchor.type === "punct") {
      if (anchor.value === "{" || anchor.value === ";") return true;
      if (anchor.value === "}") return !EXPR_BRACE_CLOSE_TOKENS.has(anchor);
      return anchor.value === "]" && hadNewlineBeforeHeader;
    }
    if (anchor.type === "ident") {
      return hadNewlineBeforeHeader &&
        (!EXPR_PRECEDING_KEYWORDS.has(anchor.value) || isMemberOrPrivateAccess(tokens[p - 1]));
    }
    return hadNewlineBeforeHeader;
  }
  if (anchor.type === "punct") {
    if (anchor.value === "{" || anchor.value === ";") return true;
    if (anchor.value === "}") return !EXPR_BRACE_CLOSE_TOKENS.has(anchor) || hadNewlineBeforeHeader;
    if (
      anchor.value === "]" ||
      anchor.value === ")" ||
      anchor.value === "++" ||
      anchor.value === "--"
    ) {
      return hadNewlineBeforeHeader;
    }
    return false;
  }
  if (anchor.type === "ident") {
    return hadNewlineBeforeHeader &&
      (!EXPR_PRECEDING_KEYWORDS.has(anchor.value) || isMemberOrPrivateAccess(tokens[p - 1]));
  }
  return hadNewlineBeforeHeader;
}

function isExprPosition(prev, prevPrev, hadLineTerminator, prevColonIsExpr, prevIsForOf, forBrace) {
  if (!prev) return false;
  if (prevIsForOf) return true;
  if (prev.type === "punct") {
    if (prev.value === ":") return prevColonIsExpr;
    if (prev.value === ">" && prevPrev?.type === "punct" && prevPrev.value === "=") {
      return !forBrace;
    }
    return EXPR_PRECEDING_PUNCT.has(prev.value);
  }
  if (prev.type === "ident") {
    if (isMemberOrPrivateAccess(prevPrev)) return false;
    if (forBrace && prev.value === "default" && prevPrev?.type === "ident" && prevPrev.value === "export") {
      return true;
    }
    if (EXPR_PRECEDING_KEYWORDS.has(prev.value)) {
      if (hadLineTerminator && LINE_BREAK_EXPR_KEYWORDS.has(prev.value)) {
        return false;
      }
      return true;
    }
    return false;
  }
  return false;
}

function scanTemplateSegment(source, startIndex) {
  let i = startIndex;
  const len = source.length;
  while (i < len) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "`") {
      return {end: i + 1, hasExpr: false};
    }
    if (ch === "$" && source[i + 1] === "{") {
      return {end: i + 2, hasExpr: true};
    }
    i += 1;
  }
  throw new SyntaxError("Unterminated template literal");
}

/**
 * Lexical scanner for ES module source code.
 * Accurately skips comments, regex literals, strings, and nested template literals
 * so import/export specifiers are extracted with exact character offsets.
 */
export function tokenizeModule(source) {
  const tokens = [];
  const makeFrame = ({
    kind,
    braceKind,
    isExpr = false,
    isControlHeader = false,
    isForHeader = false,
    braceAfterParen = null,
    isModuleClause = false,
  }) => ({
    kind,
    braceKind,
    isExpr,
    isControlHeader,
    isForHeader,
    forHeaderInvalidForOf: false,
    forHeaderSeenOf: false,
    braceAfterParen,
    isModuleClause,
    pendingFn: null,
    pendingClasses: [],
    ternaryDepth: 0,
    varDeclState: "none",
    inClassFieldInit: false,
    moduleDeclState: "none",
  });

  const rootFrame = makeFrame({kind: "root", braceKind: "block"});
  const delimiterStack = [rootFrame];
  let i = 0;
  const len = source.length;
  let hadLineTerminator = false;
  let prevCanStartRegex = true;
  let prevColonIsExpr = false;
  let prevIsForOf = false;
  let prevClosedParen = null;
  let lastAsyncCtx = null;

  const currentFrame = () => delimiterStack[delimiterStack.length - 1];
  const pushToken = (
    tok,
    {canStartRegexAfter = false, colonIsExpr = false, isForOf = false, closedParen = null} = {},
  ) => {
    tokens.push(tok);
    hadLineTerminator = false;
    prevCanStartRegex = canStartRegexAfter;
    prevColonIsExpr = colonIsExpr;
    prevIsForOf = isForOf;
    prevClosedParen = closedParen;
  };

  const resetAsiInitIfNeeded = (frame, isContinuation) => {
    if (!hadLineTerminator || isContinuation) return;
    const prev = tokens[tokens.length - 1];
    const prevPrev = tokens[tokens.length - 2];
    if (!isValueEndingToken(prev, prevPrev)) return;
    if (isStatementBlockFrame(frame) && frame.varDeclState === "inInit") {
      frame.varDeclState = "none";
    }
    if (frame.braceKind === "class" && frame.inClassFieldInit) {
      frame.inClassFieldInit = false;
    }
  };

  const resetAfterBindingIfNeeded = frame => {
    if (isStatementBlockFrame(frame) && frame.varDeclState === "afterBinding") {
      frame.varDeclState = "none";
    }
  };

  while (i < len) {
    const ch = source[i];

    // Whitespace (full ECMAScript WhiteSpace + LineTerminator set)
    if (/\s/.test(ch) || ch === "\uFEFF") {
      if (ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029") {
        hadLineTerminator = true;
      }
      i += 1;
      continue;
    }

    // Line comment (stops at LF, CR, LS U+2028, PS U+2029)
    if (ch === "/" && source[i + 1] === "/") {
      i += 2;
      while (
        i < len &&
        source[i] !== "\n" &&
        source[i] !== "\r" &&
        source[i] !== "\u2028" &&
        source[i] !== "\u2029"
      ) {
        i += 1;
      }
      continue;
    }

    // Block comment
    if (ch === "/" && source[i + 1] === "*") {
      const endComment = source.indexOf("*/", i + 2);
      if (endComment === -1) throw new SyntaxError("Unterminated block comment");
      if (LINE_TERMINATOR_RE.test(source.slice(i + 2, endComment))) {
        hadLineTerminator = true;
      }
      i = endComment + 2;
      continue;
    }

    // String literal (rejects unescaped LF/CR per ECMAScript; allows ES2019 U+2028/U+2029 & escaped line continuations)
    if (ch === "\"" || ch === "'") {
      const frame = currentFrame();
      resetAsiInitIfNeeded(frame, false);
      resetAfterBindingIfNeeded(frame);
      const quote = ch;
      const start = i;
      i += 1;
      let rawContent = "";
      while (i < len && source[i] !== quote) {
        const sc = source[i];
        if (sc === "\n" || sc === "\r") {
          throw new SyntaxError("Unterminated string literal");
        }
        if (sc === "\\") {
          const esc = source[i + 1];
          if (esc === undefined) throw new SyntaxError("Unterminated string escape");
          if (esc === "\r" && source[i + 2] === "\n") {
            i += 3;
            continue;
          }
          if (esc === "\n" || esc === "\r" || esc === "\u2028" || esc === "\u2029") {
            i += 2;
            continue;
          }
          rawContent += esc;
          i += 2;
          continue;
        }
        rawContent += sc;
        i += 1;
      }
      if (i >= len) throw new SyntaxError("Unterminated string literal");
      i += 1;

      let canStartRegexAfter = false;
      if (frame.kind === "root") {
        if (
          frame.moduleDeclState === "import-start" ||
          frame.moduleDeclState === "import-from" ||
          frame.moduleDeclState === "export-from"
        ) {
          canStartRegexAfter = true;
          frame.moduleDeclState = "none";
        } else if (frame.moduleDeclState === "export-star-as") {
          frame.moduleDeclState = "export-after-clause";
        } else {
          frame.moduleDeclState = "none";
        }
      }
      pushToken({type: "string", value: rawContent, start, end: i}, {canStartRegexAfter});
      continue;
    }

    // Template literal head
    if (ch === "`") {
      const frame = currentFrame();
      resetAfterBindingIfNeeded(frame);
      if (frame.kind === "root") frame.moduleDeclState = "none";
      const seg = scanTemplateSegment(source, i + 1);
      i = seg.end;
      if (seg.hasExpr) {
        delimiterStack.push(makeFrame({kind: "template", braceKind: "expr", isExpr: true}));
        pushToken({type: "punct", value: "${", start: seg.end - 2, end: seg.end});
      } else {
        pushToken({type: "template", value: "``", start: i - 1, end: i});
      }
      continue;
    }

    // Parentheses (tracks control-flow headers, for headers, & function/switch/catch headers)
    if (ch === "(") {
      const frame = currentFrame();
      resetAfterBindingIfNeeded(frame);
      if (frame.kind === "root") frame.moduleDeclState = "none";
      const prev = tokens[tokens.length - 1];
      const prevPrev = tokens[tokens.length - 2];
      const prevPrevPrev = tokens[tokens.length - 3];
      let isControlHeader = false;
      let isForHeader = false;
      let braceAfterParen = null;

      if (frame.pendingFn) {
        braceAfterParen = {braceKind: "block", isExpr: frame.pendingFn.isExpr, isFnBody: true};
        frame.pendingFn = null;
      } else {
        const isPrevMethodHeader =
          prev?.type === "ident" &&
          isMemberHeaderPosition(source, tokens, tokens.length - 1, frame, prev.start);
        if (isPrevMethodHeader) {
          braceAfterParen = {braceKind: "block", isExpr: false};
        } else if (prev?.type === "ident" && CONTROL_PAREN_KEYWORDS.has(prev.value)) {
          isControlHeader = true;
          isForHeader = prev.value === "for";
          braceAfterParen = {braceKind: "block", isExpr: false};
        } else if (
          prev?.type === "ident" &&
          prev.value === "await" &&
          prevPrev?.type === "ident" &&
          prevPrev.value === "for" &&
          !isMemberOrPrivateAccess(prevPrevPrev)
        ) {
          isControlHeader = true;
          isForHeader = true;
          braceAfterParen = {braceKind: "block", isExpr: false};
        } else if (prev?.type === "ident" && BLOCK_PAREN_KEYWORDS.has(prev.value)) {
          braceAfterParen = {braceKind: "block", isExpr: false};
        }
      }

      delimiterStack.push(makeFrame({
        kind: "paren",
        braceKind: "expr",
        isExpr: false,
        isControlHeader,
        isForHeader,
        braceAfterParen,
      }));
      pushToken({type: "punct", value: "(", start: i, end: i + 1});
      i += 1;
      continue;
    }
    if (ch === ")") {
      let popped = null;
      if (delimiterStack.length > 1 && currentFrame().kind === "paren") {
        popped = delimiterStack.pop();
      }
      if (currentFrame().kind === "root") currentFrame().moduleDeclState = "none";
      pushToken(
        {type: "punct", value: ")", start: i, end: i + 1},
        {canStartRegexAfter: Boolean(popped?.isControlHeader), closedParen: popped},
      );
      i += 1;
      continue;
    }

    // Brackets
    if (ch === "[") {
      const frame = currentFrame();
      if (isStatementBlockFrame(frame)) {
        if (frame.varDeclState === "expectBinding") {
          frame.varDeclState = "inInit";
        } else if (frame.varDeclState === "afterBinding") {
          frame.varDeclState = "none";
        }
      }
      if (frame.kind === "root") frame.moduleDeclState = "none";
      delimiterStack.push(makeFrame({kind: "bracket", braceKind: "expr", isExpr: false}));
      pushToken({type: "punct", value: "[", start: i, end: i + 1});
      i += 1;
      continue;
    }
    if (ch === "]") {
      if (delimiterStack.length > 1 && currentFrame().kind === "bracket") {
        delimiterStack.pop();
      }
      if (currentFrame().kind === "root") currentFrame().moduleDeclState = "none";
      pushToken({type: "punct", value: "]", start: i, end: i + 1});
      i += 1;
      continue;
    }

    // Braces (including template expression resume and block vs expression tracking)
    if (ch === "{") {
      const frame = currentFrame();
      resetAsiInitIfNeeded(frame, false);
      if (isStatementBlockFrame(frame)) {
        if (frame.varDeclState === "expectBinding") {
          frame.varDeclState = "inInit";
        } else if (frame.varDeclState === "afterBinding") {
          frame.varDeclState = "none";
        }
      }
      const prev = tokens[tokens.length - 1];
      const prevPrev = tokens[tokens.length - 2];
      let braceKind = "block";
      let isExpr = false;
      let isModuleClause = false;

      if (frame.kind === "root") {
        if (frame.moduleDeclState === "import-start" || frame.moduleDeclState === "import-clause") {
          frame.moduleDeclState = "import-clause";
          isModuleClause = true;
        } else if (frame.moduleDeclState === "export-start") {
          frame.moduleDeclState = "export-after-clause";
          isModuleClause = true;
        } else {
          frame.moduleDeclState = "none";
        }
      }

      const topPendingClass = frame.pendingClasses[frame.pendingClasses.length - 1];
      const isClassBodyBrace = Boolean(topPendingClass) && (
        !topPendingClass.inExtends || (
          !(prev?.type === "punct" && prev.value === ")" && prevClosedParen?.braceAfterParen?.isFnBody) &&
          !isExprPosition(prev, prevPrev, hadLineTerminator, prevColonIsExpr, prevIsForOf, true)
        )
      );
      if (isClassBodyBrace) {
        frame.pendingClasses.pop();
        braceKind = "class";
        isExpr = topPendingClass.isExpr;
      } else if (prev?.type === "punct" && prev.value === ")" && prevClosedParen?.braceAfterParen) {
        braceKind = prevClosedParen.braceAfterParen.braceKind;
        isExpr = prevClosedParen.braceAfterParen.isExpr;
      } else if (prev?.type === "punct" && prev.value === ")") {
        braceKind = "block";
        isExpr = false;
      } else if (isExprPosition(prev, prevPrev, hadLineTerminator, prevColonIsExpr, prevIsForOf, true)) {
        braceKind = "object";
        isExpr = true;
      }

      frame.pendingFn = null;
      delimiterStack.push(makeFrame({kind: "brace", braceKind, isExpr, isModuleClause}));
      pushToken({type: "punct", value: "{", start: i, end: i + 1});
      i += 1;
      continue;
    }
    if (ch === "}") {
      const top = currentFrame();
      if (top.kind === "template") {
        delimiterStack.pop();
        const seg = scanTemplateSegment(source, i + 1);
        i = seg.end;
        if (seg.hasExpr) {
          delimiterStack.push(makeFrame({kind: "template", braceKind: "expr", isExpr: true}));
          pushToken({type: "punct", value: "${", start: seg.end - 2, end: seg.end});
        } else {
          pushToken({type: "template", value: "``", start: i - 1, end: i});
        }
        continue;
      }
      let popped = null;
      if (delimiterStack.length > 1 && top.kind === "brace") {
        popped = delimiterStack.pop();
      }
      const parent = currentFrame();
      if (parent.kind === "root" && !popped?.isModuleClause) {
        parent.moduleDeclState = "none";
      }
      if (parent.braceKind === "class" && popped && !popped.isExpr) {
        parent.inClassFieldInit = false;
      }
      const closeTok = {type: "punct", value: "}", start: i, end: i + 1};
      if (popped?.isExpr) {
        EXPR_BRACE_CLOSE_TOKENS.add(closeTok);
      }
      pushToken(closeTok, {canStartRegexAfter: popped ? !popped.isExpr : false});
      i += 1;
      continue;
    }

    // Regex literal vs division operator
    if (ch === "/") {
      const frame = currentFrame();
      const prev = tokens[tokens.length - 1];
      const prevPrev = tokens[tokens.length - 2];
      const isAfterUninitVarDecl =
        isStatementBlockFrame(frame) &&
        frame.varDeclState === "afterBinding" &&
        hadLineTerminator;
      if (isAfterUninitVarDecl || canStartRegex(prev, prevPrev, prevCanStartRegex)) {
        if (isAfterUninitVarDecl) {
          frame.varDeclState = "none";
        }
        if (frame.kind === "root") frame.moduleDeclState = "none";
        const start = i;
        i += 1;
        let inClass = false;
        let closed = false;
        while (i < len) {
          const rc = source[i];
          if (rc === "\n" || rc === "\r" || rc === "\u2028" || rc === "\u2029") {
            throw new SyntaxError("Unterminated regex literal");
          }
          if (rc === "\\") {
            const nextRc = source[i + 1];
            if (
              nextRc === undefined ||
              nextRc === "\n" ||
              nextRc === "\r" ||
              nextRc === "\u2028" ||
              nextRc === "\u2029"
            ) {
              throw new SyntaxError("Unterminated regex literal");
            }
            i += 2;
            continue;
          }
          if (rc === "[") inClass = true;
          else if (rc === "]") inClass = false;
          else if (rc === "/" && !inClass) {
            i += 1;
            while (i < len && /[a-z]/i.test(source[i])) i += 1;
            closed = true;
            break;
          }
          i += 1;
        }
        if (!closed) {
          throw new SyntaxError("Unterminated regex literal");
        }
        pushToken({type: "regex", value: source.slice(start, i), start, end: i});
        continue;
      }
    }

    // Identifiers & keywords (ASCII, Unicode ID_Start/ID_Continue incl. astral, and \uXXXX / \u{...} escapes)
    const startEsc = ch === "\\" ? readIdentEscape(source, i) : null;
    const startSym = startEsc ? startEsc.char : String.fromCodePoint(source.codePointAt(i));
    if (ID_START_RE.test(startSym)) {
      const start = i;
      i = startEsc ? startEsc.end : i + startSym.length;
      while (i < len) {
        const contEsc = source[i] === "\\" ? readIdentEscape(source, i) : null;
        if (contEsc) {
          if (!ID_CONTINUE_RE.test(contEsc.char)) break;
          i = contEsc.end;
          continue;
        }
        const contSym = String.fromCodePoint(source.codePointAt(i));
        if (!ID_CONTINUE_RE.test(contSym)) break;
        i += contSym.length;
      }
      const value = source.slice(start, i);
      const tok = {type: "ident", value, start, end: i};
      const frame = currentFrame();
      const prev = tokens[tokens.length - 1];
      const prevPrev = tokens[tokens.length - 2];

      resetAsiInitIfNeeded(frame, value === "in" || value === "instanceof");

      if (frame.kind === "root" && (value === "import" || value === "export") && !isMemberOrPrivateAccess(prev)) {
        TOP_LEVEL_MODULE_TOKENS.add(tok);
      }

      if (
        value === "in" &&
        frame.kind === "paren" &&
        frame.isForHeader &&
        !isMemberOrPrivateAccess(prev)
      ) {
        frame.forHeaderInvalidForOf = true;
      }

      // Contextual `of` keyword is strictly gated to `for (...)` / `for await (...)` headers
      const isForOfKeyword =
        value === "of" &&
        frame.kind === "paren" &&
        frame.isForHeader &&
        !frame.forHeaderInvalidForOf &&
        !frame.forHeaderSeenOf &&
        !isMemberOrPrivateAccess(prev) &&
        prev != null &&
        (
          (prev.type === "punct" && (prev.value === "]" || prev.value === "}" || prev.value === ")")) ||
          (
            prev.type === "ident" &&
            (
              isMemberOrPrivateAccess(prevPrev) ||
              (
                prev.value !== "const" &&
                prev.value !== "let" &&
                prev.value !== "var" &&
                !EXPR_PRECEDING_KEYWORDS.has(prev.value)
              )
            )
          )
        );
      if (isForOfKeyword) {
        frame.forHeaderSeenOf = true;
      }

      // Label identifier immediately following `break` / `continue` on the same line ends the statement
      const isBreakOrContinueLabel =
        !hadLineTerminator &&
        prev?.type === "ident" &&
        (prev.value === "break" || prev.value === "continue") &&
        !isMemberOrPrivateAccess(prevPrev);

      if (value === "import" && isMemberHeaderPosition(source, tokens, tokens.length, frame, start)) {
        METHOD_IMPORT_TOKENS.add(tok);
      } else if (value === "async") {
        lastAsyncCtx = {hadLineTerminator, prevColonIsExpr, prevIsForOf};
      } else if (value === "function" && !isMemberHeaderPosition(source, tokens, tokens.length, frame, start)) {
        let isExpr;
        if (
          prev?.type === "ident" &&
          prev.value === "async" &&
          !hadLineTerminator &&
          !isMemberOrPrivateAccess(prevPrev)
        ) {
          isExpr = isExprPosition(
            prevPrev,
            tokens[tokens.length - 3],
            Boolean(lastAsyncCtx?.hadLineTerminator),
            Boolean(lastAsyncCtx?.prevColonIsExpr),
            Boolean(lastAsyncCtx?.prevIsForOf),
            false,
          );
        } else {
          isExpr = isExprPosition(prev, prevPrev, hadLineTerminator, prevColonIsExpr, prevIsForOf, false);
        }
        frame.pendingFn = {isExpr};
      } else if (value === "class" && !isMemberHeaderPosition(source, tokens, tokens.length, frame, start)) {
        frame.pendingClasses.push({
          isExpr: isExprPosition(prev, prevPrev, hadLineTerminator, prevColonIsExpr, prevIsForOf, false),
          inExtends: false,
        });
      } else if (
        value === "extends" &&
        frame.pendingClasses.length > 0 &&
        !isMemberOrPrivateAccess(prev)
      ) {
        frame.pendingClasses[frame.pendingClasses.length - 1].inExtends = true;
      }

      // Track top-level import/export declaration state so module-specifier strings get canStartRegexAfter
      if (frame.kind === "root") {
        const mState = frame.moduleDeclState;
        if (mState === "import-start") {
          frame.moduleDeclState = "import-clause";
        } else if (mState === "import-as") {
          frame.moduleDeclState = "import-clause";
        } else if (mState === "import-clause") {
          if (value === "from") frame.moduleDeclState = "import-from";
          else if (value === "as") frame.moduleDeclState = "import-as";
          else if (value === "import" && !isMemberOrPrivateAccess(prev)) frame.moduleDeclState = "import-start";
          else if (value === "export" && !isMemberOrPrivateAccess(prev)) frame.moduleDeclState = "export-start";
        } else if (mState === "export-star") {
          if (value === "as") frame.moduleDeclState = "export-star-as";
          else if (value === "from") frame.moduleDeclState = "export-from";
          else if (value === "import" && !isMemberOrPrivateAccess(prev)) frame.moduleDeclState = "import-start";
          else if (value === "export" && !isMemberOrPrivateAccess(prev)) frame.moduleDeclState = "export-start";
          else frame.moduleDeclState = "none";
        } else if (mState === "export-star-as") {
          frame.moduleDeclState = "export-after-clause";
        } else if (mState === "export-after-clause") {
          if (value === "from") frame.moduleDeclState = "export-from";
          else if (value === "import" && !isMemberOrPrivateAccess(prev)) frame.moduleDeclState = "import-start";
          else if (value === "export" && !isMemberOrPrivateAccess(prev)) frame.moduleDeclState = "export-start";
          else frame.moduleDeclState = "none";
        } else if (value === "import" && !isMemberOrPrivateAccess(prev)) {
          frame.moduleDeclState = "import-start";
        } else if (value === "export" && !isMemberOrPrivateAccess(prev)) {
          frame.moduleDeclState = "export-start";
        } else {
          frame.moduleDeclState = "none";
        }
      }

      // Track uninitialized `var` / `let` declarators in statement blocks for ASI before `/`
      if (isStatementBlockFrame(frame)) {
        if (frame.varDeclState === "afterBinding") {
          frame.varDeclState = "none";
        }
        if (frame.varDeclState === "expectBinding") {
          if (value !== "var" && value !== "let") {
            frame.varDeclState = "afterBinding";
          }
        } else if ((value === "var" || value === "let") && !isMemberOrPrivateAccess(prev)) {
          frame.varDeclState = "expectBinding";
        }
      }

      pushToken(tok, {
        canStartRegexAfter: isForOfKeyword || isBreakOrContinueLabel,
        isForOf: isForOfKeyword,
      });
      continue;
    }

    // Numbers (ECMAScript NumericLiteral: 0x/0b/0o radix, decimal/float/exponent, BigInt `n`, leading `.5`)
    if (/[0-9]/.test(ch) || (ch === "." && i + 1 < len && /[0-9]/.test(source[i + 1]))) {
      const frame = currentFrame();
      resetAsiInitIfNeeded(frame, false);
      resetAfterBindingIfNeeded(frame);
      if (frame.kind === "root") frame.moduleDeclState = "none";
      const start = i;
      if (ch === ".") {
        i += 1;
        while (i < len && /[0-9_]/.test(source[i])) i += 1;
        if (i < len && (source[i] === "e" || source[i] === "E")) {
          let expPos = i + 1;
          if (expPos < len && (source[expPos] === "+" || source[expPos] === "-")) expPos += 1;
          if (expPos < len && /[0-9]/.test(source[expPos])) {
            i = expPos + 1;
            while (i < len && /[0-9_]/.test(source[i])) i += 1;
          }
        }
      } else if (ch === "0" && (source[i + 1] === "x" || source[i + 1] === "X")) {
        i += 2;
        while (i < len && /[0-9a-fA-F_]/.test(source[i])) i += 1;
        if (i < len && source[i] === "n") i += 1;
      } else if (ch === "0" && (source[i + 1] === "b" || source[i + 1] === "B")) {
        i += 2;
        while (i < len && /[01_]/.test(source[i])) i += 1;
        if (i < len && source[i] === "n") i += 1;
      } else if (ch === "0" && (source[i + 1] === "o" || source[i + 1] === "O")) {
        i += 2;
        while (i < len && /[0-7_]/.test(source[i])) i += 1;
        if (i < len && source[i] === "n") i += 1;
      } else {
        i += 1;
        while (i < len && /[0-9_]/.test(source[i])) i += 1;
        if (i < len && source[i] === "n") {
          i += 1;
        } else {
          if (i < len && source[i] === ".") {
            i += 1;
            while (i < len && /[0-9_]/.test(source[i])) i += 1;
          }
          if (i < len && (source[i] === "e" || source[i] === "E")) {
            let expPos = i + 1;
            if (expPos < len && (source[expPos] === "+" || source[expPos] === "-")) expPos += 1;
            if (expPos < len && /[0-9]/.test(source[expPos])) {
              i = expPos + 1;
              while (i < len && /[0-9_]/.test(source[i])) i += 1;
            }
          }
        }
      }
      pushToken({type: "number", value: source.slice(start, i), start, end: i});
      continue;
    }

    // Spread/rest punctuator so ...import is never misclassified as member access .import
    if (ch === "." && source[i + 1] === "." && source[i + 2] === ".") {
      const frame = currentFrame();
      resetAsiInitIfNeeded(frame, false);
      resetAfterBindingIfNeeded(frame);
      if (frame.kind === "root") frame.moduleDeclState = "none";
      pushToken({type: "punct", value: "...", start: i, end: i + 3});
      i += 3;
      continue;
    }

    // Multi-char ++ / -- punctuators for regex disambiguation
    if ((ch === "+" && source[i + 1] === "+") || (ch === "-" && source[i + 1] === "-")) {
      const frame = currentFrame();
      resetAsiInitIfNeeded(frame, false);
      resetAfterBindingIfNeeded(frame);
      if (frame.kind === "root") frame.moduleDeclState = "none";
      pushToken({type: "punct", value: source.slice(i, i + 2), start: i, end: i + 2});
      i += 2;
      continue;
    }

    const frame = currentFrame();
    resetAsiInitIfNeeded(frame, isBinaryContinuationAt(source, i));

    if (frame.kind === "root") {
      if (ch === "*") {
        if (frame.moduleDeclState === "import-start" || frame.moduleDeclState === "import-clause") {
          frame.moduleDeclState = "import-clause";
        } else if (frame.moduleDeclState === "export-start") {
          frame.moduleDeclState = "export-star";
        } else {
          frame.moduleDeclState = "none";
        }
      } else if (ch === ",") {
        if (frame.moduleDeclState !== "import-clause") {
          frame.moduleDeclState = "none";
        }
      } else {
        frame.moduleDeclState = "none";
      }
    }

    if (ch === "?") {
      resetAfterBindingIfNeeded(frame);
      const prev = tokens[tokens.length - 1];
      const nextCh = source[i + 1];
      const isOptionalChain = nextCh === "." && !/[0-9]/.test(source[i + 2] ?? "");
      const isNullish = nextCh === "?" || (prev?.type === "punct" && prev.value === "?" && prev.end === i);
      if (!isOptionalChain && !isNullish) {
        frame.ternaryDepth += 1;
      }
      pushToken({type: "punct", value: ch, start: i, end: i + 1});
      i += 1;
      continue;
    }

    if (ch === ":") {
      resetAfterBindingIfNeeded(frame);
      let colonIsExpr = false;
      if (frame.ternaryDepth > 0) {
        frame.ternaryDepth -= 1;
        colonIsExpr = true;
      } else if (frame.braceKind === "object") {
        colonIsExpr = true;
        frame.pendingClasses.length = 0;
      }
      frame.pendingFn = null;
      pushToken({type: "punct", value: ch, start: i, end: i + 1}, {colonIsExpr});
      i += 1;
      continue;
    }

    if (ch === ";") {
      frame.ternaryDepth = 0;
      frame.pendingFn = null;
      frame.pendingClasses.length = 0;
      frame.varDeclState = "none";
      frame.inClassFieldInit = false;
      if (frame.isForHeader) frame.forHeaderInvalidForOf = true;
    } else if (ch === ",") {
      frame.pendingFn = null;
      frame.pendingClasses.length = 0;
      if (frame.isForHeader) frame.forHeaderInvalidForOf = true;
      if (isStatementBlockFrame(frame) && (frame.varDeclState === "afterBinding" || frame.varDeclState === "inInit")) {
        frame.varDeclState = "expectBinding";
      }
    } else if (ch === "=") {
      frame.pendingFn = null;
      frame.pendingClasses.length = 0;
      if (frame.isForHeader) frame.forHeaderInvalidForOf = true;
      if (isStatementBlockFrame(frame) && frame.varDeclState === "afterBinding") {
        frame.varDeclState = "inInit";
      }
      if (frame.braceKind === "class") {
        frame.inClassFieldInit = true;
      }
    } else {
      resetAfterBindingIfNeeded(frame);
    }

    pushToken({type: "punct", value: ch, start: i, end: i + 1});
    i += 1;
  }

  if (delimiterStack.some(frame => frame.kind === "template")) {
    throw new SyntaxError("Unterminated template literal");
  }

  return tokens;
}

function skipBraceBlock(tokens, openIndex) {
  let depth = 0;
  for (let idx = openIndex; idx < tokens.length; idx += 1) {
    if (tokens[idx].type === "punct" && tokens[idx].value === "{") depth += 1;
    else if (tokens[idx].type === "punct" && tokens[idx].value === "}") {
      depth -= 1;
      if (depth === 0) return idx;
    }
  }
  throw new SyntaxError("Unbalanced '{' in import/export clause");
}

function skipParenBlock(tokens, openIndex) {
  let depth = 0;
  for (let idx = openIndex; idx < tokens.length; idx += 1) {
    if (tokens[idx].type === "punct" && tokens[idx].value === "(") depth += 1;
    else if (tokens[idx].type === "punct" && tokens[idx].value === ")") {
      depth -= 1;
      if (depth === 0) return idx;
    }
  }
  throw new SyntaxError("Unbalanced '(' in import() call");
}

function findModuleSpecifiersFromTokens(tokens) {
  const specifiers = [];
  const isFromSpec = idx =>
    tokens[idx]?.type === "ident" &&
    tokens[idx].value === "from" &&
    tokens[idx + 1]?.type === "string";

  for (let k = 0; k < tokens.length; k += 1) {
    const tok = tokens[k];
    const prev = tokens[k - 1];
    if (tok.type !== "ident" || isMemberOrPrivateAccess(prev)) continue;

    if (tok.value === "import") {
      const next = tokens[k + 1];
      if (!next) continue;
      // import.meta
      if (next.type === "punct" && next.value === ".") continue;
      // Dynamic import("...") — fail closed on any non-static specifier expression
      if (next.type === "punct" && next.value === "(") {
        const closeIdx = skipParenBlock(tokens, k + 1);
        const afterParen = tokens[closeIdx + 1];
        if (
          afterParen?.type === "punct" &&
          afterParen.value === "{" &&
          METHOD_IMPORT_TOKENS.has(tok)
        ) {
          continue;
        }
        const arg = tokens[k + 2];
        const afterArg = tokens[k + 3];
        if (
          arg?.type === "string" &&
          (k + 3 === closeIdx || (afterArg?.type === "punct" && afterArg.value === ","))
        ) {
          specifiers.push(arg);
          continue;
        }
        throw new Error("Unsupported non-static dynamic import() specifier");
      }

      // Static import declarations are strictly top-level and never member headers
      if (METHOD_IMPORT_TOKENS.has(tok) || !TOP_LEVEL_MODULE_TOKENS.has(tok)) continue;

      // Side-effect import "..."
      if (next.type === "string") {
        specifiers.push(next);
        k += 1;
        continue;
      }

      // Exact ECMAScript ImportClause FromClause forms (zero greedy scanning):
      // Form A: import * as <ident> from "<spec>"
      if (
        next.type === "punct" &&
        next.value === "*" &&
        tokens[k + 2]?.type === "ident" &&
        tokens[k + 2].value === "as" &&
        tokens[k + 3]?.type === "ident" &&
        isFromSpec(k + 4)
      ) {
        specifiers.push(tokens[k + 5]);
        k += 5;
        continue;
      }

      // Form B: import { ... } from "<spec>"
      if (next.type === "punct" && next.value === "{") {
        const closeIdx = skipBraceBlock(tokens, k + 1);
        if (isFromSpec(closeIdx + 1)) {
          specifiers.push(tokens[closeIdx + 2]);
          k = closeIdx + 2;
        }
        continue;
      }

      if (next.type === "ident") {
        // Form C: import <ident> from "<spec>"
        if (isFromSpec(k + 2)) {
          specifiers.push(tokens[k + 3]);
          k += 3;
          continue;
        }
        if (tokens[k + 2]?.type === "punct" && tokens[k + 2].value === ",") {
          const afterComma = tokens[k + 3];
          // Form D: import <ident>, * as <ident> from "<spec>"
          if (
            afterComma?.type === "punct" &&
            afterComma.value === "*" &&
            tokens[k + 4]?.type === "ident" &&
            tokens[k + 4].value === "as" &&
            tokens[k + 5]?.type === "ident" &&
            isFromSpec(k + 6)
          ) {
            specifiers.push(tokens[k + 7]);
            k += 7;
            continue;
          }
          // Form E: import <ident>, { ... } from "<spec>"
          if (afterComma?.type === "punct" && afterComma.value === "{") {
            const closeIdx = skipBraceBlock(tokens, k + 3);
            if (isFromSpec(closeIdx + 1)) {
              specifiers.push(tokens[closeIdx + 2]);
              k = closeIdx + 2;
            }
          }
        }
      }
      continue;
    }

    if (tok.value === "export") {
      if (!TOP_LEVEL_MODULE_TOKENS.has(tok)) continue;
      const next = tokens[k + 1];
      if (!next || next.type !== "punct") continue;
      // export * [as <ident|string>] from "..."
      if (next.value === "*") {
        let m = k + 2;
        if (
          tokens[m]?.type === "ident" &&
          tokens[m].value === "as" &&
          (tokens[m + 1]?.type === "ident" || tokens[m + 1]?.type === "string")
        ) {
          m += 2;
        }
        if (isFromSpec(m)) {
          specifiers.push(tokens[m + 1]);
          k = m + 1;
        }
        continue;
      }
      // export { ... } [from "..."]
      if (next.value === "{") {
        const closeIdx = skipBraceBlock(tokens, k + 1);
        if (isFromSpec(closeIdx + 1)) {
          specifiers.push(tokens[closeIdx + 2]);
          k = closeIdx + 2;
        } else {
          k = closeIdx;
        }
      }
    }
  }

  return specifiers;
}

/**
 * Extracts all ES module specifier string tokens from a tokenized module.
 */
export function findModuleSpecifiers(source) {
  return findModuleSpecifiersFromTokens(tokenizeModule(source));
}

function resolveAssetPath(rootDir, fromRelPath, rawSpec) {
  let targetFull;
  if (rawSpec.startsWith("/")) {
    targetFull = path.resolve(rootDir, "." + rawSpec);
  } else if (rawSpec.startsWith("./") || rawSpec.startsWith("../")) {
    const fromDir = path.dirname(path.join(rootDir, fromRelPath));
    targetFull = path.resolve(fromDir, rawSpec);
  } else {
    throw new Error(`Unsupported bare/external specifier "${rawSpec}" in ${fromRelPath}`);
  }
  const rel = toPosix(path.relative(rootDir, targetFull));
  if (rel.startsWith("../") || path.isAbsolute(rel) || (!rel.startsWith("src/") && !rel.startsWith("web/"))) {
    throw new Error(`Resolved path "${rel}" escapes src/ and web/ from ${fromRelPath}`);
  }
  return {targetFull, rel};
}

function parseHtmlAttributes(tagHtml) {
  const attrs = new Map();
  const attrRegex = /([A-Za-z_:][-A-Za-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match = attrRegex.exec(tagHtml);
  // Skip tag name
  match = attrRegex.exec(tagHtml);
  while (match) {
    const name = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? "";
    attrs.set(name, val);
    match = attrRegex.exec(tagHtml);
  }
  return attrs;
}

function decodeCssEscapes(text) {
  return text.replace(
    /\\(?:([0-9a-fA-F]{1,6})(?:\r\n|[\t\r\n\f ])?|([^\r\n\f]))/g,
    (_, hex, ch) => {
      if (hex !== undefined) {
        const cp = Number.parseInt(hex, 16);
        if (cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) {
          return "\uFFFD";
        }
        return String.fromCodePoint(cp);
      }
      return ch;
    },
  );
}

function stripCssCommentsAndStrings(css) {
  let out = "";
  let i = 0;
  const len = css.length;
  while (i < len) {
    const ch = css[i];
    if (ch === "\\") {
      const next = css[i + 1];
      if (next !== undefined && next !== "\n" && next !== "\r" && next !== "\f") {
        out += ch + next;
        i += 2;
      } else {
        out += ch;
        i += 1;
      }
      continue;
    }
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      out += " ";
      if (end === -1) break;
      i = end + 2;
      continue;
    }
    if (ch === "\"" || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < len && css[i] !== quote) {
        if (css[i] === "\\") {
          i += (css[i + 1] === "\r" && css[i + 2] === "\n") ? 3 : 2;
          continue;
        }
        if (css[i] === "\n" || css[i] === "\r" || css[i] === "\f") {
          break;
        }
        i += 1;
      }
      if (i < len && css[i] === quote) {
        i += 1;
      }
      out += "\"\"";
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function skipCssWsAndComments(css, startIndex) {
  let i = startIndex;
  const len = css.length;
  while (i < len) {
    if (/\s/.test(css[i])) {
      i += 1;
      continue;
    }
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      if (end === -1) return len;
      i = end + 2;
      continue;
    }
    break;
  }
  return i;
}

async function inlineCssSvgUrls(rootDir, cssRelPath, cssSource) {
  const skeleton = stripCssCommentsAndStrings(cssSource);

  // Reject any CSS @import rule (including case, comment, and CSS-escape variants)
  const cssAtRuleRe = /@\s*((?:\\(?:[0-9a-fA-F]{1,6}(?:\r\n|[\t\r\n\f ])?|[^\r\n\f])|[A-Za-z0-9_\-\u0080-\uFFFF])+)/g;
  for (const m of skeleton.matchAll(cssAtRuleRe)) {
    let backslashes = 0;
    for (let p = m.index - 1; p >= 0 && skeleton[p] === "\\"; p -= 1) backslashes += 1;
    if (backslashes % 2 === 1) continue;
    if (decodeCssEscapes(m[1]).toLowerCase() === "import") {
      throw new Error(`Unsupported CSS @import in ${cssRelPath}`);
    }
  }

  // Reject CSS backslash-escaped url() (e.g. \75rl(...), u\72l(...), \75 \72 \6c (...))
  // and image-set() / -webkit-image-set() external resource loaders
  const cssFuncRe = /((?:\\(?:[0-9a-fA-F]{1,6}(?:\r\n|[\t\r\n\f ])?|[^\r\n\f])|[A-Za-z0-9_\-\u0080-\uFFFF])+)\(/g;
  for (const m of skeleton.matchAll(cssFuncRe)) {
    const rawName = m[1];
    const decodedName = decodeCssEscapes(rawName).toLowerCase();
    if (rawName.includes("\\") && decodedName === "url") {
      throw new Error(`Unsupported escaped CSS url() in ${cssRelPath}`);
    }
    if (decodedName === "image-set" || decodedName === "-webkit-image-set") {
      throw new Error(`Unsupported CSS ${decodedName}() in ${cssRelPath}`);
    }
  }

  // Scan cssSource outside top-level comments and strings for url(...) tokens
  let result = "";
  let cursor = 0;
  let i = 0;
  const len = cssSource.length;

  while (i < len) {
    const ch = cssSource[i];
    if (ch === "\\") {
      const next = cssSource[i + 1];
      i += (next !== undefined && next !== "\n" && next !== "\r" && next !== "\f") ? 2 : 1;
      continue;
    }
    if (ch === "/" && cssSource[i + 1] === "*") {
      const end = cssSource.indexOf("*/", i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }
    if (ch === "\"" || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < len && cssSource[i] !== quote) {
        if (cssSource[i] === "\\") {
          i += (cssSource[i + 1] === "\r" && cssSource[i + 2] === "\n") ? 3 : 2;
          continue;
        }
        if (cssSource[i] === "\n" || cssSource[i] === "\r" || cssSource[i] === "\f") {
          break;
        }
        i += 1;
      }
      if (i < len && cssSource[i] === quote) i += 1;
      continue;
    }

    if (
      (ch === "u" || ch === "U") &&
      (cssSource[i + 1] === "r" || cssSource[i + 1] === "R") &&
      (cssSource[i + 2] === "l" || cssSource[i + 2] === "L") &&
      cssSource[i + 3] === "(" &&
      (i === 0 || !/[A-Za-z0-9_\-\u0080-\uFFFF]/.test(cssSource[i - 1]))
    ) {
      const tokenStart = i;
      let j = skipCssWsAndComments(cssSource, i + 4);
      if (j >= len) {
        throw new Error(`Unterminated CSS url() in ${cssRelPath}`);
      }

      if (cssSource[j] === ")") {
        i = j + 1;
        continue;
      }

      let rawUrl = "";
      if (cssSource[j] === "\"" || cssSource[j] === "'") {
        const quote = cssSource[j];
        j += 1;
        const valStart = j;
        while (j < len && cssSource[j] !== quote) {
          if (cssSource[j] === "\\") {
            j += (cssSource[j + 1] === "\r" && cssSource[j + 2] === "\n") ? 3 : 2;
            continue;
          }
          if (cssSource[j] === "\n" || cssSource[j] === "\r" || cssSource[j] === "\f") {
            throw new Error(`Unterminated string in CSS url() in ${cssRelPath}`);
          }
          j += 1;
        }
        if (j >= len || cssSource[j] !== quote) {
          throw new Error(`Unterminated string in CSS url() in ${cssRelPath}`);
        }
        rawUrl = cssSource.slice(valStart, j);
        j += 1;
      } else {
        const valStart = j;
        while (j < len) {
          const uc = cssSource[j];
          if (uc === "\\") {
            j += (cssSource[j + 1] === "\r" && cssSource[j + 2] === "\n") ? 3 : 2;
            continue;
          }
          if (uc === ")" || /\s/.test(uc) || (uc === "/" && cssSource[j + 1] === "*")) {
            break;
          }
          if (uc === "\"" || uc === "'" || uc === "(") {
            throw new Error(`Malformed unquoted CSS url() in ${cssRelPath}`);
          }
          j += 1;
        }
        rawUrl = cssSource.slice(valStart, j);
      }

      j = skipCssWsAndComments(cssSource, j);
      if (j >= len || cssSource[j] !== ")") {
        throw new Error(`Unsupported or unterminated CSS url() in ${cssRelPath}`);
      }
      const tokenEnd = j + 1;
      i = tokenEnd;

      if (!rawUrl || /^data:/i.test(rawUrl) || rawUrl.startsWith("#")) {
        continue;
      }

      const {targetFull, rel} = resolveAssetPath(rootDir, cssRelPath, rawUrl);
      if (path.extname(rel).toLowerCase() !== ".svg") {
        throw new Error(`Unsupported CSS asset URL "${rawUrl}" in ${cssRelPath}`);
      }
      const svgBytes = await readFile(targetFull);
      const dataUrl = `data:image/svg+xml;base64,${svgBytes.toString("base64")}`;
      result += cssSource.slice(cursor, tokenStart) + `url("${dataUrl}")`;
      cursor = tokenEnd;
      continue;
    }

    i += 1;
  }

  result += cssSource.slice(cursor);
  return result;
}

/**
 * Builds the standalone single-file KODEN MDC-2060 HTML bundle in memory
 * and optionally writes it to disk.
 */
export async function buildStandaloneHtml({
  rootDir = DEFAULT_ROOT,
  outFile,
  outPath,
  write = true,
} = {}) {
  const resolvedOutFile = outFile ?? outPath ?? path.join(rootDir, DEFAULT_OUT_REL);

  await verifyRuntimeTree(rootDir);

  const indexHtml = await readFile(path.join(rootDir, INDEX_REL), "utf8");

  // Discover module script tags in web/mdc2060/index.html
  const scriptTagRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const entryModules = [];
  for (const m of indexHtml.matchAll(scriptTagRegex)) {
    const openTag = m[0].slice(0, m[0].indexOf(">") + 1);
    const attrs = parseHtmlAttributes(openTag);
    if (attrs.get("type")?.toLowerCase() === "module" && attrs.get("src")) {
      const {rel} = resolveAssetPath(rootDir, INDEX_REL, attrs.get("src"));
      if (!entryModules.includes(rel)) entryModules.push(rel);
    }
  }
  if (entryModules.length === 0) {
    throw new Error(`No <script type="module" src="..."> entry points found in ${INDEX_REL}`);
  }

  // Recursively walk & topologically sort reachable ES modules (dependency-first)
  const visited = new Set();
  const ordered = [];
  const rewrittenModules = new Map();

  async function visitModule(modRel) {
    if (visited.has(modRel)) return;
    visited.add(modRel);

    const fullPath = path.join(rootDir, modRel);
    const source = await readFile(fullPath, "utf8");
    const toks = tokenizeModule(source);
    for (let idx = 0; idx < toks.length - 2; idx += 1) {
      if (
        toks[idx].type === "ident" && toks[idx].value === "import" &&
        toks[idx + 1].type === "punct" && toks[idx + 1].value === "." &&
        toks[idx + 2].type === "ident" && toks[idx + 2].value === "meta" &&
        !isMemberOrPrivateAccess(toks[idx - 1])
      ) {
        throw new Error(`Unsupported runtime import.meta in ${modRel}`);
      }
    }

    const specTokens = findModuleSpecifiersFromTokens(toks);
    const replacements = [];
    const deps = [];

    for (const specTok of specTokens) {
      const {targetFull, rel: depRel} = resolveAssetPath(rootDir, modRel, specTok.value);
      const st = await lstat(targetFull);
      if (!st.isFile() || st.isSymbolicLink()) {
        throw new Error(`Missing or invalid imported module "${depRel}" from ${modRel}`);
      }
      deps.push(depRel);
      replacements.push({
        start: specTok.start,
        end: specTok.end,
        replacement: JSON.stringify(SPECIFIER_PREFIX + depRel),
      });
    }

    for (const depRel of deps) {
      await visitModule(depRel);
    }

    let outCode = "";
    let lastIdx = 0;
    for (const rep of replacements) {
      outCode += source.slice(lastIdx, rep.start) + rep.replacement;
      lastIdx = rep.end;
    }
    outCode += source.slice(lastIdx);

    rewrittenModules.set(modRel, outCode);
    ordered.push(modRel);
  }

  for (const entryRel of entryModules) {
    await visitModule(entryRel);
  }

  // Verify zero unresolved relative specifiers remain in any bundled module
  const importMap = {imports: {}};
  for (const modRel of ordered) {
    const code = rewrittenModules.get(modRel);
    const checkSpecs = findModuleSpecifiers(code);
    for (const specTok of checkSpecs) {
      if (!specTok.value.startsWith(SPECIFIER_PREFIX)) {
        throw new Error(`Unresolved module specifier "${specTok.value}" remaining in ${modRel}`);
      }
    }
    importMap.imports[SPECIFIER_PREFIX + modRel] =
      `data:text/javascript;charset=utf-8;base64,${Buffer.from(code, "utf8").toString("base64")}`;
  }

  for (const modRel of ordered) {
    const code = rewrittenModules.get(modRel);
    for (const specTok of findModuleSpecifiers(code)) {
      if (!Object.hasOwn(importMap.imports, specTok.value)) {
        throw new Error(`Dangling bare specifier "${specTok.value}" in ${modRel}`);
      }
    }
  }

  // Transform web/mdc2060/index.html: inject offline CSP, inline favicon(s), stylesheet(s), importmap, and module entrypoints
  let bundledHtml = indexHtml;
  const offlineCspMeta =
    "  <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'\">";
  if (!/http-equiv=["']Content-Security-Policy["']/i.test(bundledHtml)) {
    bundledHtml = bundledHtml.replace(
      /(<meta\s+charset=["']utf-8["']\s*\/?>)/i,
      `$1\n${offlineCspMeta}`,
    );
  }
  if (!/http-equiv=["']Content-Security-Policy["']/i.test(bundledHtml)) {
    throw new Error(`Failed to inject offline Content-Security-Policy meta tag into ${INDEX_REL}`);
  }

  // 1. Inline <link ...> tags (icon & stylesheet)
  const linkMatches = [...bundledHtml.matchAll(/<link\b[^>]*>/gi)];
  for (let idx = linkMatches.length - 1; idx >= 0; idx -= 1) {
    const m = linkMatches[idx];
    const tag = m[0];
    const attrs = parseHtmlAttributes(tag);
    const relAttr = (attrs.get("rel") ?? "").toLowerCase();
    const hrefAttr = attrs.get("href");
    if (!hrefAttr) continue;

    if (relAttr.split(/\s+/).includes("icon")) {
      const {targetFull, rel} = resolveAssetPath(rootDir, INDEX_REL, hrefAttr);
      if (path.extname(rel).toLowerCase() !== ".svg") {
        throw new Error(`Expected SVG icon, got ${rel}`);
      }
      const svgBase64 = (await readFile(targetFull)).toString("base64");
      const newTag = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${svgBase64}">`;
      bundledHtml = bundledHtml.slice(0, m.index) + newTag + bundledHtml.slice(m.index + tag.length);
    } else if (relAttr.split(/\s+/).includes("stylesheet")) {
      const {targetFull, rel} = resolveAssetPath(rootDir, INDEX_REL, hrefAttr);
      const rawCss = await readFile(targetFull, "utf8");
      const inlinedCss = (await inlineCssSvgUrls(rootDir, rel, rawCss))
        .replace(/<\/style/gi, "<\\/style");
      const styleBlock = `<style>\n${inlinedCss}\n</style>`;
      bundledHtml = bundledHtml.slice(0, m.index) + styleBlock + bundledHtml.slice(m.index + tag.length);
    }
  }

  // 2. Replace <script type="module" src="..."> tags and prepend <script type="importmap">
  const importMapJson = JSON.stringify(importMap).replace(/</g, "\\u003c");
  const importMapTag = `<script type="importmap">${importMapJson}</script>`;
  const moduleScriptMatches = [...bundledHtml.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)];
  let firstModuleReplaced = false;
  let rebuiltHtml = "";
  let htmlCursor = 0;

  for (const m of moduleScriptMatches) {
    const fullTag = m[0];
    const openTag = fullTag.slice(0, fullTag.indexOf(">") + 1);
    const attrs = parseHtmlAttributes(openTag);
    if (attrs.get("type")?.toLowerCase() !== "module" || !attrs.get("src")) continue;

    const {rel} = resolveAssetPath(rootDir, INDEX_REL, attrs.get("src"));
    const inlineModuleTag = `<script type="module">import ${JSON.stringify(SPECIFIER_PREFIX + rel)};</script>`;
    const replacement = firstModuleReplaced
      ? inlineModuleTag
      : `${importMapTag}\n  ${inlineModuleTag}`;
    firstModuleReplaced = true;

    rebuiltHtml += bundledHtml.slice(htmlCursor, m.index) + replacement;
    htmlCursor = m.index + fullTag.length;
  }
  rebuiltHtml += bundledHtml.slice(htmlCursor);
  bundledHtml = rebuiltHtml;

  // Final self-contained integrity assertions
  if (ordered.length < 20) {
    throw new Error(`Expected at least 20 bundled modules, got ${ordered.length}`);
  }
  if (!/^<!doctype html>/i.test(bundledHtml.trimStart())) {
    throw new Error("Bundled HTML missing <!doctype html> declaration");
  }
  const importMapPos = bundledHtml.indexOf("<script type=\"importmap\">");
  const firstModPos = bundledHtml.indexOf("<script type=\"module\">");
  if (importMapPos === -1 || firstModPos === -1 || importMapPos > firstModPos) {
    throw new Error("<script type=\"importmap\"> must precede all <script type=\"module\"> tags");
  }
  if (/(?:href|src)\s*=\s*["']\/(?:web|src)\//i.test(bundledHtml)) {
    throw new Error("Uninlined /web/ or /src/ asset URL remaining in standalone HTML");
  }

  const htmlBytes = Buffer.from(bundledHtml, "utf8");
  const digest = sha256Hex(htmlBytes);

  if (write) {
    await mkdir(path.dirname(resolvedOutFile), {recursive: true});
    await writeFile(resolvedOutFile, htmlBytes);
  }

  return {
    status: write ? "STANDALONE_HTML_BUILT" : "STANDALONE_HTML_CHECK_PASS",
    output: toPosix(path.relative(rootDir, resolvedOutFile)),
    modulesBundled: ordered.length,
    moduleOrder: ordered,
    bytes: htmlBytes.length,
    sha256: digest,
    html: bundledHtml,
  };
}

function parseCliArgs(argv) {
  let isCheck = false;
  let outFile;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") {
      isCheck = true;
      continue;
    }
    if (arg === "--out") {
      const next = argv[i + 1];
      if (!next || next.trim() === "" || next.startsWith("-")) {
        throw new Error("Missing output file path after --out");
      }
      outFile = path.resolve(process.cwd(), next);
      i += 1;
      continue;
    }
    if (arg.startsWith("--out=")) {
      const rawOut = arg.slice("--out=".length);
      if (rawOut.trim() === "") {
        throw new Error("Missing output file path after --out=");
      }
      outFile = path.resolve(process.cwd(), rawOut);
      continue;
    }
    throw new Error(`Unknown CLI argument: ${arg}`);
  }

  return {isCheck, outFile};
}

function isCliEntrypoint() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(path.resolve(process.argv[1]));
  } catch {
    return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  }
}

if (isCliEntrypoint()) {
  try {
    const {isCheck, outFile} = parseCliArgs(process.argv.slice(2));
    const result = await buildStandaloneHtml({
      outFile,
      write: !isCheck,
    });
    const summary = isCheck
      ? {
          status: result.status,
          modulesBundled: result.modulesBundled,
          bytes: result.bytes,
          sha256: result.sha256,
        }
      : {
          status: result.status,
          output: result.output,
          modulesBundled: result.modulesBundled,
          bytes: result.bytes,
          sha256: result.sha256,
        };
    console.log(JSON.stringify(summary));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
