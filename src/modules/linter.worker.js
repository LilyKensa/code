import { Linter } from "eslint-linter-browserify";

const linter = new Linter();

self.addEventListener("message", (ev) => {
  self.postMessage(linter.verify(ev.data, {
    rules: { semi: ["error", "always"] }
  }));
});