export class Utils {
  static escapeHtml(str: string) {
    let match = /["'&<>]/.exec(str);
    if (!match) return str;

    let escape: string;
    let html = "";
    let index = 0, lastIndex = 0;

    for (index = match.index; index < str.length; index++) {
      switch (str.charCodeAt(index)) {
        case 34: // "
          escape = "&quot;";
          break;
        case 38: // &
          escape = "&amp;";
          break;
        case 39: // '
          escape = "&apos;";
          break;
        case 60: // <
          escape = "&lt;";
          break;
        case 62: // >
          escape = "&gt;";
          break;
        default:
          continue;
      }

      if (lastIndex !== index) {
        html += str.substring(lastIndex, index);
      }

      lastIndex = index + 1;
      html += escape;
    }

    return lastIndex !== index
      ? html + str.substring(lastIndex, index)
      : html;
  }

  static isPlain(obj: any) {
    if (typeof obj === "function")
      return false;

    if (typeof obj === "object")
      return obj === null;

    return true;
  }

  static getParamNames(code: string) {
    let COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    let DEFAULT_PARAMS = /=[^,]+/mg;
    let FAT_ARROWS = /=>.*$/mg;

    code = code
      .replace(COMMENTS, "")
      .replace(FAT_ARROWS, "")
      .replace(DEFAULT_PARAMS, "");

    let result = code.slice(code.indexOf("(") + 1, code.indexOf(")"))
      .match(/([^\s,]+)/g);

    return result === null
      ? []
      : result;
  }
}