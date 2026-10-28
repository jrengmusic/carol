## Handoff to MACHINIST: profiling — resume when scout is updated

**From:** MACHINIST
**Date:** 2026-10-28
**Status:** Blocked (waits for ARCHITECT to update scout)

### Read First
- `~/Documents/Poems/dev/scout/RFC-profiling.md` — the one RFC. §R2 maps every earlier requirement to its state. §R10 resolves the contradictions. §Scaffold S1–S5 is the target contract. §Open Questions 1–12 are the decisions.
- `~/Documents/Poems/dev/scout/RFC-live-measurement.md` — committed and built. History only.
- `~/.carol/skills/profile/SKILL.md` and `~/.carol/skills/trace/SKILL.md` — the skills in their current (interim) state.
- `~/Documents/Poems/dev/eve/benchmark/live.md` and `replay.md` — the manifests, with the interim `## toolchain` tables.
- `~/Documents/Poems/dev/scout/Source/HELP.md` — the built scout contract (re-read after the update).

### Context
ARCHITECT wants the EVE profile run to be deterministic: a skill that calls one fixed command, and a scout that builds and measures from its manifest. scout already runs a manifest's `command` per epoch and writes the report. This session found four scout command-line defects (F1–F5 in the RFC), moved the profile build data from cast's `eve/project-info.md` into the scout manifests, and designed scout running the manifest's `## toolchain` before the epochs. ARCHITECT updates scout. Then I update the skills and the manifests.

### Completed
- Profile skill rewritten against the built scout (four lanes, manifest keys, samples file, report rows, seven zones, EVE launch under scout, limits, build grant). `skills/profile/SKILL.md`.
- Trace skill: Where-lane notes, profile probe note, `-g` note. `skills/trace/SKILL.md`.
- Attach-mode detach was already in the working tree: `skills/trace/driver.lua:155-171`; callers `sample.lua:246`, `trace.lua:224`.
- Replay profile verified end to end: `cast ../jam/cast/spell.md`, `cmake -S . -B Builds/Replay ... -DCAST_PROFILE=ON -DCAST_REPLAY=ON`, `ninja -C Builds/Replay` (run from `eve/`, all exit 0). Then `scout eve/benchmark/replay.md`: exit 0, empty stderr, `buildType` Release, `dropped` 0, 11 epochs. `epoch` 1.8746e9 ns, `user` 1.0761e9 ns, `system` 1.0987e9 ns.
- `eve/project-info.md`: `profile` and `replay` toolchain rows removed. The compile definition rows (`:393`, `:395`) stay.
- `eve/benchmark/live.md` and `replay.md`: `## toolchain` table (`command | flag`) added. Rows are relative to the EVE project root.
- New protocol and skills: `skills/rfc-writer/`, `commands/rfc.md`, `skills/handoff-writer/`, `skills/plan-writer/`. `agents/oracle.md` points to `rfc-writer`. `commands/handoff.md` points to `handoff-writer`. `CAROL.md` Documentation names both skills. Symlinks in `~/.claude/skills/` for both.
- nvim: an experimental Profile scheme was built and reverted. `~/.config/nvim` matches HEAD.
- Three RFCs merged into `RFC-profiling.md` and deleted.

### Remaining
1. ARCHITECT: decide RFC Open Questions 1–11 that touch scout (1–6, 11), then update scout per RFC Scaffold S1 and S2. Owner: ARCHITECT.
2. ARCHITECT: tell me "scout updated". Trigger for everything below.
3. Re-read `scout/Source/HELP.md` and `Main.cpp` of the updated scout. Verify each case of the RFC table in S1 by running it:
   - `scout --help` → help text, exit 0
   - `scout` → help text, exit 1
   - `scout missing.md` → a message that names `missing.md`, exit 1
   - `scout empty.md` (empty file) → a validation diagnostic, exit 1
   - a manifest whose `output` folder does not exist → the path on stderr, ending with a newline, exit 1
4. Change the rows of `eve/benchmark/live.md` and `replay.md` to manifest-relative paths (RFC S2.5 sketch). Confirm the `cast ../../jam/cast/spell.md` row works when scout runs it in the manifest folder (RFC Open Question 6).
5. Run `scout /Users/jreng/Documents/Poems/dev/eve/benchmark/replay.md` through Pathfinder. It must build and measure in one call: exit 0, `buildType` Release.
6. Update `skills/profile/SKILL.md` (RFC S3): `## Command` = `scout <absolute-manifest-path>` only; `## Builds` loses the build procedure; `## Manifest` documents `## toolchain`; `## Limits` per item 8.
7. Live run through Pathfinder: `scout /Users/jreng/Documents/Poems/dev/eve/benchmark/live.md`. The epoch size follows ARCHITECT's answer to RFC Open Question 10 (`live.md` uses 100M today; about 12 minutes for 11 epochs). Compare the `system` row with `time seq` for the same N (RFC Open Question 12). Record the result in the profile skill `## Limits`.
8. After ARCHITECT answers RFC Open Question 8: write the Where-lane raw-file output in `skills/trace/sample.lua` (RFC S4).
9. After ARCHITECT answers RFC Open Question 7: apply the clangd rule. Then check: `grep -c JAM_USING_PROFILER eve/compile_commands.json` returns more than 0.
10. After ARCHITECT answers RFC Open Question 9: add `-g` to the profile `cmake` row if selected, and update the `-g` note in `skills/trace/SKILL.md`.
11. Commit: ARCHITECT's instruction only (CAROL.md Git).

### Key Decisions
- ARCHITECT: *"profiling with scout is granted with build permission"*
- ARCHITECT: *"i dont need to build profile with nvim. with profiling protocol, agent granted permission to build. profiling is always agents building"*
- ARCHITECT: *"profile related data should be at scout manifest, not cast as toolchain"*
- ARCHITECT: *"cast stays as toolchain. contract does not change. you need to run cmake for whatever profile need to build, hand it off to scout."*
- ARCHITECT: *"instead of hardcoding whatever command to build profile into skill, why not we just make scout able to launch "toolchain" to profile like cast? so skill always deterministically call the exact scout command whatever flags it needs? so this is IDENTICAL to cast, while the the command is not running cast, but scout with its manifest"*
- ARCHITECT: *"scout always profile, why do we need extra redundant flag"*
- ARCHITECT: *"primary agents should be able to write RFC. make it as accessible skill just like any other skills per protocol. whenever ARCHITECT asked to write RFC just follow the protocol and use the skill"*, then *"rfc command yes"*
- ARCHITECT: *"merge your 3 rfc into only ONE comprehesinve RFC … only one RFC, delete the rest. then write HANDOFF here to continue our work here when scout updated."*

### Files Modified
- `~/.carol/CAROL.md` — RFC line names `rfc-writer`; Documentation names `handoff-writer`.
- `~/.carol/agents/oracle.md` — RFC section points to `rfc-writer`.
- `~/.carol/commands/rfc.md` — new `/rfc` command.
- `~/.carol/commands/handoff.md` — step 2 loads `handoff-writer`.
- `~/.carol/skills/rfc-writer/SKILL.md`, `~/.carol/skills/handoff-writer/SKILL.md`, `~/.carol/skills/plan-writer/SKILL.md` — new skills. `handoff-writer`: COUNSELOR to `carol/SPRINT-LOG.md`, MACHINIST to `HANDOFF-<subject>.md`, ORACLE none. `plan-writer`: written from `commands/goplan.md`; ORACLE or COUNSELOR writes a PLAN, only COUNSELOR executes it.
- `~/.carol/commands/goplan.md` — now loads `plan-writer`, keeps plan mode, approval and COUNSELOR execution. `~/.carol/agents/oracle.md` — adds the PLAN section. `CAROL.md` — PLAN line names the skill.
- `~/.carol/skills/profile/SKILL.md`, `~/.carol/skills/trace/SKILL.md` — rewritten and extended.
- `~/.carol/skills/trace/driver.lua`, `sample.lua`, `trace.lua` — modified before this session (detach in attach mode). Not touched by this session's edits.
- `~/.carol/HANDOFF-profiling.md` — this file.
- `~/Documents/Poems/dev/scout/RFC-profiling.md` — the merged RFC (new).
- `~/Documents/Poems/dev/eve/project-info.md` — profile and replay rows removed.
- `~/Documents/Poems/dev/eve/benchmark/live.md`, `replay.md` — `## toolchain` added.
- `~/Documents/Poems/dev/eve/benchmark/replay-report.md`, `replay-samples.md` — rewritten by the scout run (outputs).
- `~/.claude/skills/rfc-writer`, `~/.claude/skills/handoff-writer` — symlinks, outside git.
- Nothing is committed.

### Open Questions
- RFC Open Questions 1–12 in `RFC-profiling.md`. Deciders are named there. Questions 1–6 and 11 gate the scout update. Question 7 gates the clangd rule. Question 8 gates `sample.lua`. Question 9 gates `-g`. Question 10 gates the live run size. Question 12 is a verification in the first live run.

### Next Steps
- Trigger: ARCHITECT says scout is updated. Start with Remaining item 3, then continue in order.
- Until then, the interim build procedure holds: the agent reads the manifest's `## toolchain` table, runs its rows from `~/Documents/Poems/dev/eve`, then calls `scout <absolute-manifest-path>` through Pathfinder.
