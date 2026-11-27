import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import plugin from '../index.js'

const CAROL_ROOT = path.join(os.homedir(), '.carol')
const STATE_DIRECTORY = path.join(CAROL_ROOT, '.tmp')
const ROOT_SESSION = 'ses_root'
export const CHILD_SESSION = 'ses_child'
const directories = []

// A failed test does not reach close.
process.on('exit', () => directories.forEach((directory) => rmSync(directory, { recursive: true, force: true })))
const DEFINITIONS = {
  'pathfinder.md': '---\nname: Pathfinder\nmodel: haiku\ntools: Read, Bash\n---\n',
  'engineer.md': '---\nname: Engineer\nmodel: sonnet\ntools: Read, Bash\n---\n',
  'auditor.md': '---\nname: Auditor\nmodel: opus\ntools: Read, Bash\n---\n',
}

function makeEventStream() {
  const waiting = []
  let consumed
  return {
    push(event) {
      return new Promise((resolve) => {
        consumed = resolve
        waiting.shift()(event)
      })
    },
    subscribe() {
      return {
        [Symbol.asyncIterator]() {
          return {
            next() {
              consumed?.()
              return new Promise((resolve) => waiting.push((event) => resolve({ value: event, done: false })))
            },
            return() {
              return Promise.resolve({ done: true })
            },
          }
        },
      }
    },
  }
}

function makeAgentRegistry(configModels) {
  const agents = Object.fromEntries(Object.entries(configModels).map(([id, model]) => [id, { id, model, permissions: [] }]))
  return {
    transform: async (callback) => {
      callback({
        update: (id, update) => {
          agents[id] ??= { id, permissions: [] }
          update(agents[id])
        },
      })
      return { dispose: async () => {} }
    },
    get: async ({ agentID }) => ({ data: agents[agentID] }),
    reload: async () => {},
  }
}

export async function makeCarol({ rootAgent, childAgent = 'engineer', childTitle = '', lastAssistantMessage = '', configModels = {} } = {}) {
  mkdirSync(STATE_DIRECTORY, { recursive: true })
  const root = mkdtempSync(path.join(STATE_DIRECTORY, 'opencode-root-'))
  const work = mkdtempSync(path.join(STATE_DIRECTORY, 'opencode-work-'))
  directories.push(root, work)
  mkdirSync(path.join(root, 'agents'))
  Object.entries(DEFINITIONS).forEach(([file, text]) => writeFileSync(path.join(root, 'agents', file), text))
  for (const source of ['cast', 'commands', '.claude-plugin', 'output-styles.md']) {
    cpSync(path.join(CAROL_ROOT, source), path.join(root, source), { recursive: true })
  }

  const sessions = {
    [ROOT_SESSION]: { id: ROOT_SESSION, agent: rootAgent, location: { directory: work } },
    [CHILD_SESSION]: { id: CHILD_SESSION, parentID: ROOT_SESSION, agent: childAgent, title: childTitle, location: { directory: work } },
  }
  const hooks = {}
  const synthetics = []
  const entries = []
  const events = makeEventStream()
  const registration = { dispose: async () => {} }
  const ctx = {
    options: { root },
    location: { directory: work },
    agent: makeAgentRegistry(configModels),
    tool: {
      transform: async () => registration,
      hook: async (name, callback) => {
        hooks['tool.' + name] = callback
        return registration
      },
    },
    session: {
      hook: async (name, callback) => {
        hooks['session.' + name] = callback
        return registration
      },
      get: async ({ sessionID }) => sessions[sessionID],
      context: async () => [{ type: 'assistant', content: [{ type: 'text', text: lastAssistantMessage }] }],
      synthetic: async (input) => synthetics.push(input),
      wait: async () => {},
      instructions: { entry: { put: async (input) => entries.push(input) } },
    },
    event: { subscribe: () => events.subscribe() },
    permission: { assert: async () => {} },
  }
  const cleanup = await plugin.setup(ctx)

  return {
    root,
    lastInput: undefined,
    work,
    synthetics,
    entries,
    async prompt(text) {
      const event = { sessionID: ROOT_SESSION, messageID: 'msg_1', prompt: { text }, delivery: 'steer' }
      await hooks['session.prompt'](event)
      return event.prompt.text
    },
    async callTool(tool, input, { isSubagent = false } = {}) {
      const sessionID = isSubagent ? CHILD_SESSION : ROOT_SESSION
      const agent = isSubagent ? childAgent : rootAgent
      const event = { tool, sessionID, agent, messageID: 'msg_1', id: 'call_1', input }
      try {
        await hooks['tool.execute.before'](event)
        this.lastInput = event.input
        return 'allow'
      } catch {
        return 'deny'
      }
    },
    async finishTool(tool, outcome, { isSubagent = false } = {}) {
      const sessionID = isSubagent ? CHILD_SESSION : ROOT_SESSION
      const agent = isSubagent ? childAgent : rootAgent
      const event = { tool, sessionID, agent, messageID: 'msg_1', id: 'call_1', input: {}, ...outcome }
      await hooks['tool.execute.after'](event)
      return event.result
    },
    async getTools({ isSubagent = false } = {}) {
      const event = { sessionID: isSubagent ? CHILD_SESSION : ROOT_SESSION, tools: { question: {}, edit: {}, patch: {}, grep: {}, write: {}, read: {} } }
      await hooks['session.context'](event)
      return Object.keys(event.tools)
    },
    async stop(sessionID = ROOT_SESSION) {
      await events.push({ type: 'session.execution.succeeded', data: { sessionID } })
    },
    async close() {
      cleanup()
      directories.forEach((directory) => rmSync(directory, { recursive: true, force: true }))
    },
  }
}
