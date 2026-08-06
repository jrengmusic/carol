// @amp-agent-mode {"key":"oracle","label":"ORACLE"}
// @amp-agent-mode {"key":"counselor","label":"COUNSELOR"}
// @amp-agent-mode {"key":"machinist","label":"MACHINIST"}

import type { Agent, ExperimentalPluginAPI, PluginAPI } from '@ampcode/plugin'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

const CAROL_ROOT = `${process.env.HOME}/.carol`
const AGENTS_DIR = join(CAROL_ROOT, 'agents')

// ─── Mapping tables ───────────────────────────────────────────────

const COLORS: Record<string, string> = {
  orange: '#ff8c00',
  cyan: '#00d9ff',
  gray: '#808080',
  blue: '#0096ff',
  red: '#ff3333',
  green: '#33ff33',
  yellow: '#ffd700',
}

const MODELS: Record<string, string> = {
  fable: 'anthropic/claude-fable-5',
  opus: 'anthropic/claude-opus-4-8',
  sonnet: 'anthropic/claude-sonnet-4-6',
  haiku: 'anthropic/claude-haiku-4-5-20251001',
  // Exact IDs used in agent frontmatter since 0.0.23
  'claude-fable-5': 'anthropic/claude-fable-5',
  'claude-opus-5': 'anthropic/claude-opus-5',
  'claude-opus-4-8': 'anthropic/claude-opus-4-8',
  'claude-sonnet-5': 'anthropic/claude-sonnet-5',
  'claude-haiku-4-5-20251001': 'anthropic/claude-haiku-4-5-20251001',
  // Amp-specific overrides — not in shared frontmatter
  'gpt-5.6-sol': 'openai/gpt-5.6-sol',
}

// (model overrides moved to combined table above)

const EFFORTS: Record<string, 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'> = {
  oracle: 'high',
  counselor: 'high',
  machinist: 'medium',
  // Secondaries
  engineer: 'medium',
  pathfinder: 'minimal',
  librarian: 'minimal',
  auditor: 'high',
}

// Amp-specific model overrides per role (takes priority over frontmatter model)
const MODEL_OVERRIDES: Record<string, string> = {
  counselor: 'anthropic/claude-opus-4-8',
  machinist: 'anthropic/claude-sonnet-5',
  // Secondaries
  engineer: 'anthropic/claude-sonnet-5',
  pathfinder: 'amp/glm-5.2',
  librarian: 'amp/glm-5.2',
  auditor: 'anthropic/claude-opus-5',
}

const TOOL_SETS: Record<string, string[]> = {
  // Primaries
  oracle: ['finder', 'librarian', 'Read', 'shell_command', 'read_web_page', 'web_search'],
  counselor: ['finder', 'librarian', 'Read', 'shell_command', 'edit_file', 'create_file', 'apply_patch', 'read_web_page', 'web_search', 'skill', 'Task'],
  machinist: ['finder', 'librarian', 'Read', 'shell_command', 'edit_file', 'create_file', 'apply_patch', 'read_web_page', 'web_search', 'skill', 'Task'],
  // Secondaries
  engineer: ['Read', 'shell_command', 'edit_file', 'create_file', 'apply_patch', 'finder'],
  pathfinder: ['Read', 'shell_command', 'finder'],
  librarian: ['Read', 'shell_command', 'read_web_page', 'web_search'],
  auditor: ['Read', 'shell_command', 'finder'],
}

// Secondary roles registered as subagent tools
const SECONDARIES = ['engineer', 'pathfinder', 'librarian', 'auditor'] as const
const ROLES = ['oracle', 'counselor', 'machinist'] as const

type PrimaryAgents = Map<typeof ROLES[number], { agent: Agent; name: string }>

// ─── Frontmatter parser ───────────────────────────────────────────

interface AgentFrontmatter {
  name: string
  description: string
  model: string
  effort?: string
  color: string
}

function parseFrontmatter(raw: string): { frontmatter: AgentFrontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error('No frontmatter found')

  const fm = match[1]
  const body = match[2]

  const get = (key: string): string | undefined =>
    fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim()

  return {
    frontmatter: {
      name: get('name') ?? '',
      description: get('description') ?? '',
      model: get('model') ?? 'sonnet',
      effort: get('effort'),
      color: get('color') ?? 'gray',
    },
    body,
  }
}

// ─── Amp adaptation preamble ──────────────────────────────────────

const AMP_PREAMBLE = `
## Amp Adaptation Notes
You are running in Amp, not Claude Code. CAROL.md is loaded as project instructions (Amp reads CLAUDE.md natively).
- "AskUserQuestion tool" → ask the user directly in chat
- "@Pathfinder" → use finder tool for codebase discovery
- "@Librarian" → use librarian tool for research (library-mode and domain-mode)
- "@Engineer" / "@Auditor" → use Task tool for delegation (proper delegate_* tools coming in follow-up)
- "EnterPlanMode/ExitPlanMode" → not available. Write PLAN.md directly. Gate on ARCHITECT approval per CAROL.md Execution Gate.
- "TodoWrite/TaskCreate/TaskList" → track tasks in context
- "Bash" → shell_command tool
- "Read" → Read tool
- "Grep/Glob" → finder tool or shell_command with rg/find
- "SendMessage/TaskStop/Monitor/Workflow" → not available in Amp
`

function loadAgent(role: string): { frontmatter: AgentFrontmatter; instructions: string } {
  const path = join(AGENTS_DIR, `${role}.md`)
  if (!existsSync(path)) throw new Error(`Agent file not found: ${path}`)
  const raw = readFileSync(path, 'utf8')
  const { frontmatter, body } = parseFrontmatter(raw)
  return { frontmatter, instructions: AMP_PREAMBLE + body.trim() }
}

// ─── Plugin entry ─────────────────────────────────────────────────

// Translation: Claude Code tool/syntax → Amp-aware phrasing
const COMMAND_TRANSLATIONS: Array<[RegExp, string]> = [
  [/AskUserQuestion tool/g, 'ask the user directly in chat'],
  [/`AskUserQuestion`/g, 'ask the user directly in chat'],
  [/EnterPlanMode/g, 'write PLAN.md directly (no plan mode in Amp — gate on ARCHITECT approval per CAROL.md Execution Gate)'],
  [/ExitPlanMode/g, ''],
  [/TaskCreate/g, 'track task in context'],
  [/TaskList/g, 'review tracked tasks'],
  [/TaskOutput/g, 'check task output'],
  [/@Engineer/g, 'delegate to Engineer via Task tool'],
  [/@Pathfinder/g, 'use finder tool for codebase discovery'],
  [/@Auditor/g, 'delegate to Auditor via Task tool'],
  [/@Machinist/g, 'delegate to MACHINIST via Task tool'],
  [/@Librarian/g, 'use librarian tool'],
  [/@Oracle/g, 'use oracle tool'],
]

function translateCommand(body: string): string {
  let result = body
  for (const [pattern, replacement] of COMMAND_TRANSLATIONS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

function loadCommands(amp: PluginAPI) {
  const commandsDir = join(CAROL_ROOT, 'commands')
  if (!existsSync(commandsDir)) return

  const files = readdirSync(commandsDir).filter(f => f.endsWith('.md'))

  for (const file of files) {
    const raw = readFileSync(join(commandsDir, file), 'utf8')

    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!fmMatch) continue

    const frontmatter = fmMatch[1]
    const body = fmMatch[2]

    const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim() ?? file
    const argumentHint = frontmatter.match(/argument-hint:\s*(.+)/)?.[1]?.trim()
    const cmdLabel = file.replace('.md', '')
    const commandName = `carol-${cmdLabel}`

    amp.registerCommand(
      commandName,
      {
        title: `/${cmdLabel}`,
        category: 'carol',
        description: argumentHint ? `${description} — ${argumentHint}` : description,
      },
      async (ctx) => {
        if (!ctx.thread) {
          await ctx.ui.notify('No active thread. Send a message first, then re-run the command.')
          return
        }

        const translated = translateCommand(body.trim())

        await ctx.thread.append([{
          type: 'user-message',
          content: translated,
        }])
      },
    )

    amp.logger.log(`CAROL: registered command ${commandName}`)
  }
}

function registerPrimaryAgents(amp: PluginAPI, experimental: ExperimentalPluginAPI): PrimaryAgents {
  const primaryAgents: PrimaryAgents = new Map()

  // Register each CAROL primary as a custom agent mode + launch command
  for (const role of ROLES) {
    const { frontmatter, instructions } = loadAgent(role)
    const model = MODEL_OVERRIDES[role] ?? MODELS[frontmatter.model] ?? MODELS.sonnet
    const color = COLORS[frontmatter.color] ?? COLORS.gray
    const reasoningEffort = EFFORTS[role]
    const tools = TOOL_SETS[role] ?? TOOL_SETS.counselor

    const agent = experimental.createAgent({
      name: frontmatter.name,
      model,
      instructions,
      tools: { include: tools },
      reasoningEffort,
      display: { label: frontmatter.name, color },
    })

    primaryAgents.set(role, { agent, name: frontmatter.name })

    experimental.registerAgentMode({
      key: role,
      label: frontmatter.name,
      description: frontmatter.description,
      color,
      agent: agent.definition,
    })

    // Command: create new thread in this CAROL mode, with context handoff
    amp.registerCommand(
      `carol-${role}`,
      {
        title: `CAROL: New ${frontmatter.name} Thread`,
        category: 'carol',
        description: frontmatter.description,
      },
      async (ctx) => {
        // Gather context from current thread + SPRINT-LOG
        let handoffContext = ''

        // Read recent messages from current thread
        if (ctx.thread) {
          try {
            const messages = await ctx.thread.messages({ limit: 10 })
            const recentText = messages
              .map((m) => {
                if (m.role === 'user') return `USER: ${m.content}`
                if (m.role === 'assistant') return `ASSISTANT: ${m.content}`
                return ''
              })
              .filter(Boolean)
              .join('\n\n')
            if (recentText) {
              handoffContext += `## Previous Thread Context\nSource thread: ${ctx.thread.id}\n\n${recentText}\n\n`
            }
          } catch {
            // If we can't read messages, continue without them
          }
        }

        // Read SPRINT-LOG
        const sprintLogPath = join(CAROL_ROOT, 'carol', 'SPRINT-LOG.md')
        if (existsSync(sprintLogPath)) {
          const sprintLog = readFileSync(sprintLogPath, 'utf8').slice(0, 3000)
          handoffContext += `## SPRINT-LOG\n\n${sprintLog}\n\n`
        }

        // Read DEBT.md if exists at cwd
        const debtPath = join(process.cwd(), 'DEBT.md')
        if (existsSync(debtPath)) {
          const debt = readFileSync(debtPath, 'utf8').slice(0, 2000)
          handoffContext += `## DEBT.md\n\n${debt}\n\n`
        }

        const thread = await agent.createThread({
          show: true,
          ...(ctx.thread ? { parentThreadID: ctx.thread.id } : {}),
        })

        const activationMessage = handoffContext
          ? `${frontmatter.name}: Rock 'n Roll!\n\nYou are continuing from a previous session. Context below — read it, then wait for ARCHITECT direction.\n\n---\n\n${handoffContext}`
          : `${frontmatter.name}: Rock 'n Roll!`

        await thread.append([{
          type: 'user-message',
          content: activationMessage,
        }])
      },
    )

    amp.logger.log(`CAROL: registered ${frontmatter.name} mode + command (${model})`)
  }

  return primaryAgents
}

function registerSecondaryAgents(amp: PluginAPI, experimental: ExperimentalPluginAPI) {
  for (const role of SECONDARIES) {
    const { frontmatter, instructions } = loadAgent(role)
    const model = MODEL_OVERRIDES[role] ?? MODELS[frontmatter.model] ?? MODELS.sonnet
    const color = COLORS[frontmatter.color] ?? COLORS.gray
    const reasoningEffort = EFFORTS[role]
    const tools = TOOL_SETS[role] ?? ['Read', 'shell_command', 'finder']

    const subagent = experimental.createAgent({
      name: frontmatter.name,
      model,
      instructions,
      tools: { include: tools },
      reasoningEffort,
      display: { label: frontmatter.name, color },
    })

    amp.registerTool({
      name: `delegate_${role}`,
      description: `Delegate to ${frontmatter.name} subagent. ${frontmatter.description}`,
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: `Task for ${frontmatter.name}`,
          },
        },
        required: ['task'],
      },
      async execute({ task }, ctx) {
        const result = await subagent.run(task, {
          ...(ctx.thread ? { parentThreadID: ctx.thread.id } : {}),
        })
        return result.text
      },
    })

    amp.logger.log(`CAROL: registered ${frontmatter.name} subagent tool (${model})`)
  }
}

function createStatusItems(amp: PluginAPI, experimental: ExperimentalPluginAPI) {
  const carolVersion = existsSync(join(CAROL_ROOT, 'VERSION'))
    ? readFileSync(join(CAROL_ROOT, 'VERSION'), 'utf8').trim()
    : '?.?'

  const statusItem = experimental.createStatusItem('carol-role')
  const versionItem = experimental.createStatusItem('carol-version')
  statusItem.update({ text: 'CAROL' })
  versionItem.update({ text: `v${carolVersion}` })

  // Track active thread's mode + title for status display
  amp.activeThread.subscribe(async (thread) => {
    if (!thread) {
      statusItem.update({ text: 'CAROL' })
      return
    }
    try {
      const fullThread = amp.threads.get(thread.id)
      const agent = await fullThread.agent()
      const def = agent.definition

      // Get thread title
      let titleText = ''
      try {
        const title = await fullThread.title.get()
        titleText = title ? ` · ${title}` : ''
      } catch {
        // Title not set yet
      }

      if (def?.kind === 'agent-definition' && def?.display?.label) {
        statusItem.update({ text: `${def.display.label}${titleText}` })
      } else if (def?.kind === 'builtin-agent' && def?.mode) {
        statusItem.update({ text: `CAROL · Amp ${def.mode}${titleText}` })
      } else {
        statusItem.update({ text: `CAROL${titleText}` })
      }

      // Subscribe to title changes (observable)
      fullThread.title.subscribe((newTitle) => {
        const t = newTitle ? ` · ${newTitle}` : ''
        if (def?.kind === 'agent-definition' && def?.display?.label) {
          statusItem.update({ text: `${def.display.label}${t}` })
        } else if (def?.kind === 'builtin-agent' && def?.mode) {
          statusItem.update({ text: `CAROL · Amp ${def.mode}${t}` })
        } else {
          statusItem.update({ text: `CAROL${t}` })
        }
      })
    } catch {
      statusItem.update({ text: 'CAROL' })
    }
  })
}

function registerAgentStart(amp: PluginAPI, primaryAgents: PrimaryAgents) {
  amp.on('agent.start', async (event, ctx) => {
    try {
      const threadAgent = await ctx.thread.agent()
      const def = threadAgent.definition
      if (def?.kind === 'builtin-agent') {
        const explicitRole = ROLES.find((role) => {
          const activation = `${primaryAgents.get(role)!.name}: Rock 'n Roll!`
          return event.message === activation
            || event.message.startsWith(`${activation}\n`)
            || event.message.startsWith(`${activation}\r\n`)
        })
        const selectedPrimaryRole = explicitRole ?? 'counselor'
        const selectedPrimaryAgent = primaryAgents.get(selectedPrimaryRole)!

        // Cancel the built-in thread's turn before it starts
        await ctx.thread.cancel()

        // Read SPRINT-LOG for handoff context
        const sprintLogPath = join(CAROL_ROOT, 'carol', 'SPRINT-LOG.md')
        const sprintLog = existsSync(sprintLogPath)
          ? readFileSync(sprintLogPath, 'utf8').slice(0, 2000)
          : ''

        const newThread = await selectedPrimaryAgent.agent.createThread({ show: true })

        const activationMessage = sprintLog
          ? `${selectedPrimaryAgent.name}: Rock 'n Roll!\n\nYou are continuing from a previous session. SPRINT-LOG below — read it, then wait for ARCHITECT direction.\n\n---\n\n## SPRINT-LOG\n\n${sprintLog}\n\n---\n\nARCHITECT's first message:\n${event.message}`
          : `${selectedPrimaryAgent.name}: Rock 'n Roll!\n\nARCHITECT's first message:\n${event.message}`

        await newThread.append([{
          type: 'user-message',
          content: activationMessage,
        }])
      }
    } catch (error) {
      amp.logger.log(`CAROL: primary redirect failed: ${String(error)}`)
      throw error
    }
  })
}

export default function (amp: PluginAPI) {
  if (amp.experimental) {
    const primaryAgents = registerPrimaryAgents(amp, amp.experimental)
    loadCommands(amp)
    registerSecondaryAgents(amp, amp.experimental)
    createStatusItems(amp, amp.experimental)
    registerAgentStart(amp, primaryAgents)
  } else {
    amp.logger.log('CAROL plugin requires experimental API — agent modes not registered.')
  }
}
