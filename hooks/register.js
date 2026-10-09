import { atom, read, update } from 'claude-code'

const NUDGE_INTERVAL = 5
const DEFAULT_ROLE = 'COUNSELOR'
const MACHINIST_ROLE = 'MACHINIST'
const ROLE_FILE = '/.carol-role'
const AGENTS_DIRECTORY = '/agents/'
const SPRINT_LOG = 'carol/SPRINT-LOG.md'

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
const IN_PLACE_PATTERN = new RegExp(COMMAND_HEAD + '(?:(?:sed|perl)\\s+(?:[^|;&]*\\s)?(?:-[A-Za-z]*i[A-Za-z.]*|--in-place)(?:[\\s=]|$)|awk\\s+-i\\s+inplace)')

const GIT_GATE = "This git command needs ARCHITECT's instruction, and ARCHITECT's last prompt names no git command (CAROL.md Git). Read-only git is allowed, and MACHINIST also runs push and pull. Do not retry. Read the working tree with the Read tool, or report what you need."
const IN_PLACE_GATE = "An in-place edit with sed, perl or awk is not allowed (CAROL.md Destructive-Edit Discipline). Run: carol apply --expect N 'sed-expression' file... It backs up each file, prints the preview, checks that the changed-line count equals N, applies, verifies, and restores on a mismatch."
const STEP_GATE = 'No gate until /log: this run ends at the sprint log. A text-only end of turn is a report, not the endpoint. Per CAROL.md Step Gate, a stop before the log is evidence that CONTRACT was not read at that point. Read ~/.carol/MANIFESTO.md, ~/.carol/CODING.md and ~/.carol/NAMES.md again with the Read tool, then read the implicated code at file:line. Correct course with the CONTRACT clause that covers it, and do the next step. Stop only for the closed stop set in CAROL.md Step Gate. If a subagent is still running, end the turn and wait for it.'
const READ_DIRECTIVE = "If your reasoning still leaves an open end to fill in, read again thoroughly with the Read tool. Find the answer as a citable fact from the codebase, checked against ~/.carol/MANIFESTO.md, ~/.carol/CODING.md and ~/.carol/NAMES.md, and from the agreed rulings in the RFC and the PLAN. Above all, use ARCHITECT's explicit discussion recorded in the chat history. Never fill in a gap. Never leave an open end that reading can answer. Respond only with a citable fact."
const OPEN_END_PATTERN = /\b(?:not read yet|(?:still )?needs? to (?:be )?verif(?:y|ied)|not yet verified)\b/i
const NUDGE_MACHINIST ='CAROL NUDGE — MACHINIST executes directly with its own hands; @Pathfinder grounds unfamiliar surface; cross-platform consistency holds for ~/.config/ edits. Discuss before executing changes; cite file:line.'
const NUDGE_DEFAULT = "CAROL NUDGE — Stay in role: plan and delegate (@Engineer code, @Pathfinder discovery, @Auditor once at sprint completion). Answer by reading; every claim cites file:line. Before the plan locks, hold answers until ARCHITECT's go. After the lock, execute to the endpoint per CAROL.md Step Gate."

const promptCount = atom({ plugin: 'carol', key: 'promptCount' }, 0)
const armedAtMs = atom({ plugin: 'carol', key: 'armedAtMs' }, 0)
const isNoGateArmed = atom({ plugin: 'carol', key: 'isNoGateArmed' }, false)
const isGitInstructed = atom({ plugin: 'carol', key: 'isGitInstructed' }, false)
const sessionAgentType = atom({ plugin: 'carol', key: 'sessionAgentType' }, '')

function countMatches(pattern, text) {
  return (text.match(pattern) ?? []).length
}

async function getRole($) {
  const role = await $.env.get('CAROL_ROLE')
  if (role) return role
  const roleFile = (await $.env.get('CAROL_ROOT')) + ROLE_FILE
  const fileRole = (await $.fs.exists(roleFile)) ? (await $.fs.read(roleFile)).trim() : ''
  return fileRole || DEFAULT_ROLE
}

async function isNoGateRun($) {
  return (await read($, isNoGateArmed)) && (await getRole($)) === DEFAULT_ROLE
}

async function getExpectedModel($, agentType) {
  const definition = (await $.env.get('CAROL_ROOT')) + AGENTS_DIRECTORY + agentType + '.md'
  if (!(await $.fs.exists(definition))) return undefined
  const line = (await $.fs.read(definition)).split('\n').find((candidate) => candidate.startsWith('model:'))
  return line.replace(/^model:\s*/, '')
}

async function isSprintLogNewer($, sprintLog) {
  return (await $.fs.exists(sprintLog)) && (await $.fs.stat(sprintLog)).mtimeMs > (await read($, armedAtMs))
}

function getPermittedInvocations(command, isSyncPermitted) {
  const readOnly = countMatches(GIT_READ_ONLY_PATTERN, command)
  return isSyncPermitted ? readOnly + countMatches(GIT_SYNC_PATTERN, command) : readOnly
}

async function getBashVerdict($, command, isMainSession) {
  if (IN_PLACE_PATTERN.test(command)) return { deny: IN_PLACE_GATE }
  const invocations = countMatches(GIT_COMMAND_PATTERN, command)
  if (invocations === 0 || (await read($, isGitInstructed))) return undefined
  const isSyncPermitted = isMainSession && (await read($, sessionAgentType)) === MACHINIST_ROLE
  return invocations === getPermittedInvocations(command, isSyncPermitted) ? undefined : { deny: GIT_GATE }
}

async function failClosed($, e, next) {
  if (next.called) return next(e)
  return { deny: 'CAROL gate failed (' + next.error.kind + '), so this call was not run.' }
}

export function register(on) {
  on('classic.UserPromptSubmit', async ($, e, next) => {
    await update($, sessionAgentType, () => e.agent_type ?? '')
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const isArmed = NO_GATE_PATTERN.test(e.text)
    await update($, isNoGateArmed, () => isArmed)
    if (isArmed) {
      const armedAt = await $.clock.now()
      await update($, armedAtMs, () => armedAt)
    }
    await update($, isGitInstructed, () => GIT_INSTRUCTION_PATTERN.test(e.text))
    await update($, promptCount, (count) => count + 1)
    const context = [...(e.context ?? []), READ_DIRECTIVE]
    if ((await read($, promptCount)) % NUDGE_INTERVAL === 0) {
      context.push((await getRole($)) === MACHINIST_ROLE ? NUDGE_MACHINIST : NUDGE_DEFAULT)
    }
    return next({ ...e, context })
  })

  on('classic.Stop', async ($, e, next) => {
    if (await isNoGateRun($)) {
      if (await isSprintLogNewer($, e.cwd + '/' + SPRINT_LOG)) {
        await update($, isNoGateArmed, () => false)
      } else if (e.stop_hook_active !== true) {
        return { block: STEP_GATE }
      }
    }
    if (OPEN_END_PATTERN.test(e.last_assistant_message ?? '') && e.stop_hook_active !== true) {
      return { block: READ_DIRECTIVE }
    }
    return next(e)
  })

  on('tool.call', { tool: ['AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode'] }, async ($, e, next) => {
    if (await isNoGateRun($)) return { deny: STEP_GATE }
    return next(e)
  }).catch(failClosed)

  on('tool.call', { tool: ['Agent', 'Task'] }, async ($, e, next) => {
    const agentType = String(e.subagent_type ?? '').toLowerCase()
    const expected = await getExpectedModel($, agentType)
    const passed = e.model ?? ''
    if (expected !== undefined && passed !== expected) {
      return { deny: 'Agent call needs model "' + expected + '", the model: value in ' + agentType + ".md. Pass model \"" + expected + "\" on every Agent call. Per CAROL.md Subagent Model, a tier change is ARCHITECT's edit to the definition." }
    }
    return next(e)
  }).catch(failClosed)

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const verdict = await getBashVerdict($, e.command, e.agentId === undefined)
    return verdict === undefined ? next(e) : verdict
  }).catch(failClosed)
}
