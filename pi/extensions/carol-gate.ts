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

export default function (pi: ExtensionAPI)
{
  if (process.env.CAROL_ROLE === gatedRole)
  {
    pi.on ("tool_call", async (event) =>
    {
      if (! janitorTools.has (event.toolName)) return { block: true, reason: toolScopeReason, terminate: true };
    });

    // The handoff is built from the tracker alone, so a compaction resumes at the right row.
    pi.on ("session_before_compact", async (event, ctx) =>
    {
      const subjects = readdirSync (ctx.cwd).map ((name) => name.match (trackerName)?.[1]).filter ((subject) => subject !== undefined);

      if (subjects.length === 1)
      {
        const result = await pi.exec ("nvim", ["--headless", "-l", trackerScript, "--subject", subjects[0], "--handoff"], { cwd: ctx.cwd, signal: event.signal });

        if (result.code === 0)
        {
          return {
            compaction: {
              summary: result.stdout,
              firstKeptEntryId: event.preparation.firstKeptEntryId,
              tokensBefore: event.preparation.tokensBefore,
            },
          };
        }
      }
    });
  }
}
