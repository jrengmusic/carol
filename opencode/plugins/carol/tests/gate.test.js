import { expect, test } from 'bun:test'
import cases from '../../../../hooks/tests/cases.ts'
import { makeCarol } from './harness.js'

const MODEL_REFERENCES = {
  haiku: 'anthropic/claude-haiku-5-5',
  sonnet: 'anthropic/claude-sonnet-5-5',
  opus: 'anthropic/claude-opus-5-5',
}
const CONTRACT_GATED_TOOL = 'AskUserQuestion'
const QUESTION_TOOLS = [CONTRACT_GATED_TOOL, 'EnterPlanMode', 'ExitPlanMode']
const USER_ORIGIN_KIND = 'composer'
const CONTEXT_SEPARATOR = '\n\n'
const NO_COUNTERPART_TOOLS = ['Monitor']
const CASE_ROOT = '/carol-root'
const CONTRACT = ['/h/.carol/MANIFESTO.md', '/h/.carol/CODING.md', '/h/.carol/NAMES.md']
const RULINGS = {
  'agent missing model denied': 'allow',
}

function getAnswers(result) {
  if (typeof result !== 'object' || result === null) return []
  return [...Object.values(result.answers ?? {}).map((answer) => [answer]), ...(result.response === undefined ? [] : [[result.response]])]
}

function getOutcome(outcome) {
  if (outcome?.isError === true) return { status: 'error', error: { message: outcome.text ?? '' } }
  return { status: 'completed', result: { output: { answers: getAnswers(outcome?.result) } } }
}

async function readFiles(carol, reads, outcome) {
  for (const read of reads) {
    const { file_path: filePath, ...range } = typeof read === 'string' ? { file_path: read } : read
    await carol.finishTool('read', { input: { path: filePath, ...range }, status: outcome?.isError === true ? 'error' : 'completed' })
  }
}

const CALLS = {
  Bash: ({ command, background, subagent }) => ['shell', { command, ...(background ? { background: true } : {}) }, { isSubagent: subagent === true }],
  Agent: ({ subagentType, model }) => ['subagent', { agent: subagentType.toLowerCase(), ...(model ? { model: MODEL_REFERENCES[model] } : {}) }],
  Write: ({ filePath, subagent }, carol) => ['write', { path: filePath.replace(CASE_ROOT, carol.root), content: '' }, { isSubagent: subagent === true }],
  mcp__saw__run: ({ arguments: args, subagent }) => ['saw_run', { arguments: args, directory: CASE_ROOT }, { isSubagent: subagent === true }],
}

async function callTool(carol, testCase) {
  const getCall = CALLS[testCase.tool] ?? (() => ['question', { questions: [] }])
  return carol.callTool(...getCall(testCase, carol))
}

// The plan tools have no contract gate. OpenCode has only the question tool for them.
async function readContractForPlanTool(carol, tool) {
  if (tool !== CONTRACT_GATED_TOOL && QUESTION_TOOLS.includes(tool)) await readFiles(carol, CONTRACT)
}

async function sendPrompts(carol, prompts) {
  let lastText
  for (const prompt of prompts) {
    const isUserPrompt = typeof prompt === 'string' || prompt.origin === USER_ORIGIN_KIND
    if (isUserPrompt) lastText = await carol.prompt(typeof prompt === 'string' ? prompt : prompt.text)
  }
  return lastText
}

for (const testCase of cases.filter((candidate) => !NO_COUNTERPART_TOOLS.includes(candidate.tool))) {
  test(testCase.name, async () => {
    const rootAgent = (testCase.role ?? testCase.roleFile ?? testCase.agentType ?? '').toLowerCase() || undefined
    const carol = await makeCarol({ rootAgent, childAgent: (testCase.subagentType ?? 'Engineer').toLowerCase(), childTitle: testCase.subagentDescription })
    const lastText = await sendPrompts(carol, testCase.prompts)
    await readFiles(carol, testCase.reads ?? [], testCase.toolOutcomes?.Read)
    await sendPrompts(carol, testCase.promptsAfterReads ?? [])
    for (const priorTool of testCase.priorTools ?? []) {
      expect(QUESTION_TOOLS).toContain(priorTool)
      await carol.callTool('question', { questions: [] })
      await carol.finishTool('question', getOutcome(testCase.toolOutcomes?.[priorTool]))
      await readContractForPlanTool(carol, priorTool)
    }
    await readContractForPlanTool(carol, testCase.tool)
    expect(await callTool(carol, testCase)).toBe(RULINGS[testCase.name] ?? testCase.expect)
    if (testCase.expectCommand !== undefined) expect(carol.lastInput.command).toBe(testCase.expectCommand)
    if (testCase.expectCommandStart !== undefined) expect(carol.lastInput.command).toStartWith(testCase.expectCommandStart)
    if (testCase.contextLinesOnLastPrompt !== undefined) {
      expect(lastText.split(CONTEXT_SEPARATOR).length - 1).toBe(testCase.contextLinesOnLastPrompt)
    }
    await carol.close()
  })
}

test('no session has an edit, patch, grep and write tool, a subagent has no question tool', async () => {
  const carol = await makeCarol()
  expect(await carol.getTools({ isSubagent: true })).toEqual(['read'])
  expect(await carol.getTools()).toEqual(['question', 'read'])
  await carol.close()
})

for (const tool of ['edit', 'patch', 'grep', 'write']) {
  test('subagent and main session ' + tool + ' denied', async () => {
    const carol = await makeCarol()
    expect(await carol.callTool(tool, {}, { isSubagent: true })).toBe('deny')
    expect(await carol.callTool(tool, {})).toBe('deny')
    await carol.close()
  })
}
test('subagent model with a variant other than the definition denied', async () => {
  const carol = await makeCarol()
  expect(await carol.callTool('subagent', { agent: 'pathfinder', model: 'anthropic/claude-haiku-5-5#low' })).toBe('deny')
  await carol.close()
})

test('OpenCode config model overrides the frontmatter model in the gate', async () => {
  const carol = await makeCarol({ configModels: { pathfinder: { providerID: 'openai', id: 'gpt-6.1-sol', variant: 'low' } } })
  expect(await carol.callTool('subagent', { agent: 'pathfinder', model: 'openai/gpt-6.1-sol#low' })).toBe('allow')
  expect(await carol.callTool('subagent', { agent: 'pathfinder', model: MODEL_REFERENCES.haiku })).toBe('deny')
  expect(await carol.callTool('subagent', { agent: 'pathfinder' })).toBe('allow')
  await carol.close()
})

test('slash command body naming commit does not instruct git', async () => {
  const carol = await makeCarol()
  const { readFileSync } = await import('node:fs')
  const { splitFrontmatter } = await import('../source.js')
  const body = splitFrontmatter(readFileSync(new URL('../../../../commands/log.md', import.meta.url), 'utf8')).body.trim()
  await carol.prompt(body)
  expect(await carol.callTool('shell', { command: 'git commit -m x' })).toBe('deny')
  await carol.close()
})

test('slash command with arguments naming commit instructs git', async () => {
  const carol = await makeCarol()
  const { readFileSync } = await import('node:fs')
  const { splitFrontmatter } = await import('../source.js')
  const template = splitFrontmatter(readFileSync(new URL('../../../../commands/rfc.md', import.meta.url), 'utf8')).body.trim()
  await carol.prompt(template.replaceAll('$ARGUMENTS', 'commit flow'))
  expect(await carol.callTool('shell', { command: 'git commit -m x' })).toBe('allow')
  await carol.close()
})

test('first prompt puts the output style and session start entries', async () => {
  const carol = await makeCarol()
  await carol.prompt('hello')
  await carol.prompt('again')
  expect(carol.entries.map((entry) => entry.key).sort()).toEqual(['carol.output-style', 'carol.session-start'])
  expect(carol.entries.find((entry) => entry.key === 'carol.session-start').value).toStartWith('CAROL PROTOCOL ACTIVE')
  await carol.close()
})
