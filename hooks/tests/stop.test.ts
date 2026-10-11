import { expect, mock, test } from 'claude-code/testing'

const ROOT = '/carol-root'
const ARMED_AT_MS = 1000
const NEWER_MS = 2000
const OLDER_MS = 500

const stopCases = [
  { name: 'armed, no sprint log: first Stop blocked', role: 'COUNSELOR', prompt: 'no gate', hasLog: false, logMs: 0, active: false, expect: 'block' },
  { name: 'armed, no sprint log: continuation Stop allowed', role: 'COUNSELOR', prompt: 'no gate', hasLog: false, logMs: 0, active: true, expect: 'allow' },
  { name: 'armed, sprint log newer: Stop allowed', role: 'COUNSELOR', prompt: 'no gate', hasLog: true, logMs: NEWER_MS, active: false, expect: 'allow' },
  { name: 'armed, sprint log older: Stop blocked', role: 'COUNSELOR', prompt: 'no gate', hasLog: true, logMs: OLDER_MS, active: false, expect: 'block' },
  { name: 'armed, plain prompt follows, no sprint log: Stop blocked', role: 'COUNSELOR', prompt: 'no gate', laterPrompt: 'why', hasLog: false, logMs: 0, active: false, expect: 'block' },
  { name: 'armed, plain prompt follows, sprint log newer: Stop allowed', role: 'COUNSELOR', prompt: 'no gate', laterPrompt: 'why', hasLog: true, logMs: NEWER_MS, active: false, expect: 'allow' },
  { name: 'not armed: Stop allowed', role: 'COUNSELOR', prompt: 'hello', hasLog: false, logMs: 0, active: false, expect: 'allow' },
  { name: 'armed but MACHINIST: Stop allowed', role: 'MACHINIST', prompt: 'no gate', hasLog: false, logMs: 0, active: false, expect: 'allow' },
  { name: 'open end "not read yet": first Stop blocked', role: 'ORACLE', prompt: 'hello', hasLog: false, logMs: 0, active: false, message: 'The hook file is not read yet.', expect: 'block' },
  { name: 'open end "need to verify": first Stop blocked', role: 'MACHINIST', prompt: 'hello', hasLog: false, logMs: 0, active: false, message: 'I need to verify the path.', expect: 'block' },
  { name: 'open end: continuation Stop allowed', role: 'MACHINIST', prompt: 'hello', hasLog: false, logMs: 0, active: true, message: 'I need to verify the path.', expect: 'allow' },
  { name: 'open end "have not read": first Stop blocked', role: 'MACHINIST', prompt: 'hello', hasLog: false, logMs: 0, active: false, message: 'I have not read the type yet.', expect: 'block' },
  { name: 'open end "have not seen": first Stop blocked', role: 'MACHINIST', prompt: 'hello', hasLog: false, logMs: 0, active: false, message: 'I have not seen the result.', expect: 'block' },
  { name: 'open end "haven\'t checked": first Stop blocked', role: 'MACHINIST', prompt: 'hello', hasLog: false, logMs: 0, active: false, message: "I haven't checked the wiring.", expect: 'block' },
  { name: 'open end "unread": first Stop blocked', role: 'MACHINIST', prompt: 'hello', hasLog: false, logMs: 0, active: false, message: 'The file stays unread.', expect: 'block' },
  { name: 'open end "do not know": first Stop blocked', role: 'MACHINIST', prompt: 'hello', hasLog: false, logMs: 0, active: false, message: 'I do not know the cause.', expect: 'block' },
  { name: 'no open end: Stop allowed', role: 'ORACLE', prompt: 'hello', hasLog: false, logMs: 0, active: false, message: 'Done. register.js:105 reads the field.', expect: 'allow' },
]

for (const stopCase of stopCases) {
  test(stopCase.name, async ($, on) => {
    mock.clock(on, { now: ARMED_AT_MS })
    mock.env(on, { CAROL_ROOT: ROOT, CAROL_ROLE: stopCase.role })
    on('fs.exists', () => ({ value: stopCase.hasLog }))
    on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: stopCase.logMs, isLink: false } }))
    on('classic.UserPromptSubmit', () => ({}))
    on('prompt.submit', ($, e) => ({ text: e.text }))
    on('classic.Stop', () => ({}))

    await $.classic.UserPromptSubmit({ session_id: 't', hook_event_name: 'UserPromptSubmit', prompt: stopCase.prompt, agent_type: '' })
    await $.prompt.submit({ text: stopCase.prompt, wait: false, origin: { kind: 'composer' } })
    if (stopCase.laterPrompt !== undefined) {
      await $.classic.UserPromptSubmit({ session_id: 't', hook_event_name: 'UserPromptSubmit', prompt: stopCase.laterPrompt, agent_type: '' })
      await $.prompt.submit({ text: stopCase.laterPrompt, wait: false, origin: { kind: 'composer' } })
    }

    const outcome: any = await $.classic.Stop({ session_id: 't', hook_event_name: 'Stop', cwd: '/work', stop_hook_active: stopCase.active, last_assistant_message: stopCase.message ?? '' })
    expect(outcome.block === undefined ? 'allow' : 'block').toBe(stopCase.expect)
  })
}
