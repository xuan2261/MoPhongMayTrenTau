import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {projectFcvSourceCue} from "../web/lcd-instructor-meta.mjs";

const root = new URL("../", import.meta.url);
const [html, css, meta] = await Promise.all([
  readFile(new URL("web/index.html", root), "utf8"),
  readFile(new URL("web/styles.css", root), "utf8"),
  readFile(new URL("web/lcd-instructor-meta.mjs", root), "utf8"),
]);
const header = html.slice(html.indexOf("<header class=\"masthead\">"),
  html.indexOf("</header>") + "</header>".length);
const disclaimer = html.match(/<p class="disclaimer">([\s\S]*?)<\/p>/)?.[1] ?? "";

test("V57 keeps one canonical public-reference notice in the masthead", () => {
  assert.equal((html.match(/PUBLIC REFERENCE \/ NOT HARDWARE VALIDATED \/ TRAINING ONLY/g) ?? []).length, 1);
  assert.match(header, /class="public-reference-banner" role="note"/);
  assert.match(header, /PUBLIC REFERENCE \/ NOT HARDWARE VALIDATED \/ TRAINING ONLY/);
  assert.doesNotMatch(html, /class="state-chip"|MARITIME INSTRUMENT TRAINING LAB|MÔI TRƯỜNG GIẢ LẬP/);
});

test("V57 removes repeated eyebrow and keeps a concise, truthful console heading", () => {
  assert.match(html, /FCV-588\s*<span>Training Console<\/span>/);
  assert.match(html, /Mô phỏng độc lập từ manual công khai\./);
  assert.doesNotMatch(html, /THỰC HÀNH TƯƠNG TÁC · MÁY ĐO SÂU/);
  assert.doesNotMatch(header, /CHƯA XÁC NHẬN PHẦN CỨNG/);
});

test("V57 preserves live MODE state and concise synthetic-echo source cue", () => {
  assert.match(meta, /title:"MODE hiện tại: "\+\(state\.mode/);
  assert.match(meta, /detail:"Hồi âm mô phỏng\. Không kết nối đầu dò\."/);
});

test("V57 retains explicit no-hardware and no-navigation safety disclaimer", () => {
  assert.match(disclaimer, /minh họa sinh bằng thuật toán/);
  assert.match(disclaimer, /Không kết nối đầu dò, hệ thống hàng hải hoặc thiết bị phát sóng/);
  assert.match(disclaimer, /Không sử dụng để dẫn tàu thực tế/);
});

test("V57 compact masthead remains visible and responsive at phone width", () => {
  assert.match(css, /\.masthead\s*\{[^}]*padding:/s);
  assert.match(css, /\.public-reference-banner\s*\{[^}]*margin:\s*0/s);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.public-reference-banner/);
});
test("V57 runtime MODE cue keeps its live mode and short synthetic-source label", () => {
  const cue = projectFcvSourceCue({power:"on",mode:"LF",overlay:null},0);
  assert.equal(cue.visible,true);
  assert.equal(cue.title,"MODE hiện tại: LF");
  assert.equal(cue.detail,"Hồi âm mô phỏng. Không kết nối đầu dò.");
});