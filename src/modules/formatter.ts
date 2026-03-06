import { Utils } from "./utils";

export class Formatter {
  static format(obj: any) {
    let refs: object[] = [];

    // Must be written like this
    // `Utils` will be inject into web worker using function strings
    const 
      escapeHtml = Utils.escapeHtml, 
      getParamNames = Utils.getParamNames,
      isPlain = Utils.isPlain;

    const wrap = (name: string, text: string) =>
      `<span class="format ${name}">${escapeHtml(text)}</span>`;

    let 
      colon = wrap("colon", ":"), 
      arrow = wrap("arrow", "=>"), 
      comma = wrap("comma", ","), 
      dash = wrap("dash", "-");

    const indent = (lines: string[], level: number) => lines.map(line => "  ".repeat(level) + line);

    const measure = (input: string) => input.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, "_").length;

    const recurse = (obj: any, level: number): string => {
      switch (typeof obj) {
        case "string": {
          if (level === 0) 
            return wrap("plain-string", obj);

          return wrap("string", `"${obj}"`);
        }
        case "number": case "bigint": {
          if (Number.isNaN(obj))
            return wrap("nan", "NaN");
          if (!Number.isFinite(obj))
            return wrap("infinity", "Infinity");

          return obj < 0 || Object.is(obj, -0)
            ? dash + recurse(-obj, level) 
            : wrap("number", obj.toString());
        }
        case "boolean": {
          return wrap("boolean", obj ? "true" : "false");
        }
        case "symbol": {
          return wrap("symbol", `[${obj.description}]`);
        }
        
        case "function": {
          let code: string = obj.toString();
          if (/^class/.test(code)) {
            return wrap("class", `[Class ${obj.name}]`);
          }

          return wrap("function-prefix", "f") + " " + wrap(
            "function", 
            obj.name || "[anonymous]"
          ) + wrap("bracket", "(") + getParamNames(code).map(p => 
            wrap("param", p)
          ).join(comma + " ") + wrap("bracket", ")");
        }
        case "undefined": {
          return wrap("undefined", "undefined");
        }
        case "object": {
          if (obj === null) {
            return wrap("null", "null");
          }

          if (obj instanceof RegExp) {
            return wrap("regex", obj.toString());
          }

          if (obj instanceof Array) {
            let plain = obj.every(isPlain);

            let mapped: string[] = [];
            for (let [i, item] of obj.entries()) {
              let str = recurse(item, level + 1);
              mapped.push(i === obj.length - 1 ? str : str + comma);
            }

            if (mapped.reduce((value, item) => value + measure(item), 0) <= 24) {
              return [
                wrap("bracket", "["),
                ...mapped,
                wrap("bracket", "]")
              ].join(" ");
            }

            mapped[mapped.length - 1] += " ";

            if (plain) {
              let allNumber = obj.every(item => typeof item === "number");

              let maxLength = 0;
              for (let item of mapped) {
                let length = measure(item);
                if (length > maxLength)
                  maxLength = length;
              }

              let perLine = Math.floor((32 - level * 2) / (maxLength + 1));

              mapped = mapped.map(item => {
                let fill = " ".repeat(maxLength - measure(item));

                if (allNumber)
                  return fill + item;
                else
                  return item + fill;
              });

              let lines: string[] = [];

              let currentLine = []; 
              
              for (let item of mapped) {
                currentLine.push(item);

                if (currentLine.length >= perLine) {
                  lines.push(currentLine.join(" "));
                  currentLine = [];
                }
              }
              if (currentLine.length) lines.push(currentLine.join(" "));

              mapped = lines;
            }

            return wrap("bracket", "[") + "\n" + indent([
              ...indent(mapped, 1),
              wrap("bracket", "]")
            ], level).join("\n");
          }

          if (![Object, Map].includes(obj.constructor)) {
            if (obj.toString === Object.prototype.toString)
              return wrap("instance", `[Object ${obj.constructor.name}]`);
            else
              return wrap("custom", obj.toString())
          }

          let refIndex = refs.indexOf(obj);
          if (refIndex !== -1) {
            return wrap("circular", `[Circular ×${level - refIndex}]`);
          }
          
          refs.push(obj);

          let mapped: string[] = [];

          if (obj instanceof Map) {
            for (let [key, value] of obj.entries()) {
              mapped.push(`${recurse(key, level + 1)} ${arrow} ${recurse(value, level + 1)}`)
            }
          }
          else {
            if (!Object.keys(obj).length) return wrap("bracket", "{}");

            for (let key in obj) {
              mapped.push(`${wrap("key", key)}${colon} ${recurse(obj[key], level + 1)}`)
            }
          }

          refs.pop();

          for (let i = 0; i < mapped.length - 1; ++i) {
            mapped[i] += comma;
          }

          return wrap("bracket", "{") + "\n" + indent([
            ...indent(mapped, 1),
            wrap("bracket", "}")
          ], level).join("\n");
        }
      }
    }

    return recurse(obj, 0);
  }
}