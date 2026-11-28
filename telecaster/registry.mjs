import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StdioMcpClient } from './stdio-client.mjs';
import { LOCAL_RUNNER_TOOLS, LocalRunner } from './local-runner.mjs';

const LING_MANIFEST = 'project-info.md';
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

function expandHome(value) {
  if (value === '~') {
    return os.homedir();
  }
  if (value.startsWith('~/')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

export class ToolRegistry {
  constructor(projectDir, carolDir) {
    this.projectDir = realpathOrAncestor(projectDir);
    this.carolDir = realpathOrAncestor(carolDir);
    this.clients = new Map();
    this.toolMap = new Map();
    this.tools = [];
    this.status = {};
    this.localRunner = new LocalRunner(this.carolDir, (dir) => this.resolveDir(dir));
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

  resolveDir(rawDir) {
    const target = rawDir ? expandHome(String(rawDir)) : this.projectDir;
    return realpathOrAncestor(target);
  }

  validateSawCall(args, readOnly = false) {
    const resolvedDir = this.resolveDir(args?.directory);
    const sawArgs = Array.isArray(args?.arguments) ? args.arguments.map(String) : [];
    const verb = sawArgs[0] || '';
    const isUndoMutate = verb === 'undo' && !sawArgs.includes('--list') && !sawArgs.includes('--dry-run');

    if (readOnly && (sawArgs.includes('--apply') || isUndoMutate)) {
      throw new Error('saw_read: mutating arguments are not allowed (use saw_run)');
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
