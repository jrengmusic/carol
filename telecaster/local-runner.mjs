import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const LLAMA_HOST = '127.0.0.1';
const LLAMA_PORT = 9931;
const LLAMA_URL = `http://${LLAMA_HOST}:${LLAMA_PORT}`;
const LLAMA_MODELS_MAX = '1';
const LLAMA_READY_ATTEMPTS = 50;
const LLAMA_READY_INTERVAL_MS = 200;
const HEALTH_TIMEOUT_MS = 2000;
const DEFAULT_JOB_TIMEOUT_MS = 300000;
const MAX_OUTPUT_BYTES = 262144;
const DEFAULT_TAIL_CHARS = 16000;

function appendCapped(current, chunk) {
  const combined = current + chunk;
  if (combined.length <= MAX_OUTPUT_BYTES) {
    return combined;
  }
  return combined.slice(combined.length - MAX_OUTPUT_BYTES);
}

async function fetchJsonWithTimeout(url, timeoutMs = HEALTH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { ok: res.ok, status: res.status, json, text };
  } catch {
    return { ok: false, status: 0, json: null, text: '' };
  } finally {
    clearTimeout(timer);
  }
}

export const LOCAL_RUNNER_TOOLS = [
  {
    name: 'llama_status',
    description: 'Check local llama.cpp server health and loaded models on 127.0.0.1:9931.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'llama_start',
    description: 'Start the single warm llama.cpp server using ~/.carol/local/models-preset.ini if not already running.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'llama_stop',
    description: 'Stop the llama.cpp server if started by telecaster.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'housekeeper_start',
    description: 'Start one async housekeeper run in an allowed read-write root. Returns jobId immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Working directory (defaults to active project; must be an allowed RW root).' },
        args: { type: 'array', items: { type: 'string' }, description: 'CLI arguments passed to housekeeper (e.g. ["-p", "prompt"]).' },
        model: { type: 'string', description: 'Optional CAROL_PI_MODEL override (e.g. "llama.cpp/Qwen3.5-4B-Q4_K_M").' },
        timeoutMs: { type: 'number', description: 'Optional timeout in milliseconds (default 300000).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'housekeeper_status',
    description: 'Check status and output tail of a housekeeper job (defaults to latest job).',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID returned by housekeeper_start.' },
        tailChars: { type: 'number', description: 'Max trailing characters per stream (default 16000).' }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'housekeeper_stop',
    description: 'Terminate the currently running housekeeper job.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Optional job ID to stop (defaults to active job).' }
      },
      additionalProperties: false
    }
  }
];

export class LocalRunner {
  constructor(carolDir, resolveRwDir) {
    this.carolDir = carolDir;
    this.resolveRwDir = resolveRwDir;
    this.llamaProc = null;
    this.llamaStderr = '';
    this.jobs = new Map();
    this.activeJobId = null;
    this.latestJobId = null;
  }

  async callTool(name, args = {}) {
    switch (name) {
      case 'llama_status':
        return this.wrapJson(await this.llamaStatus());
      case 'llama_start':
        return this.wrapJson(await this.llamaStart());
      case 'llama_stop':
        return this.wrapJson(this.llamaStop());
      case 'housekeeper_start':
        return this.wrapJson(this.housekeeperStart(args));
      case 'housekeeper_status':
        return this.wrapJson(this.housekeeperStatus(args));
      case 'housekeeper_stop':
        return this.wrapJson(this.housekeeperStop(args));
      default:
        throw new Error(`Unknown local runner tool: ${name}`);
    }
  }

  wrapJson(payload) {
    return {
      content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
      isError: false
    };
  }

  async llamaStatus() {
    const health = await fetchJsonWithTimeout(`${LLAMA_URL}/health`);
    const models = health.ok ? await fetchJsonWithTimeout(`${LLAMA_URL}/v1/models`) : null;
    return {
      running: health.ok,
      url: LLAMA_URL,
      ownedByTelecaster: Boolean(this.llamaProc && !this.llamaProc.killed),
      pid: this.llamaProc?.pid || null,
      health: health.json || health.text || null,
      models: models?.json?.data?.map((m) => m.id) || []
    };
  }

  async llamaStart() {
    const current = await this.llamaStatus();
    if (current.running) {
      return { status: 'already_running', url: LLAMA_URL, models: current.models };
    }

    const modelsDir = path.join(this.carolDir, 'local', 'models');
    const presetFile = path.join(this.carolDir, 'local', 'models-preset.ini');
    if (!fs.existsSync(modelsDir) || !fs.existsSync(presetFile)) {
      throw new Error(`Missing llama config: expected ${modelsDir} and ${presetFile}`);
    }

    this.llamaStderr = '';
    const proc = spawn(
      'llama',
      [
        'serve',
        '--models-dir', modelsDir,
        '--models-preset', presetFile,
        '--models-max', LLAMA_MODELS_MAX,
        '--host', LLAMA_HOST,
        '--port', String(LLAMA_PORT)
      ],
      { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }
    );
    this.llamaProc = proc;
    proc.stderr.on('data', (d) => {
      this.llamaStderr = appendCapped(this.llamaStderr, d.toString('utf8'));
    });
    proc.on('exit', () => {
      if (this.llamaProc === proc) {
        this.llamaProc = null;
      }
    });

    for (let i = 0; i < LLAMA_READY_ATTEMPTS; i++) {
      const check = await fetchJsonWithTimeout(`${LLAMA_URL}/health`, 1000);
      if (check.ok) {
        return { status: 'started', url: LLAMA_URL, pid: proc.pid };
      }
      if (!this.llamaProc) {
        throw new Error(`llama serve exited early: ${this.llamaStderr.trim()}`);
      }
      await new Promise((r) => setTimeout(r, LLAMA_READY_INTERVAL_MS));
    }

    throw new Error(`llama serve did not become healthy on ${LLAMA_URL}`);
  }

  llamaStop() {
    if (!this.llamaProc) {
      return { stopped: false, reason: 'No llama server owned by telecaster' };
    }
    const pid = this.llamaProc.pid;
    try {
      this.llamaProc.kill('SIGTERM');
    } catch {}
    this.llamaProc = null;
    return { stopped: true, pid };
  }

  housekeeperStart(args) {
    if (this.activeJobId) {
      const active = this.jobs.get(this.activeJobId);
      if (active && active.status === 'running') {
        throw new Error(`A housekeeper job is already running (${this.activeJobId}). Stop or wait for it first.`);
      }
    }

    const cwd = this.resolveRwDir(args?.directory);
    const cliArgs = Array.isArray(args?.args) ? args.args.map(String) : [];
    const timeoutMs = Number(args?.timeoutMs) > 0 ? Number(args.timeoutMs) : DEFAULT_JOB_TIMEOUT_MS;
    const env = { ...process.env };
    if (args?.model) {
      env.CAROL_PI_MODEL = String(args.model);
    }

    const jobId = `hk_${crypto.randomBytes(6).toString('hex')}`;
    const child = spawn('housekeeper', cliArgs, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    const job = {
      jobId,
      cwd,
      args: cliArgs,
      status: 'running',
      exitCode: null,
      signal: null,
      startedAt: Date.now(),
      finishedAt: null,
      stdout: '',
      stderr: '',
      child,
      timer: null
    };

    job.timer = setTimeout(() => {
      if (job.status === 'running') {
        job.status = 'timeout';
        try {
          child.kill('SIGTERM');
        } catch {}
      }
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      job.stdout = appendCapped(job.stdout, d.toString('utf8'));
    });
    child.stderr.on('data', (d) => {
      job.stderr = appendCapped(job.stderr, d.toString('utf8'));
    });
    child.on('error', (err) => {
      clearTimeout(job.timer);
      job.status = 'error';
      job.stderr = appendCapped(job.stderr, `\n${err.message}`);
      job.finishedAt = Date.now();
      if (this.activeJobId === jobId) this.activeJobId = null;
    });
    child.on('close', (code, signal) => {
      clearTimeout(job.timer);
      job.exitCode = code;
      job.signal = signal;
      job.finishedAt = Date.now();
      if (job.status === 'running') {
        job.status = code === 0 ? 'done' : 'failed';
      }
      if (this.activeJobId === jobId) this.activeJobId = null;
    });

    this.jobs.set(jobId, job);
    this.activeJobId = jobId;
    this.latestJobId = jobId;

    return {
      jobId,
      status: job.status,
      cwd,
      args: cliArgs,
      startedAt: new Date(job.startedAt).toISOString()
    };
  }

  housekeeperStatus(args) {
    const id = args?.jobId || this.latestJobId;
    if (!id || !this.jobs.has(id)) {
      return { status: 'none', message: 'No housekeeper job found' };
    }
    const job = this.jobs.get(id);
    const tail = Number(args?.tailChars) > 0 ? Number(args.tailChars) : DEFAULT_TAIL_CHARS;
    const end = job.finishedAt || Date.now();
    return {
      jobId: job.jobId,
      status: job.status,
      exitCode: job.exitCode,
      signal: job.signal,
      elapsedMs: end - job.startedAt,
      cwd: job.cwd,
      stdout: job.stdout.slice(-tail),
      stderr: job.stderr.slice(-tail)
    };
  }

  housekeeperStop(args) {
    const id = args?.jobId || this.activeJobId;
    if (!id || !this.jobs.has(id)) {
      return { stopped: false, reason: 'No active housekeeper job' };
    }
    const job = this.jobs.get(id);
    if (job.status !== 'running') {
      return { stopped: false, jobId: id, status: job.status };
    }
    job.status = 'stopped';
    clearTimeout(job.timer);
    try {
      job.child.kill('SIGTERM');
    } catch {}
    if (this.activeJobId === id) this.activeJobId = null;
    return { stopped: true, jobId: id };
  }

  closeAll() {
    for (const job of this.jobs.values()) {
      if (job.status === 'running') {
        clearTimeout(job.timer);
        try {
          job.child.kill('SIGTERM');
        } catch {}
      }
    }
    this.activeJobId = null;
    this.llamaStop();
  }
}
