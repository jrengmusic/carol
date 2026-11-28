import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REFERENCE_FILES = [
  { src: 'CAROL.md', dst: 'CAROL.md', summary: 'CAROL protocol, Ground of Truth, DCF, gates, scope, and instruction hierarchy.' },
  { src: 'agents/telecaster.md', dst: 'telecaster.md', summary: 'TELECASTER solo remote role, tool discipline, and shell boundary.' },
  { src: 'agents/engineer.md', dst: 'engineer.md', summary: 'ENGINEER implementation discipline: API-First, Fix Discipline, and Three-Case BLESSED Violation Protocol.' },
  { src: 'commands/audit.md', dst: 'audit.md', summary: 'Comprehensive sprint audit scope, clean sweep, and post-audit doxygen pass.' },
  { src: 'agents/auditor.md', dst: 'auditor.md', summary: 'AUDITOR QA/QC protocol: Finding Validity, Lean 300/30/3, Data Flow, Framework API, and Names.' },
  { src: 'skills/inventory-protocol/SKILL.md', dst: 'inventory-protocol.md', summary: 'Pre-plan and pre-audit five-layer Framework Inventory protocol.' },
  { src: 'skills/doxygen-protocol/SKILL.md', dst: 'doxygen-protocol.md', summary: 'Doxygen XML + ling AST symbol lookup order, index locations, and regeneration commands.' },
  { src: 'skills/doxygen-writer/SKILL.md', dst: 'doxygen-writer.md', summary: 'Post-audit C++ header doxygen rules, tags, mechanics, and zero-warnings gate.' },
  { src: 'skills/commit-writer/SKILL.md', dst: 'commit-writer.md', summary: 'Commit message format: one-line objective subject, bulleted rationale list, no file names, no AI attribution.' },
  { src: 'commands/log.md', dst: 'log.md', summary: 'Sprint logging protocol: commit message in chat, carol/SPRINT-LOG.md entry format, and DEBT.md hygiene drain.' },
  { src: 'commands/go.md', dst: 'go.md', summary: '/go execution discipline: always-on CONTRACT, Step Gate, and plan tracking.' },
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
name: telecaster
description: Activate the CAROL protocol, TELECASTER solo remote coder role, CAROL output style (terse chat, lossless documents, ASD-STE100), and BLESSED code contract. Trigger when ARCHITECT says "telecaster rock n roll".
---

# TELECASTER

Bundle of the CAROL protocol, the TELECASTER solo remote coder role, ENGINEER implementation discipline, AUDITOR and audit protocols, doxygen skills, the CAROL output style, and the BLESSED code contract for ARCHITECT web sessions connected via MCP.

## When to Use

- Trigger when ARCHITECT says \`telecaster rock n roll\`.

## Reference Files

Load all bundled reference files on activation:

${refLines}

## Activation Steps

1. Acknowledge with: \`TELECASTER ready to Rock 'n Roll!\`
2. Read the bundled reference files and establish context immediately.
3. Read the active project's \`CLAUDE.md\` via \`saw_read\` to ground the workspace.
4. Enforce \`references/output-styles.md\` on every response: address the user as ARCHITECT, keep chat terse, keep deliverable documents lossless, and follow ASD-STE100.
5. Wait for ARCHITECT approval at execution gates.

## Gotchas

- Always dry-run \`saw_run\` edits before passing \`--apply --expect N\`.
- Never write comments or doxygen pre-audit; run the doxygen pass only post-audit per \`references/doxygen-writer.md\`.
- Run solo implementation per \`references/engineer.md\` and solo audits per \`references/audit.md\`, \`references/auditor.md\`, and \`references/inventory-protocol.md\`.
- Use \`bash_run\` for local CLI commands (deps, \`cast\`, builds, tests); \`saw-gate.mjs\` blocks shell file tools, and \`CAROL.md\` Git/Build rules still govern.
- Cite verifiable evidence (\`file:line\`, doc quote, compiler output, benchmark) for all technical claims and challenges.
`;
}

export function exportSkillBundle(carolDir, stateDir) {
  const skillRoot = path.join(stateDir, 'skill');
  const bundleDir = path.join(skillRoot, 'telecaster');
  const refsDir = path.join(bundleDir, 'references');
  const zipPath = path.join(skillRoot, 'telecaster-skill.zip');

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

  const zipRes = spawnSync('zip', ['-r', '-q', zipPath, 'telecaster'], {
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
