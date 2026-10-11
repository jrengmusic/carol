import { expect, mock, test } from 'claude-code/testing'
import cases from './cases'

const ROOT = '/carol-root'
const ALLOWED_RESULT = 'ALLOWED'
const USER_ORIGIN_KIND = 'composer'
const ARMED_AT_MS = 1000
const ROLE_FILE = ROOT + '/.carol-role'

const definitions = new Map<string, string>([
  [ROOT + '/agents/pathfinder.md', '---\nname: Pathfinder\nmodel: haiku\n---\n'],
  [ROOT + '/agents/engineer.md', '---\nname: Engineer\nmodel: sonnet\n---\n'],
  [ROOT + '/agents/auditor.md', '---\nname: Auditor\nmodel: fable\n---\n'],
])

function getToolInput(testCase: any) {
  if (testCase.tool === 'Bash') {
    return { tool: 'Bash', command: testCase.command, ...(testCase.subagent ? { agentId: 'sub1' } : {}) }
  }
  if (testCase.tool === 'Agent') {
    return { tool: 'Agent', subagent_type: testCase.subagentType, ...(testCase.model ? { model: testCase.model } : {}) }
  }
  return { tool: testCase.tool, questions: [] }
}

for (const testCase of cases as any[]) {
  test(testCase.name, async ($, on) => {
    mock.clock(on, { now: ARMED_AT_MS })
    mock.env(on, { CAROL_ROOT: ROOT, ...(testCase.role ? { CAROL_ROLE: testCase.role } : {}) })
    const files = new Map(definitions)
    if (testCase.roleFile !== undefined) files.set(ROLE_FILE, testCase.roleFile)
    on('fs.exists', ($, e) => ({ value: files.has(e.path) }))
    on('fs.read', ($, e) => ({ value: files.get(e.path) }))
    on('classic.UserPromptSubmit', () => ({}))
    let lastContext: string[] | undefined
    on('prompt.submit', ($, e) => {
      lastContext = e.context
      return { text: e.text }
    })
    on('tool.call', ($, e) => testCase.toolOutcomes?.[e.tool] ?? { result: ALLOWED_RESULT })

    for (const prompt of testCase.prompts) {
      const text = typeof prompt === 'string' ? prompt : prompt.text
      const originKind = typeof prompt === 'string' ? USER_ORIGIN_KIND : prompt.origin
      lastContext = undefined
      await $.classic.UserPromptSubmit({ session_id: 't', hook_event_name: 'UserPromptSubmit', prompt: text, agent_type: testCase.agentType ?? '' })
      await $.prompt.submit({ text, wait: false, origin: { kind: originKind } })
    }

    for (const priorTool of testCase.priorTools ?? []) {
      await $.tool.call({ tool: priorTool, questions: [] })
    }

    const outcome: any = await $.tool.call(getToolInput(testCase))
    expect(outcome.deny === undefined ? 'allow' : 'deny').toBe(testCase.expect)
    if (testCase.contextLinesOnLastPrompt !== undefined) {
      expect((lastContext ?? []).length).toBe(testCase.contextLinesOnLastPrompt)
    }
  })
}
