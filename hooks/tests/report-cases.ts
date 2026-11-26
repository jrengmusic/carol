const HEADER = '## 1 /x/CAROL.md:1-2 of 9 sha256:0123456789abcdef'
const FENCED = 'BRIEF:\n```\n' + HEADER + '\n1\t# CAROL\n2\n```\nNeeds: none'

// The text that saw excerpt printed in the session of the subagent.
export const OUTPUT = '# 1 targets, 1 found, 0 missing\n' + HEADER + '\n1\t# CAROL\n2\t'

export default [
  { name: 'verbatim block passes', report: FENCED, expect: 'allow' },
  { name: 'changed line goes back', report: FENCED.replace('# CAROL', '# Carol'), expect: 'block' },
  { name: 'dropped line goes back', report: FENCED.replace('\n2\n', '\n'), expect: 'block' },
  { name: 'foreign header goes back', report: FENCED.replace('0123456789abcdef', 'ffffffffffffffff'), expect: 'block' },
  { name: 'citation without a block goes back', report: 'BRIEF: CAROL.md:1 starts with CAROL', expect: 'block' },
  { name: 'citation from a Read without a block goes back', report: 'BRIEF: CAROL.md:1 starts with CAROL', command: 'ls', expect: 'block' },
  { name: 'EVIDENCE with a compiler line passes', report: 'EVIDENCE:\n- Output: a.cpp:12: error', command: 'ls', expect: 'allow' },
  { name: 'second stop passes', report: 'BRIEF: CAROL.md:1', active: true, expect: 'allow' },
  { name: 'no citation passes', report: 'BRIEF: none', command: 'ls', expect: 'allow' },
  { name: 'another agent type passes', report: 'BRIEF: CAROL.md:1', type: 'Auditor', expect: 'allow' },
  { name: 'MCP excerpt, verbatim block passes', report: FENCED, isMcp: true, expect: 'allow' },
  { name: 'MCP excerpt, changed line goes back', report: FENCED.replace('# CAROL', '# Carol'), isMcp: true, expect: 'block' },
] as any[]
