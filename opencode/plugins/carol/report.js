import { getExcerptBlocks, getReportDenial, isExcerptAgent, isSawExcerpt } from '../../../hooks/saw-gate.mjs'

const COMPLETED_STATUS = 'completed'
const EXCERPT_VERB = 'excerpt'

// tool -> the text that saw excerpt printed in a finished call, or ''.
const EXCERPT_TEXTS = {
  shell: (event) => (isSawExcerpt(String(event.input?.command ?? '')) ? (event.result?.output?.output ?? '') : ''),
  saw_run: (event) => (event.input?.arguments?.[0] === EXCERPT_VERB ? (event.result?.output?.output ?? '') : ''),
}

export function getLastAssistantText(messages) {
  const message = messages.findLast((candidate) => candidate.type === 'assistant')
  return (message?.content ?? []).filter((part) => part.type === 'text').map((part) => part.text).join('\n')
}

function getResult(result, report) {
  const previous = result.output.output
  const content = result.content.map((part) => (part.type === 'text' ? { ...part, text: part.text.replace(previous, () => report) } : part))
  return { ...result, output: { ...result.output, output: report }, content }
}

// Checks the report of an excerpt agent against the lines that saw printed in its session.
export function makeReports(session) {
  const receipts = new Map()

  function getDenial(sessionID, report) {
    return getReportDenial(report, (header) => receipts.get(sessionID)?.[header])
  }

  async function getReport(sessionID) {
    return getLastAssistantText(await session.context({ sessionID }))
  }

  return {
    async addReceipts(event) {
      const text = isExcerptAgent(event.agent ?? '') && event.status === COMPLETED_STATUS ? (EXCERPT_TEXTS[event.tool]?.(event) ?? '') : ''
      if (text !== '') receipts.set(event.sessionID, { ...receipts.get(event.sessionID), ...getExcerptBlocks(text) })
    },

    // The report goes back to the subagent once, before the parent reads it.
    async checkResult(event) {
      const { sessionID, status, output: report } = event.result?.output ?? {}
      const isChecked = isExcerptAgent(String(event.input?.agent ?? '')) && status === COMPLETED_STATUS
      const denial = isChecked ? getDenial(sessionID, report) : undefined
      if (denial === undefined) return
      await session.synthetic({ sessionID, text: denial })
      await session.wait({ sessionID })
      event.result = getResult(event.result, await getReport(sessionID))
    },
  }
}
