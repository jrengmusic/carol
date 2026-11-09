## Handoff to MACHINIST: Local Ollama models as tools for CAROL primaries

**From:** MACHINIST
**Date:** 2026-11-09
**Status:** Blocked

### Read First
1. `/Users/jreng/Documents/Poems/dev/jam/RFC-gpu-memory-failure-recovery.md` — holds the GPU failure evidence that blocks this work.
2. `~/.carol/agents/pathfinder.md` — the role that the local models could replace in part. Its BRIEF and EVIDENCE formats are at lines 101-116.
3. `~/.carol/skills/doxygen-writer/SKILL.md` — the rules for the doxygen task. Lines 11, 35, and 36-37 govern the why.
4. `~/.carol/skills/doxygen-protocol/SKILL.md` — the question-to-source table for the clangd tools.

### Context

ARCHITECT asked if local Ollama models can take over part of the Pathfinder and Librarian work, as tools of the CAROL primaries. The target tasks are:

- exploration, and fact reads from the AST with clangd
- reads of local source code as reference
- doxygen writes with the doxygen skill

The aim is to save tokens. The method is a small comparison of Haiku Pathfinder against the local models. If the results are "at the same ballpark", ARCHITECT formalises the tools into the CAROL protocol.

Proposed shape, presented in chat. ARCHITECT did not reject it:

1. Claude Code stays on Anthropic. The local model runs as a separate process, and the primary calls it through Bash.
2. One runner reads a task manifest and drives the Ollama tool loop.
3. The model gets narrow tools and no Bash: `read_range`, `lsp_*`, `insert_doxygen`. These tool names are proposals.
4. The runner starts its own clangd, because an external process cannot reach the Claude Code LSP tool.
5. The runner holds the rules, because Claude Code hooks do not see these tool calls:
   - `insert_doxygen` writes comment blocks only, and rejects a write that changes a non-comment token.
   - The runner checks each cited file:line and verbatim quote against the file.
6. For doxygen, the runner loops over the files with a fresh model context per file. COUNSELOR sends one manifest and reads one report.
7. The primary reads one short report in the BRIEF or EVIDENCE format.
8. Some Pathfinder tasks need no model. A plain references request is one clangd call.

Limits stated in chat:

- COUNSELOR still reads every doxygen block against the code (CAROL.md Doxygen). The saving is Haiku tokens only, and more errors cost more primary tokens.
- The AST shows what the code chose. It does not show why the code rejected the alternatives. The test measures if the model leaves the body out (`SKILL.md:36-37`) or invents a reason.
- `temperature` 0 makes the output repeatable on the same input. It does not make the output correct.

Local state, observed on 2026-11-09:

| Item | Value | Source |
|---|---|---|
| Machine | Mac16,1, Apple M4, 16 GB | `sysctl hw.memsize hw.model` |
| Ollama | 0.40.15 | `ollama --version` |
| `qwen3.5:9b` | 7.6 GB on disk, 8.0 to 8.3 GB loaded, tools and thinking | `ollama list`, `ollama show`, `ollama ps` |
| `qwen3.5:4b` | 4.0 GB on disk, tools and thinking | `ollama list`, `ollama show` |
| Default `temperature` | 1 | `ollama show --modelfile` |
| Default keep alive | `5m0s` | `ollama serve` log |
| GPU wired limit | 12713115648 bytes | kernel log, RFC R1 |
| END compile database | `~/Documents/Poems/dev/end/compile_commands.json` | `find` |

### Completed

- **Step 1 of the test passed.** The runner has one tool, `read_range`, and a citation check. The prompt was: "In Source/plugins/PluginState.h, what is the full declaration of the public member function that writes rows, and at which line is it?" The root was `~/Documents/Poems/dev/end`. The model was `qwen3.5:9b`, with `num_ctx` 16384.

| | think off | think on |
|---|---|---|
| Answer | `setRows`, line 41, correct | `setRows`, line 41, correct |
| Citation check | pass | pass |
| Turns | 3 | 3 |
| Tool calls | 2 | 2 |
| Wall time | 46.7 s | 23.6 s |
| Last prompt tokens | 1343 | 1576 |
| Output tokens | 176 | 475 |
| Memory (`ollama ps`) | 8.0 GB | 8.3 GB |

  This run is one easy question. It proves that the tool loop works. It proves no quality claim. The think-off run went first, and its wall time probably includes the model load.

- **Cause of the END corruption found, as far as the log shows.** GPU memory exhaustion at 20:22:23, during the 9b test. Evidence: RFC R1 and R2. JAM recovery is not settled. See RFC R3 to R8 and its 7 open questions.

- **Correction on record.** The chat claim of a second failure at 20:25 was false: the `log` command matched its own arguments. RFC R9 records this. When you read the system log, filter on `process`.

- **Runner source.** The scratchpad is session-specific, so the source is here in full. `/private/tmp/claude-501/-Users-jreng--carol/d813bca6-10c5-4ac0-8dce-b2266ebee2b2/scratchpad/local_agent.py` is the original.

```python
#!/usr/bin/env python3
import argparse
import json
import pathlib
import time
import urllib.request

OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"
CONTEXT_TOKENS = 16384
TEMPERATURE = 0
MAX_TURNS = 8
MAX_RANGE_LINES = 80
REQUEST_TIMEOUT_SECONDS = 600

SYSTEM_PROMPT = """You read source code through tools. Use only facts from tool results.
When done, reply with JSON only, no markdown fence:
{"answer": "<short answer>", "citations": [{"file": "<relative path>", "line": <1-based line>, "quote": "<exact text from that line>"}]}"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_range",
            "description": "Read lines of a file relative to the project root. Each returned line starts with its 1-based number and a tab.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file": {"type": "string"},
                    "first_line": {"type": "integer"},
                    "line_count": {"type": "integer"},
                },
                "required": ["file", "first_line", "line_count"],
            },
        },
    }
]


def get_project_file(root, relative):
    target = (root / relative).resolve()
    assert target.is_relative_to(root), f"path outside root: {relative}"
    return target


def read_range(root, file, first_line, line_count):
    lines = get_project_file(root, file).read_text().splitlines()
    start = max(first_line, 1)
    stop = start + min(line_count, MAX_RANGE_LINES)
    return "\n".join(f"{n}\t{lines[n - 1]}" for n in range(start, min(stop, len(lines) + 1)))


def get_tool_result(root, call):
    function = call["function"]
    tools = {"read_range": read_range}

    try:
        return tools[function["name"]](root, **function["arguments"])
    except (KeyError, TypeError, OSError, AssertionError) as error:
        return f"TOOL ERROR: {error!r}"


def get_chat_reply(model, messages, think):
    body = {
        "model": model,
        "messages": messages,
        "tools": TOOLS,
        "stream": False,
        "think": think,
        "options": {"num_ctx": CONTEXT_TOKENS, "temperature": TEMPERATURE},
    }
    request = urllib.request.Request(OLLAMA_CHAT_URL, json.dumps(body).encode(), {"Content-Type": "application/json"})

    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        return json.load(response)


def get_citation_checks(root, content):
    try:
        citations = json.loads(content)["citations"]
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        return [{"valid": False, "error": f"unparsable final reply: {error!r}"}]

    checks = []

    for citation in citations:
        try:
            line = get_project_file(root, citation["file"]).read_text().splitlines()[citation["line"] - 1]
            checks.append({**citation, "valid": citation["quote"] in line})
        except (KeyError, TypeError, IndexError, OSError, AssertionError) as error:
            checks.append({**citation, "valid": False, "error": repr(error)})

    return checks


def run(model, root, prompt, think):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}]
    started = time.time()
    trace = []
    prompt_tokens = 0
    output_tokens = 0
    content = ""

    for turn in range(MAX_TURNS):
        reply = get_chat_reply(model, messages, think)
        prompt_tokens = reply.get("prompt_eval_count", prompt_tokens)
        output_tokens += reply.get("eval_count", 0)
        message = reply["message"]
        messages.append(message)
        calls = message.get("tool_calls") or []
        content = message.get("content", "")

        if calls:
            for call in calls:
                result = get_tool_result(root, call)
                trace.append({"tool": call["function"]["name"], "arguments": call["function"]["arguments"], "result_chars": len(result)})
                messages.append({"role": "tool", "tool_name": call["function"]["name"], "content": result})
        else:
            return {
                "model": model,
                "think": think,
                "turns": turn + 1,
                "seconds": round(time.time() - started, 1),
                "last_prompt_tokens": prompt_tokens,
                "output_tokens": output_tokens,
                "trace": trace,
                "final": content,
                "citations": get_citation_checks(root, content),
            }

    return {"model": model, "error": "turn limit", "trace": trace, "final": content}


parser = argparse.ArgumentParser()
parser.add_argument("--model", required=True)
parser.add_argument("--root", required=True)
parser.add_argument("--prompt", required=True)
parser.add_argument("--think", action="store_true")
arguments = parser.parse_args()
print(json.dumps(run(arguments.model, pathlib.Path(arguments.root).resolve(), arguments.prompt, arguments.think), indent=1))
```

### Remaining

In order:

1. **ARCHITECT:** confirm that Ollama with the local models does not corrupt END. Check the system log after a run:
   `/usr/bin/log show --last 10m --style compact --predicate '(process == "END" OR process == "kernel") AND (eventMessage CONTAINS "failed to wire down" OR eventMessage CONTAINS "kIOGPUCommandBufferCallbackErrorOutOfMemory")'`
2. **COUNSELOR, if ARCHITECT sends it:** check the RFC at JAM.
3. **MACHINIST:** step 2 of the test. Add one clangd tool, `lsp_references`. Ask for the references of `PluginState::setRows`. Compare the answer against direct clangd output.
4. **MACHINIST:** run the same prompt on Haiku Pathfinder and on the other local model.
5. **MACHINIST:** scale to the full comparison, one step at a time:

| Task | Input | Pass measure |
|---|---|---|
| AST facts | definition, references, and callers of 3 symbols | match against direct clangd output |
| Source reference | 3 questions on local JUCE or JAM source | each quote exists at its cited line |
| Doxygen | one header, one file, on a copy | zero code change, zero doxygen warnings, ARCHITECT's review of the why |

   Also record wall time, tokens, and the size of the report that the primary reads. For each doxygen block, the model returns the file:line of the code that supports each claim. The runner checks that each citation exists. ARCHITECT reviews only whether the citation supports the claim. The citations stay in the report and never go in the header.

Not verified:

- `qwen3.5:4b` has not run. Its fit next to END is unknown.
- No Haiku baseline exists.
- The real usable `num_ctx` on 16 GB is not measured. The runs used about 10% of 16384.

### Key Decisions

- "my harness is this Claude Code CLI."
- "what if we treat my local models as COUNSELOR tools?"
- "those tools still under protocol, with carol skills, with scripts whatever they need as seamless integration for COUNSELOR to read as its context."
- "BUT because these are local models with limited context window, we must be very EFFICIENT and EFFECTIVE not to bloat their context window."
- "then we could compare, let say primary agents delegation to Pathfinder (Haikut) vs my local agents. if the result is at the same ballpark, then we could formalise into carol protocol"
- "at end. make the test small and contained. iterate, dont one shot everything. test small, then scale"
- "write handoff, we continue later after i ensure using ollama with local models never corrupt vulkan"

### Files Modified

- `/Users/jreng/Documents/Poems/dev/jam/RFC-gpu-memory-failure-recovery.md` — new. RFC for COUNSELOR.
- `/Users/jreng/.carol/HANDOFF-local-model-tools.md` — new. This file.
- `/private/tmp/claude-501/-Users-jreng--carol/d813bca6-10c5-4ac0-8dce-b2266ebee2b2/scratchpad/local_agent.py` — new. Test runner, session-specific.

Nothing else in `~/.carol` changed.

### Open Questions

- Which model and memory setup does the test use? Options from the chat: `qwen3.5:4b` with `keep_alive: 0`, or 9b only when END corruption does not matter. Decider: ARCHITECT.
- Which home and language does the runner get if formalised? The monorepo syncs 2 macOS and 2 Windows machines (`ARCHITECT.md`), and only this Mac is tested. Decider: ARCHITECT.
- Any name that the formal tools need. Decider: ARCHITECT (NAMES.md Rule -1).

### Next Steps

Pick up at Remaining item 3 when ARCHITECT confirms that Ollama with local models no longer corrupts Vulkan rendering. Take the model and memory setup from ARCHITECT at that point.
