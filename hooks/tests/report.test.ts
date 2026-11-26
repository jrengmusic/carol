import { expect, mock, test } from 'claude-code/testing'
import reportCases, { OUTPUT } from './report-cases'

const ROOT = '/carol-root'
const AGENT_ID = 'sub1'

for (const reportCase of reportCases) {
  test('report: ' + reportCase.name, async ($, on) => {
    const type = reportCase.type ?? 'Pathfinder'
    mock.env(on, { CAROL_ROOT: ROOT })
    on('agent.list', () => ({ value: [{ id: AGENT_ID, type, description: '' }] }) as any)
    on('classic.SubagentStop', () => ({}))
    on('tool.call', ($, e: any) => ({ result: '', text: e.tool === 'Bash' ? OUTPUT : JSON.stringify({ exitCode: 0, output: OUTPUT, errors: '' }) }) as any)

    if (reportCase.isMcp) {
      await $.tool.call({ tool: 'mcp__saw__run', arguments: ['excerpt', '/x/CAROL.md:1-2'], directory: '/x', agentId: AGENT_ID } as any)
    } else {
      await $.tool.call({ tool: 'Bash', command: reportCase.command ?? 'saw excerpt /x/CAROL.md:1-2', agentId: AGENT_ID } as any)
    }

    const outcome: any = await $.classic.SubagentStop({ session_id: 't', hook_event_name: 'SubagentStop', agent_id: AGENT_ID, agent_type: type, stop_hook_active: reportCase.active ?? false, last_assistant_message: reportCase.report } as any)
    expect(outcome.block === undefined ? 'allow' : 'block').toBe(reportCase.expect)
  })
}
