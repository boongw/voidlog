import { parser as createTokenParser } from "stream-json";
import type { Readable } from "node:stream";
import type { EiPlayer, EiRoot } from "./ei-json-shape.js";
import { type JsonToken, type JsonValue, SkipTracker, ValueBuilder } from "./value-builder.js";

/**
 * Selective/streaming extraction of an EI JSON report (ADR-008): the
 * response can be tens of MB, almost entirely `players`/`targets` data we
 * don't need. This never materializes the full document. It keeps a
 * fixed, small set of root fields whole, iterates `players` one element
 * at a time, and within each player keeps only a fixed field list —
 * everything else (including all of `targets`) is skipped without ever
 * being assembled into a JS value.
 */

const ROOT_KEEP_WHOLE = new Set([
  "duration",
  "durationMS",
  "success",
  "isCM",
  "phases",
  "mechanics",
  "fightName",
  "triggerID",
]);

const PLAYER_KEEP_WHOLE = new Set(["account", "name", "profession", "group", "dpsAll", "defenses"]);

type State =
  | "expect-root-start"
  | "root-key"
  | "root-value-dispatch"
  | "filling-root-keep"
  | "skipping-root"
  | "in-players-array"
  | "player-key"
  | "player-value-dispatch"
  | "filling-player-keep"
  | "skipping-player"
  | "done";

export interface ExtractedEncounter {
  root: EiRoot;
  players: EiPlayer[];
}

export function extractEncounterFromStream(jsonStream: Readable): Promise<ExtractedEncounter> {
  return new Promise((resolve, reject) => {
    const tokenStream = jsonStream.pipe(createTokenParser());

    let state: State = "expect-root-start";
    const root: Record<string, JsonValue> = {};
    let currentRootKey: string | undefined;
    let rootBuilder: ValueBuilder | undefined;
    let rootSkip: SkipTracker | undefined;

    let currentPlayer: Record<string, JsonValue> | undefined;
    let currentPlayerKey: string | undefined;
    let playerBuilder: ValueBuilder | undefined;
    let playerSkip: SkipTracker | undefined;
    const players: EiPlayer[] = [];

    function handleToken(token: JsonToken): void {
      switch (state) {
        case "expect-root-start":
          if (token.name !== "startObject") {
            throw new Error(`Expected EI JSON root to be an object, got "${token.name}"`);
          }
          state = "root-key";
          return;

        case "root-key":
          if (token.name === "endObject") {
            state = "done";
            return;
          }
          if (token.name !== "keyValue") {
            throw new Error(`Expected a root object key, got "${token.name}"`);
          }
          currentRootKey = String(token.value);
          state = "root-value-dispatch";
          return;

        case "root-value-dispatch": {
          const key = currentRootKey as string;
          if (key === "players") {
            if (token.name !== "startArray") {
              throw new Error('Expected "players" to be an array');
            }
            state = "in-players-array";
            return;
          }
          if (ROOT_KEEP_WHOLE.has(key)) {
            rootBuilder = new ValueBuilder();
            rootBuilder.push(token);
            if (rootBuilder.done) {
              root[key] = rootBuilder.value;
              rootBuilder = undefined;
              state = "root-key";
            } else {
              state = "filling-root-keep";
            }
          } else {
            rootSkip = new SkipTracker();
            rootSkip.push(token);
            if (rootSkip.done) {
              rootSkip = undefined;
              state = "root-key";
            } else {
              state = "skipping-root";
            }
          }
          return;
        }

        case "filling-root-keep":
          rootBuilder!.push(token);
          if (rootBuilder!.done) {
            root[currentRootKey as string] = rootBuilder!.value;
            rootBuilder = undefined;
            state = "root-key";
          }
          return;

        case "skipping-root":
          rootSkip!.push(token);
          if (rootSkip!.done) {
            rootSkip = undefined;
            state = "root-key";
          }
          return;

        case "in-players-array":
          if (token.name === "endArray") {
            state = "root-key";
            return;
          }
          if (token.name !== "startObject") {
            throw new Error(`Expected a player object, got "${token.name}"`);
          }
          currentPlayer = {};
          state = "player-key";
          return;

        case "player-key":
          if (token.name === "endObject") {
            players.push(currentPlayer as unknown as EiPlayer);
            currentPlayer = undefined;
            state = "in-players-array";
            return;
          }
          if (token.name !== "keyValue") {
            throw new Error(`Expected a player object key, got "${token.name}"`);
          }
          currentPlayerKey = String(token.value);
          state = "player-value-dispatch";
          return;

        case "player-value-dispatch": {
          const key = currentPlayerKey as string;
          if (PLAYER_KEEP_WHOLE.has(key)) {
            playerBuilder = new ValueBuilder();
            playerBuilder.push(token);
            if (playerBuilder.done) {
              currentPlayer![key] = playerBuilder.value;
              playerBuilder = undefined;
              state = "player-key";
            } else {
              state = "filling-player-keep";
            }
          } else {
            playerSkip = new SkipTracker();
            playerSkip.push(token);
            if (playerSkip.done) {
              playerSkip = undefined;
              state = "player-key";
            } else {
              state = "skipping-player";
            }
          }
          return;
        }

        case "filling-player-keep":
          playerBuilder!.push(token);
          if (playerBuilder!.done) {
            currentPlayer![currentPlayerKey as string] = playerBuilder!.value;
            playerBuilder = undefined;
            state = "player-key";
          }
          return;

        case "skipping-player":
          playerSkip!.push(token);
          if (playerSkip!.done) {
            playerSkip = undefined;
            state = "player-key";
          }
          return;

        case "done":
          return;
      }
    }

    tokenStream.on("data", (token: JsonToken) => {
      try {
        handleToken(token);
      } catch (err) {
        tokenStream.destroy();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

    tokenStream.on("error", (err: Error) => reject(err));

    tokenStream.on("end", () => {
      if (typeof root.success !== "boolean") {
        reject(new Error('EI JSON root is missing required boolean field "success"'));
        return;
      }
      if (!Array.isArray(root.phases) || root.phases.length === 0) {
        reject(new Error('EI JSON root is missing a non-empty "phases" array'));
        return;
      }
      resolve({ root: root as unknown as EiRoot, players });
    });
  });
}
