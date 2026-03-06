import LZString from "lz-string";

import { EditorManager } from "./modules/editor";
import { RunnerManager } from "./modules/runner";

import "./style.css";

import helpHtml from "./help.html?raw";
import { Utils } from "./modules/utils";

let isIframe = window.parent !== window;
if (isIframe) document.body.classList.add("embed");

let versionText = document.querySelector<HTMLSpanElement>(".version")!;
versionText.innerText = import.meta.env.VERSION;

let container = document.querySelector<HTMLDivElement>(".split-container")!;
let resizer = document.querySelector<HTMLDivElement>(".resizer")!;
let topPane = document.querySelector<HTMLDivElement>(".top-pane")!;
let bottomPane = document.querySelector<HTMLDivElement>(".bottom-pane")!;
let bottomInner = document.querySelector<HTMLDivElement>(".bottom-inner")!;
let result = document.querySelector<HTMLDivElement>(".result")!;

let bottomPanePadding = Number.parseInt(bottomPane.computedStyleMap().get("padding")!.toString());

function setSplitRatio(percent: number) {
  document.body.setAttribute("data-split-percent", percent.toFixed(4));
  topPane.style.flex = `0 0 ${percent}%`;
}
setSplitRatio(window.innerHeight > 200 ? 56 : 50 - 1600 / window.innerHeight);

function onResize() {
  if (container.clientHeight === 0) {
    window.requestAnimationFrame(onResize);
    return;
  }

  bottomInner.style.maxHeight = container.clientHeight 
    * (1 - Number.parseFloat(document.body.getAttribute("data-split-percent")!) / 100)
    - resizer.clientHeight 
    - bottomPanePadding * 2 
    + "px";
}
onResize();
window.addEventListener("resize", () => {
  onResize();
})

const hitboxThreshold = Math.min(window.innerHeight / 20, 10), minResizePercentage = 20;

function inResizerHitbox(y: number) {
  return y >= resizer.offsetTop - hitboxThreshold 
      && y <= resizer.offsetTop + resizer.clientHeight + hitboxThreshold;
}

let dragOffset: number | null = null;

window.addEventListener("mousedown", (ev) => {
  if (!inResizerHitbox(ev.clientY)) return;

  dragOffset = ev.clientY - resizer.offsetTop;
  document.body.style.userSelect = "none";
});

window.addEventListener("mousemove", (ev) => {
  let hovering = inResizerHitbox(ev.clientY) || dragOffset;
  document.body.classList[hovering ? "add" : "remove"]("resize-hover");

  if (!dragOffset) return;
  
  const relativeY = ev.clientY - dragOffset - container.offsetTop;
  const percent = (relativeY / container.clientHeight) * 100;

  if (
    percent >= minResizePercentage && 
    percent <= 100 - minResizePercentage
  ) {
    setSplitRatio(percent);
    onResize();
  }
});

window.addEventListener("mouseup", () => {
  dragOffset = null;
  document.body.style.userSelect = "auto";
});

EditorManager.init();

function makeUrl() {
  let url = new URL(window.location.href);
  let code = EditorManager.editor.session.getValue();
  let compressed = LZString.compressToEncodedURIComponent(code);
  
  url.searchParams.delete("c");
  url.searchParams.delete("content");

  if (code) {
    url.searchParams.set("c", compressed);
  }

  return url;
}

function clearResults() {
  result.innerHTML = "";
}

function addResult(text: string, level = "log") {
  let atBottom = result.scrollHeight - result.scrollTop <= result.clientHeight;

  let el = document.createElement("pre");
  el.classList.add("line", level);
  el.innerHTML = text;
  result.appendChild(el);

  if (atBottom) result.scrollTo({ top: Number.MAX_SAFE_INTEGER });
}

async function copyResult() {
  try {
    window.getSelection()!.setBaseAndExtent(result, 0, result, 1);
    await navigator.clipboard.writeText(result.textContent);
  }
  catch (err) {
    console.error(err);
  }
}

let runButton = document.querySelector<HTMLButtonElement>(".run")!;
let makeUrlButton = document.querySelector<HTMLButtonElement>(".make-url")!;
let makeEmbedButton = document.querySelector<HTMLButtonElement>(".make-embed")!;
let dupeTabButton = document.querySelector<HTMLButtonElement>(".dupe-tab")!;
let helpButton = document.querySelector<HTMLButtonElement>(".help")!;

runButton.addEventListener("click", () => {
  RunnerManager.end();
  clearResults();
  RunnerManager.runCodeInWorker(EditorManager.editor.session.getValue(), (message, level) => {
    addResult(message, level);
  });
});

makeUrlButton.addEventListener("click", () => {
  RunnerManager.end();
  clearResults();
  addResult(Utils.escapeHtml(makeUrl().toString()));
  copyResult();
});

makeEmbedButton.addEventListener("click", () => {
  RunnerManager.end();
  clearResults();
  addResult(Utils.escapeHtml(`<iframe allow="modal" src="${makeUrl()}"></iframe>"`));
  copyResult();
});

dupeTabButton.addEventListener("click", () => {
  window.open(window.location.href, "_blank");
});

helpButton.addEventListener("click", () => {
  clearResults();
  addResult(helpHtml);
});

window.addEventListener("keydown", (ev) => {
  if (ev.ctrlKey) {
    switch (ev.code) {
      case "KeyS": {
        ev.preventDefault();
        
        window.history.pushState({}, "unused", makeUrl()); 
        break;
      }
    }
  }
});

window.addEventListener("popstate", () => {
  EditorManager.reloadCodeFromUrl();
});

window.addEventListener("beforeunload", () => {
  RunnerManager.end();
});

setTimeout(() => {
  document.documentElement.classList.add("loaded");
}, 50);