import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const gatedRole = "HOUSEKEEPER";
const toolScopeReason = "CAROL gate: HOUSEKEEPER has no tools.";

export default function (pi: ExtensionAPI)
{
  if (process.env.CAROL_ROLE === gatedRole)
  {
    pi.on ("tool_call", async () => ({ block: true, reason: toolScopeReason, terminate: true }));
  }
}
