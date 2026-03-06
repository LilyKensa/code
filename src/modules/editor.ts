import * as ace from "ace-builds";
import LZString from "lz-string";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/ext-language_tools";

import workerJavascriptUrl from "ace-builds/src-noconflict/worker-javascript?url";

import LinterWorker from "./linter.worker.js?worker";

ace.config.set("basePath", "/code/node_modules/ace-builds/src-noconflict");
ace.config.setModuleUrl("ace/mode/javascript_worker", workerJavascriptUrl);

export class EditorManager {
  static editor: ace.Editor;

  static reloadCodeFromUrl() {
    let el = document.querySelector<HTMLDivElement>("#editor")!;

    let searchParams = new URLSearchParams(window.location.search);
    let code = searchParams.get("content") || LZString.decompressFromEncodedURIComponent(
      searchParams.get("c") || ""
    ) || `console.log("I run JavaScript code!");`;

    if (this.editor)
      this.editor.session.setValue(code);
    else
      el.textContent = code;
  }

  static init() {
    this.reloadCodeFromUrl();

    this.editor = ace.edit("editor", {
      useWorker: false,
      mode: "ace/mode/javascript",
      theme: "ace/theme/tomorrow_night",
      fontFamily: "var(--font-mono)",
      fontSize: "16px",
      selectionStyle: "text",
      showPrintMargin: false,
      tabSize: 2,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      showFoldWidgets: false,
      enableMobileMenu: false,
      useSvgGutterIcons: true
    });

    const eslintWorker = new LinterWorker();

    this.editor.session.on("change", () => {
      eslintWorker.postMessage(this.editor.getValue());
    });

    eslintWorker.addEventListener("message", (ev) => {
      const messages = ev.data as {
        line: number;
        column: number;
        message: string;
        severity: 0 | 1 | 2 | 3;
      }[];

      // Convert ESLint messages to Ace annotations
      const annotations = messages.map((msg) => ({
        row: msg.line - 1,
        column: msg.column - 1,
        text: msg.message,
        type: msg.severity >= 2 ? "error" : "warning",
      }));

      this.editor.session.setAnnotations(annotations);
    });
  }
}