import { existsSync, statSync, watch } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getGuardedCommand, isApplyAgent, isExcerptAgent } from '../../../hooks/saw-gate.mjs'
import {
  CONTRACT_GATE,
  DEFAULT_ROLE,
  DENIED_TOOLS,
  FOREGROUND_GATE,
  GIT_INSTRUCTION_PATTERN,
  MACHINIST_ROLE,
  NO_GATE_PATTERN,
  SAW_TOOL,
  SAW_TOOLS,
  SPRINT_LOG,
  STEP_GATE,
  getContractDocument,
  getModelDenial,
  getRunDenial,
  getShellDenial,
  getStopBlock,
  isContractUnread,
  isReadOnlyGitAgent,
} from './gate.js'
import { getLastAssistantText, makeReports } from './report.js'
import { getCommandLine, getModelReference, readAgentDefinitions, readOutputStyle, readSessionStart } from './source.js'
import { registerLspTool } from './lsp.js'

const CAROL_ROOT = path.join(os.homedir(), '.carol')
const WATCHED_DIRECTORIES = ['agents', 'cast']
const RELOAD_DELAY_MS = 200
const STOP_EVENT = 'session.execution.succeeded'
const COMPLETED_STATUS = 'completed'
const QUESTION_TOOL = 'question'
const READ_TOOL = 'read'
const SUBAGENT_TOOL = 'subagent'
const SHELL_TOOL = 'shell'
const WINDOWS_PLATFORM = 'win32'
const OUTPUT_STYLE_KEY = 'carol.output-style'
const SESSION_START_KEY = 'carol.session-start'

function makeState() {
  return { armedAtMs: 0, isNoGateArmed: false, isGitInstructed: false, isStopHookActive: false, isStarted: false, contractReads: new Set() }
}

function getRole(session) {
  return (session.agent ?? '').toUpperCase() || DEFAULT_ROLE
}

function getAnswerText(event) {
  if (event.status === 'error') return event.error?.message ?? ''
  return (event.result?.output?.answers ?? []).flat().join('\n')
}

export default {
  id: 'carol',
  async setup(ctx) {
    const root = ctx.options.root ?? CAROL_ROOT
    const states = new Map()
    const reports = makeReports(ctx.session)
    let definitions = readAgentDefinitions(root)

    function getState(sessionID) {
      if (!states.has(sessionID)) states.set(sessionID, makeState())
      return states.get(sessionID)
    }

    async function getRootSession(session) {
      return session.parentID === undefined ? session : getRootSession(await ctx.session.get({ sessionID: session.parentID }))
    }

    function isNoGateRun(rootSession) {
      return getState(rootSession.id).isNoGateArmed && getRole(rootSession) === DEFAULT_ROLE
    }

    function armNoGate(state) {
      state.isNoGateArmed = true
      state.armedAtMs = Date.now()
    }

    function isSprintLogNewer(session, state) {
      const sprintLog = path.join(session.location?.directory ?? ctx.location.directory, SPRINT_LOG)
      return existsSync(sprintLog) && statSync(sprintLog).mtimeMs > state.armedAtMs
    }

    async function startSession(sessionID) {
      const entries = [
        [OUTPUT_STYLE_KEY, readOutputStyle(root)],
        [SESSION_START_KEY, readSessionStart(root)],
      ].filter(([, value]) => value !== undefined)
      await Promise.all(entries.map(([key, value]) => ctx.session.instructions.entry.put({ sessionID, key, value })))
    }

    async function getQuestionDenial(event) {
      const rootSession = await getRootSession(await ctx.session.get({ sessionID: event.sessionID }))
      if (isNoGateRun(rootSession)) return STEP_GATE
      return getRole(rootSession) === DEFAULT_ROLE && isContractUnread(getState(rootSession.id).contractReads) ? CONTRACT_GATE : undefined
    }

    function canApply(event, session) {
      return session.parentID === undefined || isApplyAgent(event.agent ?? '', session.title ?? '')
    }

    async function getShellDenialFor(event) {
      const session = await ctx.session.get({ sessionID: event.sessionID })
      const isSubagent = session.parentID !== undefined
      const rootSession = await getRootSession(session)
      const command = String(event.input?.command ?? '')
      const denial = getShellDenial({
        command,
        isSubagent,
        isBackground: event.input?.background === true,
        canApply: canApply(event, session),
        canReadGit: isReadOnlyGitAgent(event.agent, session.title ?? ''),
        isGitInstructed: getState(rootSession.id).isGitInstructed,
        isMachinistSession: getRole(rootSession) === MACHINIST_ROLE,
      })
      if (denial === undefined && process.platform !== WINDOWS_PLATFORM) event.input = { ...event.input, command: getGuardedCommand(command, isSubagent) }
      return denial
    }

    async function getSubagentDenial(event) {
      const agentID = String(event.input?.agent ?? '').toLowerCase()
      if (isExcerptAgent(agentID) && event.input?.background === true) return FOREGROUND_GATE
      if (!definitions.has(agentID)) return undefined
      const model = (await ctx.agent.get({ agentID })).data?.model
      if (model === undefined) return undefined
      return getModelDenial(agentID, getModelReference(model), String(event.input?.model ?? ''))
    }

    async function getRunDenialFor(event) {
      const session = await ctx.session.get({ sessionID: event.sessionID })
      return getRunDenial(event.input?.arguments ?? [], session.parentID !== undefined, canApply(event, session))
    }

    const denials = {
      [QUESTION_TOOL]: getQuestionDenial,
      [SUBAGENT_TOOL]: getSubagentDenial,
      [SHELL_TOOL]: getShellDenialFor,
      [SAW_TOOL]: getRunDenialFor,
      ...Object.fromEntries(SAW_TOOLS.map((tool) => [tool, () => DENIED_TOOLS[tool]])),
    }

    async function onQuestionFinished(event) {
      const rootSession = await getRootSession(await ctx.session.get({ sessionID: event.sessionID }))
      const state = getState(rootSession.id)
      state.contractReads.clear()
      if (NO_GATE_PATTERN.test(getAnswerText(event))) armNoGate(state)
    }

    async function onReadFinished(event) {
      const document = event.status === COMPLETED_STATUS ? getContractDocument(event.input) : undefined
      if (document !== undefined) getState(event.sessionID).contractReads.add(document)
    }

    const finishes = {
      [QUESTION_TOOL]: onQuestionFinished,
      [READ_TOOL]: onReadFinished,
      [SUBAGENT_TOOL]: reports.checkResult,
      [SHELL_TOOL]: reports.addReceipts,
      [SAW_TOOL]: reports.addReceipts,
    }

    async function onStop(sessionID) {
      const session = await ctx.session.get({ sessionID })
      if (session.parentID !== undefined || (session.location?.directory ?? ctx.location.directory) !== ctx.location.directory) return
      const state = getState(session.id)
      const isStopHookActive = state.isStopHookActive
      state.isStopHookActive = false
      const isLogged = isNoGateRun(session) && isSprintLogNewer(session, state)
      if (isLogged) state.isNoGateArmed = false
      const block = getStopBlock({
        isNoGateRun: isNoGateRun(session),
        isSprintLogNewer: isLogged,
        isStopHookActive,
        lastAssistantMessage: getLastAssistantText(await ctx.session.context({ sessionID })),
      })
      if (block === undefined) return
      state.isStopHookActive = true
      await ctx.session.synthetic({ sessionID, text: block })
    }

    await ctx.agent.transform((editor) => {
      definitions.forEach((definition, id) => {
        editor.update(id, (agent) => {
          agent.name = definition.name
          agent.system = definition.system
          agent.permissions = [...agent.permissions, ...definition.permissions]
          if (definition.description !== undefined) agent.description = definition.description
          if (agent.model === undefined && definition.model !== undefined) agent.model = definition.model
          if (definition.color !== undefined) agent.color = definition.color
        })
      })
    })

    let reloadTimer
    const watchers = WATCHED_DIRECTORIES.map((directory) =>
      watch(path.join(root, directory), () => {
        clearTimeout(reloadTimer)
        reloadTimer = setTimeout(() => {
          definitions = readAgentDefinitions(root)
          void ctx.agent.reload().catch(console.error)
        }, RELOAD_DELAY_MS)
      }),
    )

    await ctx.session.hook('prompt', async (event) => {
      const session = await ctx.session.get({ sessionID: event.sessionID })
      if (session.parentID !== undefined) return
      const state = getState(session.id)
      if (!state.isStarted) {
        await startSession(session.id)
        state.isStarted = true
      }
      const text = getCommandLine(root, event.prompt.text) ?? event.prompt.text
      if (NO_GATE_PATTERN.test(text)) armNoGate(state)
      state.isGitInstructed = GIT_INSTRUCTION_PATTERN.test(text)
      state.isStopHookActive = false
    })

    await ctx.session.hook('context', async (event) => {
      const session = await ctx.session.get({ sessionID: event.sessionID })
      const isSubagent = session.parentID !== undefined
      const removed = [...Object.keys(DENIED_TOOLS), ...(isSubagent ? [QUESTION_TOOL] : [])]
      removed.forEach((tool) => delete event.tools[tool])
    })

    await ctx.tool.hook('execute.before', async (event) => {
      const denial = await Promise.resolve(denials[event.tool]?.(event)).catch((error) => 'CAROL gate failed (' + error.message + '), so this call was not run.')
      if (denial !== undefined) throw new Error(denial)
    })

    await ctx.tool.hook('execute.after', async (event) => {
      await Promise.resolve(finishes[event.tool]?.(event)).catch(console.error)
    })

    const stopLsp = await registerLspTool(ctx, root)

    const controller = new AbortController()
    void (async () => {
      for await (const event of ctx.event.subscribe({ types: [STOP_EVENT], signal: controller.signal })) {
        await onStop(event.data.sessionID).catch(console.error)
      }
    })().catch(console.error)

    return () => {
      controller.abort()
      clearTimeout(reloadTimer)
      watchers.forEach((watcher) => watcher.close())
      stopLsp()
    }
  },
}
