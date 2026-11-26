import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const PROVIDER_ID = 'anthropic'
const PI_ONLY_AGENT = 'janitor'
const MARKDOWN_EXTENSION = '.md'
const ARGUMENTS_PLACEHOLDER = '$ARGUMENTS'
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
const MODEL_ALIAS_PATTERN = /`ANTHROPIC_DEFAULT_([A-Z]+)_MODEL`\s*\|\s*`([^`]+)`/g
const ASK_SECTION_PATTERN = /^## ask\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/m
const TOOL_RULE_PATTERN = /`(\w+)\(([^)]*)\)`/g
const TOOL_ENTRY_PATTERN = /^(\w+)(?:\(([^)]*)\))?$/
const MCP_ENTRY_PATTERN = /^mcp__(\w+?)__(\*|\w+)$/
const TOOL_LIST_PATTERN = /[^,(]+(?:\([^)]*\))?/g
const SESSION_START_PATTERN = /\\"additionalContext\\":\\"(.*?)\\"/

const SUBAGENT_TOOLS = ['Agent', 'Task']
const TOOL_ACTIONS = {
  Read: ['read'],
  Write: ['edit'],
  Edit: ['edit'],
  Glob: ['glob'],
  Grep: ['grep'],
  Bash: ['shell'],
  WebFetch: ['webfetch'],
  WebSearch: ['websearch'],
  LSP: ['lsp'],
  AskUserQuestion: ['question'],
  TodoWrite: ['todowrite'],
  TaskCreate: ['todowrite'],
  TaskGet: ['todowrite'],
  TaskList: ['todowrite'],
  TaskUpdate: ['todowrite'],
}
const BASE_RULES = [
  { action: '*', resource: '*', effect: 'deny' },
  { action: 'skill', resource: '*', effect: 'allow' },
  { action: 'external_directory', resource: '*', effect: 'allow' },
]
const COLORS = {
  red: '#ff0000',
  blue: '#0000ff',
  green: '#008000',
  yellow: '#ffff00',
  purple: '#800080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  cyan: '#00ffff',
  gray: '#808080',
}

export function splitFrontmatter(text) {
  const match = text.match(FRONTMATTER_PATTERN)
  if (match === null) return { fields: {}, body: text }
  const fields = Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .filter((line) => line.includes(':'))
      .map((line) => [line.slice(0, line.indexOf(':')).trim(), line.slice(line.indexOf(':') + 1).trim()]),
  )
  return { fields, body: match[2] }
}

function readMarkdownFiles(directory) {
  return readdirSync(directory)
    .filter((file) => file.endsWith(MARKDOWN_EXTENSION))
    .map((file) => ({ name: path.basename(file, MARKDOWN_EXTENSION), ...splitFrontmatter(readFileSync(path.join(directory, file), 'utf8')) }))
}

function readModelAliases(root) {
  const text = readFileSync(path.join(root, 'cast', 'anthropic.md'), 'utf8')
  return Object.fromEntries([...text.matchAll(MODEL_ALIAS_PATTERN)].map((match) => [match[1].toLowerCase(), match[2]]))
}

function readAskRules(root) {
  const section = readFileSync(path.join(root, 'cast', 'common.md'), 'utf8').match(ASK_SECTION_PATTERN)?.[1] ?? ''
  return [...section.matchAll(TOOL_RULE_PATTERN)].flatMap((match) =>
    (TOOL_ACTIONS[match[1]] ?? []).map((action) => ({ action, resource: match[2], effect: 'ask' })),
  )
}

function splitToolList(value) {
  return (value?.match(TOOL_LIST_PATTERN) ?? []).map((entry) => entry.trim()).filter(Boolean)
}

function getToolRules(entry, effect) {
  const [, server, mcpTool] = entry.match(MCP_ENTRY_PATTERN) ?? []
  if (server !== undefined) return [{ action: server + '_' + mcpTool, resource: '*', effect }]
  const [, tool, targets] = entry.match(TOOL_ENTRY_PATTERN) ?? []
  if (SUBAGENT_TOOLS.includes(tool)) {
    const resources = targets === undefined ? ['*'] : targets.split(',').map((target) => target.trim().toLowerCase())
    return resources.map((resource) => ({ action: 'subagent', resource, effect }))
  }
  return (TOOL_ACTIONS[tool] ?? []).map((action) => ({ action, resource: '*', effect }))
}

function getPermissions(fields, askRules) {
  const allowed = splitToolList(fields.tools).flatMap((entry) => getToolRules(entry, 'allow'))
  const denied = splitToolList(fields.disallowedTools).flatMap((entry) => getToolRules(entry, 'deny'))
  const actions = new Set(allowed.map((rule) => rule.action))
  return [...BASE_RULES, ...allowed, ...denied, ...askRules.filter((rule) => actions.has(rule.action))]
}

function getModel(fields, aliases) {
  if (fields.model === undefined || fields.model === 'inherit') return undefined
  const id = aliases[fields.model] ?? fields.model
  return fields.effort === undefined ? { providerID: PROVIDER_ID, id } : { providerID: PROVIDER_ID, id, variant: fields.effort }
}

export function getModelReference(model) {
  if (model === undefined) return ''
  return model.providerID + '/' + model.id + (model.variant === undefined ? '' : '#' + model.variant)
}

export function readAgentDefinitions(root) {
  const aliases = readModelAliases(root)
  const askRules = readAskRules(root)
  return new Map(
    readMarkdownFiles(path.join(root, 'agents'))
      .filter(({ name }) => name !== PI_ONLY_AGENT)
      .map(({ name, fields, body }) => [
        name,
        {
          name: fields.name ?? name,
          description: fields.description,
          model: getModel(fields, aliases),
          color: COLORS[fields.color],
          system: body.trim(),
          permissions: getPermissions(fields, askRules),
        },
      ]),
  )
}

export function readOutputStyle(root) {
  return splitFrontmatter(readFileSync(path.join(root, 'output-styles.md'), 'utf8')).body.trim()
}

export function readSessionStart(root) {
  return readFileSync(path.join(root, 'cast', 'shapes.cast'), 'utf8').match(SESSION_START_PATTERN)?.[1]
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getTemplatePattern(template) {
  const pieces = template.split(ARGUMENTS_PLACEHOLDER).map(escapeRegExp)
  return new RegExp('^' + pieces.map((piece, index) => (index === 0 ? piece : (index === 1 ? '([\\s\\S]*?)' : '\\1') + piece)).join('') + '$')
}

function getArguments(template, text) {
  if (template.includes(ARGUMENTS_PLACEHOLDER)) return text.match(getTemplatePattern(template))?.[1]?.trim()
  if (text === template) return ''
  const rest = text.startsWith(template) ? text.slice(template.length) : undefined
  return rest !== undefined && /^\s/.test(rest) ? rest.trim() : undefined
}

export function getCommandLine(root, text) {
  const directory = path.join(root, 'commands')
  if (!existsSync(directory)) return undefined
  for (const { name, body } of readMarkdownFiles(directory)) {
    const args = getArguments(body.trim(), text)
    if (args !== undefined) return '/' + name + (args === '' ? '' : ' ' + args)
  }
  return undefined
}
