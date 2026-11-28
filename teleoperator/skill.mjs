import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REFERENCE_FILES = [
  { src: 'CAROL.md', dst: 'CAROL.md', summary: 'CAROL protocol, Ground of Truth, DCF, gates, scope, and instruction hierarchy.' },
  { src: 'agents/teleoperator.md', dst: 'teleoperator.md', summary: 'TELEOPERATOR solo remote role, tool discipline, and local CLI boundary.' },
  { src: 'output-styles.md', dst: 'output-styles.md', summary: 'CAROL communication rules (terse chat, lossless documents) and ASD-STE100 standard.' },
  { src: 'MANIFESTO.md', dst: 'MANIFESTO.md', summary: 'BLESSED engineering principles.' },
  { src: 'CODING.md', dst: 'CODING.md', summary: 'Code contract and C++17/JUCE rules.' },
  { src: 'NAMES.md', dst: 'NAMES.md', summary: 'Naming contract and Rule -1 checks.' }
];

function buildSkillMarkdown() {
  const refLines = REFERENCE_FILES.map(
    (item) => `- \`references/${item.dst}\` - ${item.summary}`
  ).join('\n');

  return `---
name: teleoperator
description: Activate the CAROL protocol, TELEOPERATOR solo remote coder role, CAROL output style (terse chat, lossless documents, ASD-STE100), and BLESSED code contract. Trigger when ARCHITECT says "teleoperator rock n roll".
---

# TELEOPERATOR

Bundle of the CAROL protocol, the TELEOPERATOR solo remote coder role, the CAROL output style, and the BLESSED code contract for ARCHITECT web sessions connected via MCP.

## When to Use

- Trigger when ARCHITECT says \`teleoperator rock n roll\`.

## Reference Files

Load all six bundled reference files on activation:

${refLines}

## Activation Steps

1. Acknowledge with: \`TELEOPERATOR ready to Rock 'n Roll!\`
2. Read the bundled reference files and establish context immediately.
3. Read the active project's \`CLAUDE.md\` via \`saw_run\` to ground the workspace.
4. Enforce \`references/output-styles.md\` on every response: address the user as ARCHITECT, keep chat terse, keep deliverable documents lossless, and follow ASD-STE100.
5. Wait for ARCHITECT approval at execution gates.

## Gotchas

- Always dry-run \`saw_run\` edits before passing \`--apply --expect N\`.
- Never write comments or doxygen pre-audit.
- TELEOPERATOR has no shell tool: output exact \`cast\`, build, or \`git\` commands for ARCHITECT to run locally and wait for output.
- Cite verifiable evidence (\`file:line\`, doc quote, compiler output, benchmark) for all technical claims and challenges.
`;
}

export function exportSkillBundle(carolDir, stateDir) {
  const skillRoot = path.join(stateDir, 'skill');
  const bundleDir = path.join(skillRoot, 'teleoperator');
  const refsDir = path.join(bundleDir, 'references');
  const zipPath = path.join(skillRoot, 'teleoperator-skill.zip');

  fs.mkdirSync(refsDir, { recursive: true });
  fs.writeFileSync(path.join(bundleDir, 'SKILL.md'), buildSkillMarkdown(), 'utf8');

  const copied = [];
  for (const item of REFERENCE_FILES) {
    const srcPath = path.join(carolDir, item.src);
    const dstPath = path.join(refsDir, item.dst);
    fs.copyFileSync(srcPath, dstPath);
    copied.push(dstPath);
  }

  try {
    fs.unlinkSync(zipPath);
  } catch {}

  const zipRes = spawnSync('zip', ['-r', '-q', zipPath, 'teleoperator'], {
    cwd: skillRoot,
    encoding: 'utf8'
  });

  return {
    bundleDir,
    skillFile: path.join(bundleDir, 'SKILL.md'),
    refsDir,
    files: copied,
    zipPath: zipRes.status === 0 ? zipPath : null
  };
}
