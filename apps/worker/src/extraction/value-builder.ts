/**
 * Small helpers used by the selective token-stream extractor
 * (extract-encounter.ts). Kept separate so the state machine there stays
 * readable.
 */

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface JsonToken {
  name: string;
  value?: unknown;
}

/**
 * Assembles a single JSON value (scalar, object, or array) from a token
 * stream, starting from the token that opens it. Used for the small
 * number of fields we want to keep in full (ADR-008: phases, mechanics,
 * a handful of per-player fields) — never for the whole document.
 */
export class ValueBuilder {
  private readonly stack: JsonValue[] = [];
  private readonly keyStack: (string | undefined)[] = [];
  value: JsonValue = null;
  done = false;

  push(token: JsonToken): void {
    switch (token.name) {
      case "startObject":
        this.open({});
        break;
      case "startArray":
        this.open([]);
        break;
      case "endObject":
      case "endArray":
        this.close();
        break;
      case "keyValue":
        this.keyStack[this.keyStack.length - 1] = String(token.value);
        break;
      case "stringValue":
        this.scalar(String(token.value));
        break;
      case "numberValue":
        this.scalar(Number(token.value));
        break;
      case "nullValue":
        this.scalar(null);
        break;
      case "trueValue":
        this.scalar(true);
        break;
      case "falseValue":
        this.scalar(false);
        break;
      default:
        break;
    }
  }

  private open(container: JsonValue): void {
    if (this.stack.length > 0) this.attach(container);
    this.stack.push(container);
    this.keyStack.push(undefined);
  }

  private close(): void {
    const finished = this.stack.pop();
    this.keyStack.pop();
    if (finished === undefined) return;
    if (this.stack.length === 0) {
      this.value = finished;
      this.done = true;
    }
  }

  private scalar(v: JsonValue): void {
    if (this.stack.length === 0) {
      this.value = v;
      this.done = true;
      return;
    }
    this.attach(v);
  }

  private attach(v: JsonValue): void {
    const top = this.stack[this.stack.length - 1];
    if (Array.isArray(top)) {
      top.push(v);
      return;
    }
    if (top && typeof top === "object") {
      const key = this.keyStack[this.keyStack.length - 1];
      if (key !== undefined) {
        (top as Record<string, JsonValue>)[key] = v;
        this.keyStack[this.keyStack.length - 1] = undefined;
      }
    }
  }
}

/**
 * Tracks nesting depth of a value we intentionally discard, without ever
 * building it. This is what keeps memory bounded for fields like
 * `targets` and the large per-player buff/rotation blocks (ADR-008).
 */
export class SkipTracker {
  private depth = 0;
  private started = false;
  done = false;

  push(token: JsonToken): void {
    switch (token.name) {
      case "startObject":
      case "startArray":
        this.depth++;
        this.started = true;
        break;
      case "endObject":
      case "endArray":
        this.depth--;
        if (this.depth === 0) this.done = true;
        break;
      default:
        if (!this.started) this.done = true;
        break;
    }
  }
}
