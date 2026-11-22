import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";

// JANITOR's tools: thin bindings of the deterministic CLI in ~/.carol/local/janitor.
// The model reads with read_range and changes the tree only through scan_rule, set_status, and fix_batch.
const gatedRole = "JANITOR";
const janitorRoot = join (homedir(), ".carol", "local", "janitor");
const maxRangeLines = 80;
const runTimeoutMs = 600000;
const atPrefix = /^@/;

type ToolResult = { content: { type: "text"; text: string }[]; details: undefined; isError: boolean };

function getResult (text: string, isError: boolean): ToolResult {
  return { content: [{ type: "text", text }], details: undefined, isError };
}

function getProjectPath (cwd: string, relative: string): string {
  const root = resolve (cwd);
  const target = resolve (root, relative.replace (atPrefix, ""));
  if (target !== root && ! target.startsWith (root + sep)) throw new Error (`path outside the repository: ${relative}`);
  return target;
}

export default function (pi: ExtensionAPI) {
  if (process.env.CAROL_ROLE === gatedRole) {
    const runTool = async (script: string, args: string[], cwd: string, signal?: AbortSignal): Promise<ToolResult> => {
      const result = await pi.exec ("nvim", ["--headless", "-l", join (janitorRoot, script), ...args], { cwd, signal, timeout: runTimeoutMs });
      const isError = result.code !== 0;
      const errorLine = result.stderr.split ("\n").find ((line) => line.trim().length > 0) ?? `exit ${result.code}`;
      return getResult (isError ? errorLine : result.stdout.trim(), isError);
    };

    pi.registerTool ({
      name: "read_range",
      label: "Read range",
      description: "Read numbered lines of a file in the repository: each line starts with its 1-based number and a tab. At most 80 lines per call.",
      parameters: Type.Object ({
        path: Type.String ({ description: "File path, relative to the repository root" }),
        firstLine: Type.Integer ({ minimum: 1, description: "First line to read, 1-based" }),
        count: Type.Integer ({ minimum: 1, maximum: maxRangeLines, description: "Number of lines to read" }),
      }),
      async execute (toolCallId, params, signal, onUpdate, ctx) {
        const lines = readFileSync (getProjectPath (ctx.cwd, params.path), "utf8").split ("\n");
        const last = Math.min (params.firstLine + params.count - 1, lines.length);
        const numbered: string[] = [];
        for (let line = params.firstLine; line <= last; ++line) numbered.push (`${line}\t${lines[line - 1]}`);
        return getResult (numbered.join ("\n"), false);
      },
    });

    pi.registerTool ({
      name: "scan_rule",
      label: "Scan rules",
      description:
        "Scan the given paths for violations of the given CODING.md / NAMES.md sections or rules. With subject and objective, it writes CLEAN-UP-<subject>.md at the repository root " +
        "and returns the counts and the first batch. With check true, it lists the findings and writes nothing. Sections: all, coding, formatting, pointers, literals, namespaces, " +
        "modern-cpp, structure, control-flow, names.",
      parameters: Type.Object ({
        rules: Type.Array (Type.String(), { minItems: 1, description: "Section names (all, coding, formatting, pointers, literals, namespaces, modern-cpp, structure, control-flow, names) or rule ids" }),
        paths: Type.Array (Type.String(), { minItems: 1, description: "Files or directories, relative to the repository root" }),
        subject: Type.Optional (Type.String ({ description: "Campaign subject in kebab-case; names CLEAN-UP-<subject>.md" })),
        objective: Type.Optional (Type.String ({ description: "One sentence: the invariant the campaign enforces" })),
        check: Type.Optional (Type.Boolean ({ description: "true: list findings only, write nothing" })),
      }),
      async execute (toolCallId, params, signal, onUpdate, ctx) {
        const args = ["--rules", params.rules.join (",")];
        if (params.check === true) args.push ("--check");
        if (params.subject !== undefined) args.push ("--subject", params.subject);
        if (params.objective !== undefined) args.push ("--objective", params.objective);
        return runTool ("scan.lua", [...args, ...params.paths], ctx.cwd, signal);
      },
    });

    pi.registerTool ({
      name: "set_status",
      label: "Flag a row",
      description:
        "Change one PENDING fix row of CLEAN-UP-<subject>.md to a flag, with the reason. Use it when a row needs a judgment that the fix cannot make. " +
        "fix_batch then marks the row FLAGGED and leaves its code untouched.",
      parameters: Type.Object ({
        subject: Type.String ({ description: "Campaign subject" }),
        row: Type.String ({ description: "Row ID, for example 007" }),
        reason: Type.String ({ description: "Why the row needs ARCHITECT, in one sentence" }),
      }),
      async execute (toolCallId, params, signal, onUpdate, ctx) {
        return runTool ("tracker.lua", ["--subject", params.subject, "--row", params.row, "--flag", params.reason], ctx.cwd, signal);
      },
    });

    pi.registerTool ({
      name: "fix_batch",
      label: "Fix the next batch",
      description:
        "Fix the next batch of CLEAN-UP-<subject>.md: apply the fix rows through carol apply, verify the parse and a rescan, mark the rows DONE or FLAGGED, " +
        "and commit. It returns the result and the next batch. It returns 'complete' when no PENDING row is left.",
      parameters: Type.Object ({
        subject: Type.String ({ description: "Campaign subject" }),
      }),
      async execute (toolCallId, params, signal, onUpdate, ctx) {
        return runTool ("fix.lua", ["--subject", params.subject], ctx.cwd, signal);
      },
    });
  }
}
