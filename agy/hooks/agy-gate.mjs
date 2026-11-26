#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const NUDGE_INTERVAL = 5
const DEFAULT_ROLE = 'COUNSELOR'
const MACHINIST_ROLE = 'MACHINIST'
const ROLE_FILE = '.carol-role'
const SPRINT_LOG = 'carol/SPRINT-LOG.md'
const CONTRACT_DOCUMENTS = ['MANIFESTO', 'CODING', 'NAMES']

const NO_GATE_PATTERN = /no[ -]?gate/i
const GIT_INSTRUCTION_PATTERN = /\b(git|commit|push)\b/i

const COMMAND_START = '(?:^|(?<=[;&|\\n(`]|\\$\\(|-exec(?:dir)?))\\s*'
const COMMAND_PREFIX = '(?:(?:\\w+=\\S*|sudo|exec|time|nohup|command|env|xargs(?:\\s+-\\S+)*)\\s+)*'
const COMMAND_HEAD = COMMAND_START + COMMAND_PREFIX + '(?:\\S*/)?'
const GIT_OPTIONS = '(?:\\s+(?:-C\\s+\\S+|-c\\s+\\S+|--[a-z-]+(?:=\\S+)?))*\\s+'
const GIT_SUFFIX = '(?:[\\s;&|)]|$)'
const GIT_COMMAND_PATTERN = new RegExp(COMMAND_HEAD + 'git(?:\\s|$)', 'g')
const GIT_READ_ONLY_PATTERN = new RegExp(COMMAND_HEAD + 'git' + GIT_OPTIONS + '(?:status|log|diff|show)' + GIT_SUFFIX, 'g')
const GIT_SYNC_PATTERN = new RegExp(COMMAND_HEAD + 'git' + GIT_OPTIONS + '(?:push|pull)' + GIT_SUFFIX, 'g')
const CPP_EXTENSION = '\\.(?:h|hh|hpp|hxx|inl|c|cc|cpp|cxx|m|mm)'
const TEXT_SEARCH_PATTERN = new RegExp(COMMAND_HEAD + '(?:grep|egrep|fgrep|rg|ag|ack)(?:\\s|$)')
const CPP_TARGET_PATTERN = new RegExp('(?:--type[= ]|-t\\s*)(?:c|cpp|objc|objcpp)\\b|(?:-g|--glob|--include|-i?name)[= ]\\s*[\'"]?[^\\s\'"]*' + CPP_EXTENSION + '\\b|(?:^|\\s)[^\\s\'"|;&]*' + CPP_EXTENSION + '(?=$|[\\s|;&)])')
const LITERAL_SEARCH_PATTERN = /\\"|'[^']*"[^']*'|['"]#/
const CONTRACT_DOCUMENT_PATTERN = new RegExp('[\\\\/]\\.carol[\\\\/](' + CONTRACT_DOCUMENTS.join('|') + ')\\.md$')

const GIT_GATE = "This git command needs ARCHITECT's instruction, and ARCHITECT's last prompt names no git command (CAROL.md Git). Read-only git is allowed in the main session and in Pathfinder, never in another subagent and never in a Pathfinder whose task description names doxygen, and the MACHINIST main session also runs push and pull. Do not retry. Read the working tree with the read_file tool, or report what you need."
const SCOUT_SERVER_PATTERN = /^(?:carol_)?scout$/
const WHATDBG_SERVER_PATTERN = /^(?:carol_)?whatdbg$/
const SAW_SERVER_PATTERN = /^(?:carol_)?saw$/
const EXCERPT_TARGET_PATTERN = /^(.+:\d+-\d+) of \d+ sha256:/
const DOXYGEN_TASK_PATTERN = /doxygen/i
const DOXYGEN_DESCRIPTION = 'doxygen'
const PATHFINDER_AGENT = 'pathfinder'
const SCOUT_GATE = 'scout MCP is restricted to @Pathfinder only (CAROL.md Profiling). Write the manifest and delegate the scout run to @Pathfinder.'
const WHATDBG_GATE = 'whatdbg MCP is restricted to COUNSELOR and @Pathfinder only (CAROL.md Debugging).'
const CONTRACT_GATE = 'Before a question to ARCHITECT, read ~/.carol/MANIFESTO.md, ~/.carol/CODING.md and ~/.carol/NAMES.md again, in full, with read_file (counselor.md Options & Recommendations). Then filter each option against them. Delete each option that breaks CONTRACT: a revert to a past state, a patch that violates CONTRACT, and a question about a name (NAMES.md Rule -1). One option remains: execute it, because it is not a question. No option remains: research until one compliant solution exists. Ask only when two or more compliant options remain.'
const STEP_GATE = 'No gate until /log: this run ends at the sprint log. A text-only end of turn is a report, not the endpoint. Per CAROL.md Step Gate, a stop before the log is evidence that CONTRACT was not read at that point. Read ~/.carol/MANIFESTO.md, ~/.carol/CODING.md and ~/.carol/NAMES.md again with read_file, then read the implicated code at file:line. Correct course with the CONTRACT clause that covers it, and do the next step. Stop only for the closed stop set in CAROL.md Step Gate. If a subagent is still running, end the turn and wait for it.'
const READ_DIRECTIVE = "If your reasoning still leaves an open end to fill in, read again thoroughly with read_file. Find the answer as a citable fact from the codebase, checked against ~/.carol/MANIFESTO.md, ~/.carol/CODING.md and ~/.carol/NAMES.md, and from the agreed rulings in the RFC and the PLAN. Above all, use ARCHITECT's explicit discussion recorded in the chat history. Never fill in a gap. Never leave an open end that reading can answer. Respond only with a citable fact."
const OPEN_END_PATTERN = /\b(?:not read yet|(?:still )?needs? to (?:be )?verif(?:y|ied)|not yet verified|(?:have|has|had)(?: not|n't) (?:read|seen|checked|verified)|unread|do not know)\b/i
const NUDGE_MACHINIST = 'CAROL NUDGE — MACHINIST executes directly with its own hands; @Pathfinder grounds unfamiliar surface; cross-platform consistency holds for ~/.config/ edits. Discuss before executing changes; cite file:line.'
const NUDGE_DEFAULT = "CAROL NUDGE — Stay in role: plan and delegate (@Engineer code, @Pathfinder discovery, @Auditor once at sprint completion). Answer by reading; every claim cites file:line. Before the plan locks, hold answers until ARCHITECT's go. After the lock, execute to the endpoint per CAROL.md Step Gate."

const CAROL_ROOT = process.env.CAROL_ROOT || path.join(os.homedir(), '.carol')
const PLUGIN_ROOT = process.env.PLUGIN_ROOT || path.join(os.homedir(), '.gemini', 'config', 'plugins', 'carol')
const STATE_DIR = path.join(CAROL_ROOT, '.tmp')
const SUMMARIES_DB = 'conversation_summaries.db'
const DEFAULT_AGY_DIR = path.join(os.homedir(), '.gemini', 'antigravity-cli')
const SQLITE_TIMEOUT_MS = 1000

function countMatches(pattern, text) {
  return (text.match(pattern) ?? []).length
}

function getRole() {
  if (process.env.CAROL_ROLE) return process.env.CAROL_ROLE.toUpperCase()
  const rolePath = path.join(CAROL_ROOT, ROLE_FILE)
  if (fs.existsSync(rolePath)) {
    const value = fs.readFileSync(rolePath, 'utf8').trim()
    if (value) return value.toUpperCase()
  }
  return DEFAULT_ROLE
}

function getStatePath(conversationId) {
  const safeId = String(conversationId || 'default').replace(/[^A-Za-z0-9_-]/g, '_')
  return path.join(STATE_DIR, 'agy-gate-' + safeId + '.json')
}

function loadState(conversationId) {
  const statePath = getStatePath(conversationId)
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'))
    } catch {}
  }
  return {
    promptCount: 0,
    armedAtMs: 0,
    isNoGateArmed: false,
    isGitInstructed: false,
    lastUserInput: '',
    contractReads: [],
    isDoxygenDelegated: false,
    isReportReturned: false
  }
}

function saveState(conversationId, state) {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  const statePath = getStatePath(conversationId)
  const tmpPath = statePath + '.' + process.pid + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(state))
  fs.renameSync(tmpPath, statePath)
}

// A read failure throws, so that the gate denies: an unknown subagent must not pass as a main session.
async function getConversationMeta(payload) {
  const main = { agentName: '', isSubagent: false, parentId: '' }
  const conversationId = String(payload.conversationId || '')
  const dbPath = payload.artifactDirectoryPath
    ? path.resolve(payload.artifactDirectoryPath, '..', '..', SUMMARIES_DB)
    : path.join(DEFAULT_AGY_DIR, SUMMARIES_DB)
  if (!conversationId || !fs.existsSync(dbPath)) return main
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(dbPath, { readOnly: true, timeout: SQLITE_TIMEOUT_MS })
  try {
    const row = db
      .prepare('SELECT agent_name, parent_conversation_id, nesting_depth FROM conversation_summaries WHERE conversation_id = ?')
      .get(conversationId)
    if (!row) return main
    return {
      agentName: String(row.agent_name || ''),
      isSubagent: Number(row.nesting_depth) > 0 || Boolean(row.parent_conversation_id),
      parentId: String(row.parent_conversation_id || '')
    }
  } finally {
    db.close()
  }
}

function canApply(gate, meta) {
  const description = meta.isSubagent && loadState(meta.parentId).isDoxygenDelegated ? DOXYGEN_DESCRIPTION : ''
  return !meta.isSubagent || gate.isApplyAgent(meta.agentName, description)
}

// agy gives a hook no tool output, so the lines come from a new run of the same target.
function getSourceLines(gate, payload, header) {
  const target = header.match(EXCERPT_TARGET_PATTERN)?.[1] ?? ''
  const cwd = payload.workspacePaths?.[0] ?? process.cwd()
  const { stdout } = spawnSync('saw', ['excerpt', target], { cwd, encoding: 'utf8' })
  return gate.getExcerptBlocks(stdout ?? '')[header]
}

function getReportDenial(gate, payload, state, meta, message) {
  const isChecked = meta.isSubagent && gate.isExcerptAgent(meta.agentName) && !state.isReportReturned
  if (!isChecked) return undefined
  const denial = gate.getReportDenial(message, (header) => getSourceLines(gate, payload, header))
  if (denial !== undefined) {
    state.isReportReturned = true
    saveState(payload.conversationId, state)
  }
  return denial
}

function getCommandOutput(gate, command, meta) {
  const guarded = gate.getGuardedCommand(command, meta.isSubagent)
  const isRewritten = guarded !== command && process.platform !== 'win32'
  return isRewritten ? { decision: 'allow', overwrite: { CommandLine: guarded } } : { decision: 'allow' }
}

function getExpectedSubagentModel(typeName) {
  const defPath = path.join(PLUGIN_ROOT, 'agents', String(typeName || '').toLowerCase() + '.md')
  if (!fs.existsSync(defPath)) return undefined
  const content = fs.readFileSync(defPath, 'utf8')
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return undefined
  const line = match[1].split('\n').find((candidate) => candidate.startsWith('model:'))
  return line ? line.replace(/^model:\s*/, '').trim() : undefined
}

function isSprintLogNewer(cwd, armedAtMs) {
  const logPath = path.join(cwd, SPRINT_LOG)
  if (!fs.existsSync(logPath)) return false
  return fs.statSync(logPath).mtimeMs > armedAtMs
}

function handlePreInvocation(payload, state) {
  const userInput = String(payload.lastUserInput || '')
  if (userInput && userInput !== state.lastUserInput) {
    state.lastUserInput = userInput
    if (NO_GATE_PATTERN.test(userInput)) {
      state.isNoGateArmed = true
      state.armedAtMs = Date.now()
    }
    state.isGitInstructed = GIT_INSTRUCTION_PATTERN.test(userInput)
    state.contractReads = []
  }
  state.promptCount += 1
  saveState(payload.conversationId, state)

  if (state.promptCount % NUDGE_INTERVAL === 0) {
    const nudge = getRole() === MACHINIST_ROLE ? NUDGE_MACHINIST : NUDGE_DEFAULT
    return {
      injectSteps: [
        { systemMessage: { systemMessage: READ_DIRECTIVE + '\n\n' + nudge } }
      ]
    }
  }
  return {}
}

async function handlePreToolUse(gate, payload, state) {
  const toolName = payload.toolCall?.name || ''
  const args = payload.toolCall?.args || {}
  const role = getRole()
  const meta = await getConversationMeta(payload)

  if (toolName === 'run_command') {
    const command = String(args.CommandLine || '')
    const denial = gate.getShellDenial(command, meta.isSubagent, canApply(gate, meta))
    if (denial !== undefined) return { decision: 'deny', reason: denial }
    const searches = TEXT_SEARCH_PATTERN.test(command) ? [command] : gate.getSawFinds(command)
    if (searches.some((search) => CPP_TARGET_PATTERN.test(search) && !LITERAL_SEARCH_PATTERN.test(search))) {
      return { decision: 'deny', reason: gate.SEARCH_GATE }
    }
    const invocations = countMatches(GIT_COMMAND_PATTERN, command)
    if (invocations > 0 && !state.isGitInstructed) {
      const readOnly = countMatches(GIT_READ_ONLY_PATTERN, command)
      const sync = role === MACHINIST_ROLE ? countMatches(GIT_SYNC_PATTERN, command) : 0
      if (invocations !== readOnly + sync) {
        return { decision: 'deny', reason: GIT_GATE }
      }
    }
    if (gate.isScriptRun(command)) return { decision: 'force_ask', reason: gate.SCRIPT_GATE }
    return getCommandOutput(gate, command, meta)
  }

  if (toolName === 'edit_file') return { decision: 'deny', reason: gate.EDIT_GATE }
  if (toolName === 'write_file') {
    const target = String(args.Path || '')
    const isOverwrite = meta.isSubagent && !gate.isTemporaryPath(target) && fs.existsSync(target)
    return isOverwrite ? { decision: 'deny', reason: gate.WRITE_GATE } : { decision: 'allow' }
  }

  if (toolName === 'send_message') {
    const denial = getReportDenial(gate, payload, state, meta, String(args.Message || ''))
    return denial === undefined ? { decision: 'allow' } : { decision: 'deny', reason: denial }
  }

  if (toolName === 'ask_question') {
    if (state.isNoGateArmed && role === DEFAULT_ROLE) {
      return { decision: 'deny', reason: STEP_GATE }
    }
    if (role === DEFAULT_ROLE && state.contractReads.length < CONTRACT_DOCUMENTS.length) {
      return { decision: 'deny', reason: CONTRACT_GATE }
    }
    return { decision: 'allow' }
  }

  if (toolName === 'invoke_subagent') {
    const typeName = String(args.TypeName || '')
    if (typeName.toLowerCase() === PATHFINDER_AGENT) {
      state.isDoxygenDelegated = DOXYGEN_TASK_PATTERN.test(String(args.Role || ''))
      saveState(payload.conversationId, state)
    }
    const expected = getExpectedSubagentModel(typeName)
    const passed = String(args.Model || '')
    if (expected !== undefined && passed !== expected) {
      return {
        decision: 'deny',
        reason: 'invoke_subagent needs Model "' + expected + '", the model: value in ' + typeName.toLowerCase() + '.md. Pass Model "' + expected + '" on every invoke_subagent call. Per CAROL.md Subagent Model, a tier change is ARCHITECT\'s edit to the definition.'
      }
    }
    return { decision: 'allow' }
  }

  if (toolName === 'call_mcp_tool') {
    const serverName = String(args.ServerName || '')
    const { agentName, isSubagent } = meta
    const isPathfinder = agentName.toLowerCase() === PATHFINDER_AGENT
    const isCounselorMain = !isSubagent && (agentName ? agentName.toUpperCase() === DEFAULT_ROLE : role === DEFAULT_ROLE)
    if (SCOUT_SERVER_PATTERN.test(serverName) && !isPathfinder) {
      return { decision: 'deny', reason: SCOUT_GATE }
    }
    if (WHATDBG_SERVER_PATTERN.test(serverName) && !isCounselorMain && !isPathfinder) {
      return { decision: 'deny', reason: WHATDBG_GATE }
    }
    if (SAW_SERVER_PATTERN.test(serverName)) {
      const runArguments = args.Arguments?.arguments ?? []
      const denial = gate.getRunDenial(runArguments, isSubagent, canApply(gate, meta))
      if (denial !== undefined) return { decision: 'deny', reason: denial }
    }
    return { decision: 'allow' }
  }

  return { decision: 'allow' }
}

function handlePostToolUse(payload, state) {
  const toolName = payload.toolCall?.name || ''
  const args = payload.toolCall?.args || {}

  if (toolName === 'read_file' && !payload.error) {
    const match = String(args.Path || '').match(CONTRACT_DOCUMENT_PATTERN)
    const isFullRead = args.StartLine === undefined && args.EndLine === undefined
    if (match && isFullRead && !state.contractReads.includes(match[1])) {
      state.contractReads.push(match[1])
      saveState(payload.conversationId, state)
    }
  } else if (toolName === 'ask_question') {
    state.contractReads = []
    saveState(payload.conversationId, state)
  }

  return {}
}

function getLastAssistantMessage(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return ''
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n')
    for (let i = lines.length - 1; i >= 0; --i) {
      const entry = JSON.parse(lines[i])
      if (entry.type === 'PLANNER_RESPONSE' && typeof entry.content === 'string') {
        return entry.content
      }
    }
  } catch {}
  return ''
}

function handleStop(payload, state) {
  const isContinuation = payload.continuationActive === true || Number(payload.executionNum) > 0
  if (state.isNoGateArmed && getRole() === DEFAULT_ROLE) {
    if (isSprintLogNewer(payload.cwd || process.cwd(), state.armedAtMs)) {
      state.isNoGateArmed = false
      saveState(payload.conversationId, state)
    } else if (!isContinuation) {
      return { decision: 'continue', reason: STEP_GATE }
    }
  }
  if (!isContinuation && OPEN_END_PATTERN.test(getLastAssistantMessage(payload.transcriptPath))) {
    return { decision: 'continue', reason: READ_DIRECTIVE }
  }
  return {}
}

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => { raw += chunk })
process.stdin.on('end', async () => {
  try {
    const gate = await import('./saw-gate.mjs')
    const payload = JSON.parse(raw || '{}')
    const state = loadState(payload.conversationId)
    const event = payload.hookEventName || ''
    let output = {}

    if (event === 'PreInvocation') output = handlePreInvocation(payload, state)
    else if (event === 'PreToolUse') output = await handlePreToolUse(gate, payload, state)
    else if (event === 'PostToolUse') output = handlePostToolUse(payload, state)
    else if (event === 'Stop') output = handleStop(payload, state)

    process.stdout.write(JSON.stringify(output) + '\n')
  } catch (error) {
    process.stdout.write(JSON.stringify({ decision: 'deny', reason: 'CAROL gate failed (' + error.message + '), so this call was not run.' }) + '\n')
  }
})
