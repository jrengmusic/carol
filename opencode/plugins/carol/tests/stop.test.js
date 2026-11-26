import { expect, test } from 'bun:test'
import { mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { makeCarol } from './harness.js'

const LOG_OFFSET_S = 10

const stopCases = [
  { name: 'armed, no sprint log: first Stop blocked', role: 'COUNSELOR', prompt: 'no gate', log: 'none', active: false, expect: 'block' },
  { name: 'armed, no sprint log: continuation Stop allowed', role: 'COUNSELOR', prompt: 'no gate', log: 'none', active: true, expect: 'allow' },
  { name: 'armed, sprint log newer: Stop allowed', role: 'COUNSELOR', prompt: 'no gate', log: 'newer', active: false, expect: 'allow' },
  { name: 'armed, sprint log older: Stop blocked', role: 'COUNSELOR', prompt: 'no gate', log: 'older', active: false, expect: 'block' },
  { name: 'armed, plain prompt follows, no sprint log: Stop blocked', role: 'COUNSELOR', prompt: 'no gate', laterPrompt: 'why', log: 'none', active: false, expect: 'block' },
  { name: 'armed, plain prompt follows, sprint log newer: Stop allowed', role: 'COUNSELOR', prompt: 'no gate', laterPrompt: 'why', log: 'newer', active: false, expect: 'allow' },
  { name: 'not armed: Stop allowed', role: 'COUNSELOR', prompt: 'hello', log: 'none', active: false, expect: 'allow' },
  { name: 'armed but MACHINIST: Stop allowed', role: 'MACHINIST', prompt: 'no gate', log: 'none', active: false, expect: 'allow' },
  { name: 'open end "not read yet": first Stop blocked', role: 'ORACLE', prompt: 'hello', log: 'none', active: false, message: 'The hook file is not read yet.', expect: 'block' },
  { name: 'open end "need to verify": first Stop blocked', role: 'MACHINIST', prompt: 'hello', log: 'none', active: false, message: 'I need to verify the path.', expect: 'block' },
  { name: 'open end: continuation Stop allowed', role: 'MACHINIST', prompt: 'hello', log: 'none', active: true, message: 'I need to verify the path.', expect: 'allow' },
  { name: 'open end "have not read": first Stop blocked', role: 'MACHINIST', prompt: 'hello', log: 'none', active: false, message: 'I have not read the type yet.', expect: 'block' },
  { name: 'open end "have not seen": first Stop blocked', role: 'MACHINIST', prompt: 'hello', log: 'none', active: false, message: 'I have not seen the result.', expect: 'block' },
  { name: 'open end "haven\'t checked": first Stop blocked', role: 'MACHINIST', prompt: 'hello', log: 'none', active: false, message: "I haven't checked the wiring.", expect: 'block' },
  { name: 'open end "unread": first Stop blocked', role: 'MACHINIST', prompt: 'hello', log: 'none', active: false, message: 'The file stays unread.', expect: 'block' },
  { name: 'open end "do not know": first Stop blocked', role: 'MACHINIST', prompt: 'hello', log: 'none', active: false, message: 'I do not know the cause.', expect: 'block' },
  { name: 'no open end: Stop allowed', role: 'ORACLE', prompt: 'hello', log: 'none', active: false, message: 'Done. register.js:105 reads the field.', expect: 'allow' },
]

function writeSprintLog(work, offsetS) {
  const sprintLog = path.join(work, 'carol', 'SPRINT-LOG.md')
  mkdirSync(path.dirname(sprintLog), { recursive: true })
  writeFileSync(sprintLog, '# log\n')
  const time = Date.now() / 1000 + offsetS
  utimesSync(sprintLog, time, time)
}

for (const stopCase of stopCases) {
  test(stopCase.name, async () => {
    const carol = await makeCarol({ rootAgent: stopCase.role.toLowerCase(), lastAssistantMessage: stopCase.message ?? '' })
    await carol.prompt(stopCase.prompt)
    if (stopCase.laterPrompt !== undefined) await carol.prompt(stopCase.laterPrompt)
    if (stopCase.log === 'newer') writeSprintLog(carol.work, LOG_OFFSET_S)
    if (stopCase.log === 'older') writeSprintLog(carol.work, -LOG_OFFSET_S)
    if (stopCase.active) {
      await carol.stop()
      expect(carol.synthetics.length).toBe(1)
    }
    const before = carol.synthetics.length
    await carol.stop()
    expect(carol.synthetics.length > before ? 'block' : 'allow').toBe(stopCase.expect)
    await carol.close()
  })
}

test('a user prompt resets the continuation', async () => {
  const carol = await makeCarol({ rootAgent: 'counselor' })
  await carol.prompt('no gate')
  await carol.stop()
  await carol.prompt('keep going')
  await carol.stop()
  expect(carol.synthetics.length).toBe(2)
  await carol.close()
})
