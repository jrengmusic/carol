import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StdioMcpClient } from './stdio-client.mjs';
import { LOCAL_RUNNER_TOOLS, LocalRunner } from './local-runner.mjs';

const LING_MANIFEST = 'project-info.md';
const MUTATING_VERBS = new Set(['write', 'replace', 'lines', 'patch', 'undo']);
const AUTO_APPROVE_ANNOTATIONS = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

function realpathOrAncestor(targetPath) {
  let current = path.resolve(targetPath);
  const tail = [];
  while (true) {
    try {
      const resolved = fs.realpathSync(current);
      return tail.length > 0 ? path.join(resolved, ...tail.reverse()) : resolved;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return path.resolve(targetPath);
      }
      tail.push(path.basename(current));
      current = parent;
    }
  }
}

function isInsideRoot(target, root) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function expandHome(value) {
  if (value === '~') {
    return os.homedir();
  }
  if (value.startsWith('~/')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function extractCandidatePaths(args, baseDir) {
  const candidates = [];
  if (!Array.isArray(args)) {
    return candidates;
  }
  const verb = args[0] || '';
  for (let i = 1; i < args.length; i++) {
    const token = String(args[i] ?? '');
    if (token.startsWith('-')) {
      continue;
    }
    if (verb === 'excerpt') {
      const tildeSplit = token.split(' ~ ')[0].trim();
      const rangeStripped = tildeSplit.replace(/:\d+(?:-\d+)?$/, '');
      if (rangeStripped.length > 0) {
        candidates.push(path.resolve(baseDir, expandHome(rangeStripped)));
      }
      continue;
    }
    if (token.includes('/') || token.startsWith('.') || token.startsWith('~')) {
      candidates.push(path.resolve(baseDir, expandHome(token)));
    }
  }
  return candidates;
}

function inAnyRoot(target, roots) {
  return roots.some((root) => isInsideRoot(target, root));
}

function defaultDevDir() {
  return path.join(os.homedir(), 'Documents', 'Poems', 'dev');
}

function defaultJamDir() {
  return path.join(defaultDevDir(), 'jam');
}

export class ToolRegistry {
  constructor(projectDir, carolDir, { readWriteRoots = [], readOnlyRoots = [] } = {}) {
    this.projectDir = realpathOrAncestor(projectDir);
    this.carolDir = realpathOrAncestor(carolDir);
    const rwSet = new Set([this.projectDir]);
    const jamDir = defaultJamDir();
    if (fs.existsSync(jamDir)) {
      rwSet.add(realpathOrAncestor(jamDir));
    }
    for (const dir of readWriteRoots) {
      if (fs.existsSync(dir)) {
        rwSet.add(realpathOrAncestor(dir));
      }
    }
    this.rwRoots = [...rwSet];
    const roSet = new Set();
    for (const dir of [this.carolDir, defaultDevDir(), ...readOnlyRoots]) {
      const real = realpathOrAncestor(dir);
      if (!rwSet.has(real) && fs.existsSync(real)) {
        roSet.add(real);
      }
    }
    this.roRoots = [...roSet];
    this.clients = new Map();
    this.toolMap = new Map();
    this.tools = [];
    this.status = {};
    this.localRunner = new LocalRunner(this.carolDir, (dir) => this.resolveRwDir(dir));
  }

  async start() {
    const manifestPath = path.join(this.projectDir, LING_MANIFEST);
    const specs = [
      { name: 'saw', command: 'saw', args: ['--mcp'], required: true },
      { name: 'whatdbg', command: 'whatdbg', args: ['--mcp'], required: true },
      { name: 'scout', command: 'scout', args: ['--mcp'], required: true },
      {
        name: 'ling',
        command: 'ling',
        args: ['--mcp', manifestPath],
        required: false,
        enabled: fs.existsSync(manifestPath),
        skipReason: `no ${LING_MANIFEST} in project`
      }
    ];

    for (const spec of specs) {
      if (spec.enabled === false) {
        this.status[spec.name] = { active: false, tools: 0, reason: spec.skipReason };
        continue;
      }
      await this.startUpstream(spec);
    }
    for (const tool of LOCAL_RUNNER_TOOLS) {
      this.toolMap.set(tool.name, { server: 'local', toolName: tool.name, local: true });
      this.tools.push({ ...tool, annotations: { ...tool.annotations, ...AUTO_APPROVE_ANNOTATIONS } });
    }
    this.status.local = { active: true, tools: LOCAL_RUNNER_TOOLS.length };
  }

  async startUpstream(spec) {
    const client = new StdioMcpClient(spec.name, spec.command, spec.args, this.projectDir);
    try {
      await client.start();
      const upstreamTools = await client.listTools();
      this.clients.set(spec.name, client);
      let registeredCount = 0;
      for (const tool of upstreamTools) {
        const publicName = `${spec.name}_${tool.name}`;
        this.toolMap.set(publicName, { server: spec.name, toolName: tool.name, client });
        this.tools.push({
          ...tool,
          name: publicName,
          annotations: { ...tool.annotations, ...AUTO_APPROVE_ANNOTATIONS }
        });
        registeredCount++;
        if (spec.name === 'saw' && tool.name === 'run') {
          this.toolMap.set('saw_read', { server: spec.name, toolName: tool.name, client, readOnly: true });
          this.tools.push({
            ...tool,
            name: 'saw_read',
            description: 'Read-only saw command (find, page, excerpt, lines read, fields, json, or dry-run previews). Rejects --apply and mutating undo.',
            annotations: AUTO_APPROVE_ANNOTATIONS
          });
          registeredCount++;
        }
      }
      this.status[spec.name] = { active: true, tools: registeredCount };
    } catch (err) {
      client.close();
      this.status[spec.name] = { active: false, tools: 0, reason: err.message };
      if (spec.required) {
        throw new Error(`Failed to start ${spec.name} --mcp: ${err.message}`);
      }
    }
  }

  listTools() {
    return this.tools;
  }

  resolveRwDir(rawDir) {
    const target = rawDir ? expandHome(String(rawDir)) : this.projectDir;
    const resolved = realpathOrAncestor(target);
    if (!inAnyRoot(resolved, this.rwRoots)) {
      throw new Error(`directory outside allowed read-write roots: ${target}`);
    }
    return resolved;
  }

  validateSawCall(args, readOnly = false) {
    const label = readOnly ? 'saw_read' : 'saw_run';
    const rawDir = args?.directory ? expandHome(String(args.directory)) : this.projectDir;
    const resolvedDir = realpathOrAncestor(rawDir);
    const inRw = inAnyRoot(resolvedDir, this.rwRoots);
    const inRo = inAnyRoot(resolvedDir, this.roRoots);
    if (!inRw && !inRo) {
      throw new Error(`${label}: directory outside allowed roots: ${rawDir}`);
    }

    const sawArgs = Array.isArray(args?.arguments) ? args.arguments.map(String) : [];
    const verb = sawArgs[0] || '';
    const isUndoMutate = verb === 'undo' && !sawArgs.includes('--list') && !sawArgs.includes('--dry-run');
    const isApply = (sawArgs.includes('--apply') && MUTATING_VERBS.has(verb)) || isUndoMutate;

    if (readOnly && (sawArgs.includes('--apply') || isUndoMutate)) {
      throw new Error('saw_read: mutating arguments are not allowed (use saw_run)');
    }

    if (isApply && !inRw) {
      throw new Error(`${label}: write blocked in read-only root: ${rawDir}`);
    }

    const candidates = extractCandidatePaths(sawArgs, resolvedDir);
    if (verb === 'patch' && typeof args?.stdin === 'string') {
      try {
        const entries = JSON.parse(args.stdin);
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            if (entry && typeof entry.file === 'string') {
              candidates.push(path.resolve(resolvedDir, expandHome(entry.file)));
            }
          }
        }
      } catch {}
    }

    for (const candidate of candidates) {
      const realTarget = realpathOrAncestor(candidate);
      const targetInRw = inAnyRoot(realTarget, this.rwRoots);
      const targetInRo = inAnyRoot(realTarget, this.roRoots);
      if (!targetInRw && !targetInRo) {
        throw new Error(`${label}: path outside allowed roots: ${candidate}`);
      }
      if (isApply && !targetInRw) {
        throw new Error(`${label}: write blocked in read-only root: ${candidate}`);
      }
    }

    return { ...args, directory: resolvedDir };
  }

  async callTool(publicName, rawArgs = {}) {
    const entry = this.toolMap.get(publicName);
    if (!entry) {
      throw new Error(`Unknown tool: ${publicName}`);
    }
    if (entry.local) {
      return this.localRunner.callTool(entry.toolName, rawArgs);
    }
    const callArgs = (publicName === 'saw_run' || publicName === 'saw_read')
      ? this.validateSawCall(rawArgs, Boolean(entry.readOnly))
      : rawArgs;
    return entry.client.callTool(entry.toolName, callArgs);
  }

  closeAll() {
    this.localRunner.closeAll();
    for (const client of this.clients.values()) {
      client.close();
    }
    this.clients.clear();
  }
}
