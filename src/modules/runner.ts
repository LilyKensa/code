import { Formatter } from "./formatter";
import { Utils } from "./utils";

export class RunnerManager {
  static currentWorker: Worker;

  static end() {
    if (!this.currentWorker) return;
    this.currentWorker.terminate();
  }

  static supportUiRequest = true;

  static runCodeInWorker(code: string, report?: (message: string, level: string) => void) {
    if (typeof SharedArrayBuffer === "undefined") {
      this.supportUiRequest = false;
      window.SharedArrayBuffer = ArrayBuffer as any;
    }

    const sab = new SharedArrayBuffer(1024);
    const int32 = new Int32Array(sab);
    const uint8 = new Uint8Array(sab);

    const encoder = new TextEncoder();

    const workerCode = /* js */ `
      self.name = "Code Runner Worker";

      function __post(data) {
        try {
          self.postMessage(data);
        }
        catch (err) {
          throw err instanceof DOMException && err.name === "DataCloneError"
            ? new TypeError("Trying to post something that cannot be cloned")
            : err;
        }
      }

      function __postPayload(type, args) {
        __post({ type, args });
      }

      function __run() {
        try {
// START USER CODE
${code}
// END USER CODE
        } 
        catch (err) {
          __postPayload("error", [
            err instanceof Error
              ? err.stack.split("\\n").slice(0, -1).map(line => 
                /^\\s*at (__|console|self)/.test(line) 
                  ? line.replace(/\\(.+\\)/g, "(internel)") 
                  : line
              ).join("\\n").replace(
                /blob:https?:\\/\\/[^\\/]+\\/[a-z0-9-]+:(\\d+):(\\d+)/g, 
                (match, line, column) => {
                  return "runner.js:" + (line - 20) + ":" + column;
                }
              )
              : __format(err).replace(/<[^>]*>/g, "")
          ]);
        }
      }

      const __format = function ${Formatter.format.toString().replace(/\w+\.(escapeHtml|getParamNames|isPlain)/g, (_, name) =>
        `(function ${(Utils[name as keyof Utils] as Function).toString()})`
      )};

      let __int32;

      self.addEventListener("message", (ev) => {
        switch (ev.data.type) {
          case "init": {
            __int32 = new Int32Array(ev.data.buffer);
            break;
          }
          case "run": {
            __run();
            break;
          }
        }
      });

      const __supportUiRequest = typeof SharedArrayBuffer !== "undefined";

      function __reportNoUiRequest(feature) {
        if (__supportUiRequest) return false;

        __postPayload("warn", [
          "Warning: 'window." + feature + "' is not supported in this environment"
        ]);
        return true;
      }

      self.alert = (...args) => {
        if (__reportNoUiRequest("alert")) return;

        Atomics.store(__int32, 0, 0);

        __post({ type: "ui-request", method: "alert", args });

        Atomics.wait(__int32, 0, 0);
      };

      self.confirm = (...args) => {
        if (__reportNoUiRequest("alert")) return false;
        
        Atomics.store(__int32, 0, 0);

        __post({ type: "ui-request", method: "confirm", args });

        Atomics.wait(__int32, 0, 0);

        return !!Atomics.load(__int32, 1);
      };

      const __decoder = new TextDecoder();

      self.prompt = (...args) => {
        if (__reportNoUiRequest("alert")) return null;
        
        Atomics.store(__int32, 0, 0);

        __post({ type: "ui-request", method: "prompt", args });

        Atomics.wait(__int32, 0, 0);

        return __int32[1]
          ? __decoder.decode(new Uint8Array(__int32.buffer, 12, __int32[2]).slice())
          : null;
      };

      const 
        __consoleLog = console.log, 
        __consoleInfo = console.info,
        __consoleDebug = console.debug,
        __consoleWarn = console.warn, 
        __consoleError = console.error;

      console.log = (...args) => {
        __postPayload("log", args.map(__format));
      };
      console.info = (...args) => {
        __postPayload("info", args.map(__format));
      };
      console.debug = (...args) => {
        __postPayload("debug", args.map(__format));
      };
      console.warn = (...args) => {
        __postPayload("warn", args.map(__format));
      };
      console.error = (...args) => {
        __postPayload("error", args.map(__format));
      };

      const __timers = new Map();
      
      console.time = (label = "default") => {
        __timers.set(label, performance.now());
      };
      console.timeEnd = (label = "default") => {
        const startTime = __timers.get(label);

        if (startTime) {
          const duration = performance.now() - startTime;
          __postPayload("log", [label + ": " + duration.toFixed(10) + "ms"]);
          __timers.delete(label);
        } 
        else {
          __post("warn", ["Timer '" + label + "' does not exist"]);
        }
      };

      function __reportNoAccess(prop) {
        throw new SyntaxError("'window." + prop + "' is not available");
      }

      const __fakeWindow = new Proxy({}, {
        get(target, prop) {
          const value = Reflect.get(self, prop);

          if (value) {
            return typeof value === "function"
              ? value.bind(self)
              : value;
          }

          __reportNoAccess(prop);
        },
        set(target, prop, value) {
          return Reflect.set(self, prop, value);
        },
        apply(target, that, args) {
          throw new TypeError("window is not a function");
        }
      });

      Object.defineProperty(self, 'window', {
        get: () => __fakeWindow,
        configurable: false,
        enumerable: false
      });
    `;

    const workerUrl = URL.createObjectURL(
      new Blob([workerCode], { type: "application/javascript" })
    );
    
    const worker = new Worker(workerUrl);
    worker.postMessage({ type: "init", buffer: sab });

    worker.addEventListener("message", async (ev) => {
      const { type, args } = ev.data as {
        type: string,
        args: any[]
      };

      switch (type) {
        case "ui-request": {
          const { method } = ev.data as {
            method: keyof Window
          };
          
          const result: any = await new Promise((resolve) => {
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                resolve(window[method].apply(window, args));
              });
            });
          }); 

          switch (method) {
            case "confirm": {
              int32[1] = result ? 1 : 0;
              break;
            }
            case "prompt": {
              if (result === null) {
                int32[1] = 0;
              }
              else {
                const encoded = encoder.encode(result);

                int32[1] = 1;
                int32[2] = encoded.length;

                uint8.set(encoded, 12);
              }
              break;
            }
          }

          Atomics.store(int32, 0, 1); 
          Atomics.notify(int32, 0, 1);
          break;
        }
        case "log": case "info": case "debug": case "warn": case "error": {
          report?.(args.join(" "), type);
          break;
        } 
      }
    });

    worker.addEventListener("error", (ev) => {
      report?.(ev.message.replace(/^Uncaught\s+/, ""), "error");
    });

    worker.postMessage({ type: "run" });

    this.currentWorker = worker;
    URL.revokeObjectURL(workerUrl);
  }
}