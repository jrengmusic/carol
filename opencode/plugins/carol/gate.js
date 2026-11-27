import {
  getRunDenial,
  getShellDenial as getSawShellDenial,
  getToolDenial,
} from '../../../hooks/saw-gate.mjs'
export const NUDGE_INTERVAL = 5
export const DEFAULT_ROLE = 'COUNSELOR'
export const MACHINIST_ROLE = 'MACHINIST'
export const SPRINT_LOG = 'carol/SPRINT-LOG.md'
const READ_ONLY_GIT_AGENT = 'pathfinder'
const DOXYGEN_TASK_PATTERN = /doxygen/i
const CONTRACT_DOCUMENTS = ['MANIFESTO', 'CODING', 'NAMES']
const CONTRACT_DOCUMENT_PATTERN = new RegExp('[\\\\/]\\.carol[\\\\/](' + CONTRACT_DOCUMENTS.join('|') + ')\\.md$')

export const NO_GATE_PATTERN = /no[ -]?gate/i
export const GIT_INSTRUCTION_PATTERN = /\b(git|commit|push)\b/i

const COMMAND_START = '(?:^|(?<=[;&|\\n(`]|\\$\\(|-exec(?:dir)?))\\s*'
const COMMAND_PREFIX = '(?:(?:\\w+=\\S*|sudo|exec|time|nohup|command|env|xargs(?:\\s+-\\S+)*)\\s+)*'
const COMMAND_HEAD = COMMAND_START + COMMAND_PREFIX + '(?:\\S*/)?'
const GIT_OPTIONS = '(?:\\s+(?:-C\\s+\\S+|-c\\s+\\S+|--[a-z-]+(?:=\\S+)?))*\\s+'
const GIT_SUFFIX = '(?:[\\s;&|)]|$)'
const GIT_COMMAND_PATTERN = new RegExp(COMMAND_HEAD + 'git(?:\\s|$)', 'g')
const GIT_READ_ONLY_PATTERN = new RegExp(COMMAND_HEAD + 'git' + GIT_OPTIONS + '(?:status|log|diff|show)' + GIT_SUFFIX, 'g')
const GIT_SYNC_PATTERN = new RegExp(COMMAND_HEAD + 'git' + GIT_OPTIONS + '(?:push|pull)' + GIT_SUFFIX, 'g')

const GIT_GATE = "This git command needs ARCHITECT's instruction, and ARCHITECT's last prompt names no git command (CAROL.md Git). Read-only git is allowed in the main session and in Pathfinder, never in another subagent and never in a Pathfinder whose task description names doxygen, and the MACHINIST main session also runs push and pull. Do not retry. Read the working tree with the read tool, or report what you need."
export const CONTRACT_GATE = 'Before a question to ARCHITECT, read ~/.carol/MANIFESTO.md, ~/.carol/CODING.md and ~/.carol/NAMES.md again, in full, with the read tool (counselor.md Options & Recommendations). Then filter each option against them. Delete each option that breaks CONTRACT: a revert to a past state, a patch that violates CONTRACT, and a question about a name (NAMES.md Rule -1). One option remains: execute it, because it is not a question. No option remains: research until one compliant solution exists. Ask only when two or more compliant options remain.'
const BACKGROUND_GATE = 'A subagent runs no background command (CAROL.md Subagent Return Format: the report is the final output). Run this command in the foreground, wait for it to finish, and put its result in your report.'
export const FOREGROUND_GATE = 'Run Pathfinder in the foreground: the plugin checks its report before you read it, and a background report has no such check. Remove background from this call.'
export const STEP_GATE = 'No gate until /log: this run ends at the sprint log. A text-only end of turn is a report, not the endpoint. Per CAROL.md Step Gate, a stop before the log is evidence that CONTRACT was not read at that point. Read ~/.carol/MANIFESTO.md, ~/.carol/CODING.md and ~/.carol/NAMES.md again with the Read tool, then read the implicated code at file:line. Correct course with the CONTRACT clause that covers it, and do the next step. Stop only for the closed stop set in CAROL.md Step Gate. If a subagent is still running, end the turn and wait for it.'
export const READ_DIRECTIVE = "If your reasoning still leaves an open end to fill in, read again thoroughly with the Read tool. Find the answer as a citable fact from the codebase, checked against ~/.carol/MANIFESTO.md, ~/.carol/CODING.md and ~/.carol/NAMES.md, and from the agreed rulings in the RFC and the PLAN. Above all, use ARCHITECT's explicit discussion recorded in the chat history. Never fill in a gap. Never leave an open end that reading can answer. Respond only with a citable fact."
const OPEN_END_PATTERN = /\b(?:not read yet|(?:still )?needs? to (?:be )?verif(?:y|ied)|not yet verified|(?:have|has|had)(?: not|n't) (?:read|seen|checked|verified)|unread|do not know)\b/i
export const NUDGE_MACHINIST = 'CAROL NUDGE — MACHINIST executes directly with its own hands; @Pathfinder grounds unfamiliar surface; cross-platform consistency holds for ~/.config/ edits. Discuss before executing changes; cite file:line.'
export const NUDGE_DEFAULT = "CAROL NUDGE — Stay in role: plan and delegate (@Engineer code, @Pathfinder discovery, @Auditor once at sprint completion). Answer by reading; every claim cites file:line. Before the plan locks, hold answers until ARCHITECT's go. After the lock, execute to the endpoint per CAROL.md Step Gate."

export const SAW_TOOL = 'saw_run'
const DENIED_TOOL_ROWS = { edit: 'Edit', patch: 'Edit', grep: 'grep', write: 'Write' }

// Tools that saw replaces. Every session has them denied and removed from its tool list.
export const DENIED_TOOLS = Object.fromEntries(Object.entries(DENIED_TOOL_ROWS).map(([tool, row]) => [tool, getToolDenial(row, SAW_TOOL)]))
export const SAW_TOOLS = Object.keys(DENIED_TOOLS)

function countMatches(pattern, text) {
  return (text.match(pattern) ?? []).length
}

export function isReadOnlyGitAgent(agentID, description) {
  return agentID === READ_ONLY_GIT_AGENT && !DOXYGEN_TASK_PATTERN.test(description)
}

function getPermittedInvocations(command, isSubagent, canReadGit, isMachinistSession) {
  const isSyncPermitted = !isSubagent && isMachinistSession
  const readOnly = !isSubagent || canReadGit ? countMatches(GIT_READ_ONLY_PATTERN, command) : 0
  return isSyncPermitted ? readOnly + countMatches(GIT_SYNC_PATTERN, command) : readOnly
}

export function getShellDenial({ command, isSubagent, isBackground, canApply, canReadGit, isGitInstructed, isMachinistSession }) {
  if (isSubagent && isBackground) return BACKGROUND_GATE
  const denial = getSawShellDenial(command, isSubagent, canApply, SAW_TOOL)
  if (denial !== undefined) return denial
  const invocations = countMatches(GIT_COMMAND_PATTERN, command)
  if (invocations === 0 || isGitInstructed) return undefined
  return invocations === getPermittedInvocations(command, isSubagent, canReadGit, isMachinistSession) ? undefined : GIT_GATE
}

export { getRunDenial }

export function getContractDocument(input) {
  const isFullRead = input?.offset === undefined && input?.limit === undefined
  return isFullRead ? String(input?.path ?? '').match(CONTRACT_DOCUMENT_PATTERN)?.[1] : undefined
}

export function isContractUnread(contractReads) {
  return contractReads.size < CONTRACT_DOCUMENTS.length
}

export function getModelDenial(agentID, expected, passed) {
  if (passed === '' || passed === expected) return undefined
  return 'Agent call needs model "' + expected + '", the model of the ' + agentID + ' agent definition. Omit model, or pass "' + expected + '". Per CAROL.md Subagent Model, a tier change is ARCHITECT\'s edit to the definition.'
}

export function getStopBlock({ isNoGateRun, isSprintLogNewer, isStopHookActive, lastAssistantMessage }) {
  if (isNoGateRun && !isSprintLogNewer && !isStopHookActive) return STEP_GATE
  if (OPEN_END_PATTERN.test(lastAssistantMessage) && !isStopHookActive) return READ_DIRECTIVE
  return undefined
}

export function getNudge(role) {
  return role === MACHINIST_ROLE ? NUDGE_MACHINIST : NUDGE_DEFAULT
}
