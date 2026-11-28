import { spawn } from 'node:child_process';

const PROTOCOL_VERSION = '2026-07-28';
const MCP_META = {
  'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION,
  'io.modelcontextprotocol/clientCapabilities': {}
};
const DEFAULT_TIMEOUT_MS = 120000;
const INIT_TIMEOUT_MS = 15000;

export class StdioMcpClient {
  constructor(name, command, args = [], cwd = process.cwd()) {
    this.name = name;
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.child = null;
    this.nextId = 1;
    this.buffer = '';
    this.pending = new Map();
    this.closed = false;
  }

  async start() {
    this.child = spawn(this.command, this.args, {
      cwd: this.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk) => this.handleData(chunk));
    this.child.stderr.on('data', () => {});
    this.child.on('error', (err) => this.rejectAll(err));
    this.child.on('exit', (code, signal) => {
      this.closed = true;
      this.rejectAll(new Error(`${this.name} exited (code=${code}, signal=${signal})`));
    });

    await this.request('server/discover', {}, INIT_TIMEOUT_MS);
  }

  handleData(chunk) {
    this.buffer += chunk;
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const raw = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (raw.length > 0) {
        this.handleMessage(raw);
      }
      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.id === undefined || !this.pending.has(msg.id)) {
      return;
    }
    const entry = this.pending.get(msg.id);
    this.pending.delete(msg.id);
    clearTimeout(entry.timer);
    if (msg.error) {
      entry.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
    } else {
      entry.resolve(msg.result);
    }
  }

  notify(method, params) {
    if (this.closed || !this.child || !this.child.stdin.writable) {
      return;
    }
    const payload = JSON.stringify({ jsonrpc: '2.0', method, params });
    this.child.stdin.write(`${payload}\n`);
  }

  request(method, params, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      if (this.closed || !this.child || !this.child.stdin.writable) {
        reject(new Error(`${this.name} is not running`));
        return;
      }
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${this.name} ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params: { _meta: MCP_META, ...params } });
      this.child.stdin.write(`${payload}\n`);
    });
  }

  async listTools() {
    const result = await this.request('tools/list', {});
    return Array.isArray(result?.tools) ? result.tools : [];
  }

  async callTool(name, args = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const result = await this.request('tools/call', { name, arguments: args }, timeoutMs);
    return normalizeToolResult(result);
  }

  rejectAll(err) {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(err);
    }
    this.pending.clear();
  }

  close() {
    this.closed = true;
    this.rejectAll(new Error(`${this.name} closed`));
    if (this.child) {
      try {
        this.child.stdin.end();
      } catch {}
      try {
        this.child.kill('SIGTERM');
      } catch {}
      this.child = null;
    }
  }
}

function normalizeToolResult(result) {
  const content = Array.isArray(result?.content) ? result.content : [];
  const structured = result?.structuredContent;
  const isError = Boolean(result?.isError);
  if (content.length > 0) {
    return structured !== undefined
      ? { content, structuredContent: structured, isError }
      : { content, isError };
  }
  if (structured !== undefined) {
    return {
      content: [{ type: 'text', text: JSON.stringify(structured) }],
      structuredContent: structured,
      isError
    };
  }
  return { content: [{ type: 'text', text: '' }], isError };
}
