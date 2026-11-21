import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// JANITOR may call only its own tools: the deterministic CLI owns every write, the clean-tree check, and every commit.
const gatedRole = "JANITOR";
const janitorTools = new Set (["read_range", "scan_rule", "set_status", "fix_batch"]);
const toolScopeReason = "CAROL gate: JANITOR calls only read_range, scan_rule, set_status, and fix_batch.";
const trackerName = /^CLEAN-UP-(.+)\.md$/;
const trackerScript = join (homedir(), ".carol", "local", "janitor", "tracker.lua");
const fixBatchTool = "fix_batch";
const pendingPattern = /^pending: [1-9]/m;

export default function (pi: ExtensionAPI)
{
  if (process.env.CAROL_ROLE === gatedRole)
  {
    // The handoff is built from the tracker alone, so a compaction resumes at the right row.
    const getHandoff = async (cwd: string, signal?: AbortSignal): Promise<string | undefined> =>
    {
      const subjects = readdirSync (cwd).map ((name) => name.match (trackerName)?.[1]).filter ((subject) => subject !== undefined);

      if (subjects.length === 1)
      {
        const result = await pi.exec ("nvim", ["--headless", "-l", trackerScript, "--subject", subjects[0], "--handoff"], { cwd, signal });
        if (result.code === 0) return result.stdout;
      }
    };

    pi.on ("tool_call", async (event) =>
    {
      if (! janitorTools.has (event.toolName)) return { block: true, reason: toolScopeReason, terminate: true };
    });

    pi.on ("session_before_compact", async (event, ctx) =>
    {
      const handoff = await getHandoff (ctx.cwd, event.signal);

      if (handoff !== undefined)
      {
        return {
          compaction: {
            summary: handoff,
            firstKeptEntryId: event.preparation.firstKeptEntryId,
            tokensBefore: event.preparation.tokensBefore,
          },
        };
      }
    });

    pi.on ("turn_end", async (event, ctx) =>
    {
      const batchResult = event.toolResults.find ((result) => result.toolName === fixBatchTool && ! result.isError);
      const batchText = batchResult?.content.map ((part) => (part.type === "text" ? part.text : "")).join ("") ?? "";

      if (pendingPattern.test (batchText))
      {
        const handoff = await getHandoff (ctx.cwd);

        if (handoff !== undefined)
        {
          return { entries: [...event.entries, { type: "compaction", summary: handoff, firstKeptEntryId: null }], continue: true };
        }
      }
    });
  }
}
