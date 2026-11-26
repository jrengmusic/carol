import { expect, test } from 'bun:test'
import reportCases, { OUTPUT } from '../../../../hooks/tests/report-cases.ts'
import { CHILD_SESSION, makeCarol } from './harness.js'

const CORRECTED = 'corrected report'

// The outcome of the parent's subagent call, with the report of the child.
function getSubagentOutcome(agent, report, status) {
  const text = '<subagent sessionID="' + CHILD_SESSION + '" state="' + status + '">\n' + report + '\n</subagent>'
  return { status: 'completed', input: { agent }, result: { output: { sessionID: CHILD_SESSION, status, output: report }, content: [{ type: 'text', text }] } }
}

async function printExcerpt(carol, reportCase) {
  const input = reportCase.isMcp
    ? { arguments: ['excerpt', '/x/CAROL.md:1-2'], directory: '/x' }
    : { command: reportCase.command ?? 'saw excerpt /x/CAROL.md:1-2' }
  await carol.finishTool(reportCase.isMcp ? 'saw_run' : 'shell', { status: 'completed', input, result: { output: { output: OUTPUT } } }, { isSubagent: true })
}

for (const reportCase of reportCases) {
  const agent = (reportCase.type ?? 'Pathfinder').toLowerCase()

  test.skipIf(reportCase.active)('foreground report: ' + reportCase.name, async () => {
    const carol = await makeCarol({ childAgent: agent, lastAssistantMessage: CORRECTED })
    await printExcerpt(carol, reportCase)
    const result = await carol.finishTool('subagent', getSubagentOutcome(agent, reportCase.report, 'completed'))
    expect(carol.synthetics.length > 0 ? 'block' : 'allow').toBe(reportCase.expect)
    expect(result.output.output === CORRECTED && result.content[0].text.includes(CORRECTED)).toBe(reportCase.expect === 'block')
    await carol.close()
  })
}

test('a background Pathfinder call is denied, a background Engineer call is allowed', async () => {
  const carol = await makeCarol()
  expect(await carol.callTool('subagent', { agent: 'pathfinder', background: true })).toBe('deny')
  expect(await carol.callTool('subagent', { agent: 'engineer', background: true })).toBe('allow')
  await carol.close()
})
