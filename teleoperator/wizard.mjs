import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ToolRegistry } from './registry.mjs';
import { loadOrCreateToken, startFunnel, stopFunnel } from './tunnel.mjs';
import { createTeleoperatorServer, findFreePort } from './server.mjs';
import { exportSkillBundle } from './skill.mjs';

const DEFAULT_PORT = 9494;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CAROL_DIR = path.resolve(SCRIPT_DIR, '..');
const STATE_DIR = path.join(CAROL_DIR, '.teleoperator');

const CLIENTS = [
  {
    key: '1',
    name: 'Gemini Web',
    steps: (mcpUrl) => [
      '1. Open https://gemini.google.com/customize/connectors',
      `2. Add a custom MCP connector and paste: ${mcpUrl}`,
      '3. Enable the connector in your Gemini Web chat.',
      '4. Upload the TELEOPERATOR skill once (`teleoperator --skill`), then send: teleoperator rock n roll'
    ]
  },
  {
    key: '2',
    name: 'Claude Web',
    steps: (mcpUrl) => [
      '1. Open https://claude.ai/settings/connectors',
      `2. Click "Add custom connector" and paste: ${mcpUrl}`,
      '3. Enable the connector in your Claude chat.',
      '4. Upload the TELEOPERATOR skill once (`teleoperator --skill`), then send: teleoperator rock n roll'
    ]
  },
  {
    key: '3',
    name: 'ChatGPT Web',
    steps: (mcpUrl) => [
      '1. Open ChatGPT Settings -> Connectors -> Developer Mode.',
      `2. Add a custom MCP server and paste: ${mcpUrl}`,
      '3. Enable the connector in your chat.',
      '4. Load the TELEOPERATOR skill (`teleoperator --skill`), then send: teleoperator rock n roll'
    ]
  },
  {
    key: '4',
    name: 'Other MCP Web Client',
    steps: (mcpUrl) => [
      `1. Paste this Streamable HTTP / SSE MCP endpoint into your client: ${mcpUrl}`,
      '2. Load the TELEOPERATOR skill (`teleoperator --skill`), then send: teleoperator rock n roll'
    ]
  }
];

function parseArgs(argv) {
  const opts = {
    projectArg: '',
    port: DEFAULT_PORT,
    local: false,
    noWizard: false,
    rotateToken: false,
    skill: false,
    help: false,
    rwRoots: [],
    roRoots: []
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--local') opts.local = true;
    else if (arg === '--no-wizard') opts.noWizard = true;
    else if (arg === '--rotate-token') opts.rotateToken = true;
    else if (arg === '--skill') opts.skill = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--port' && argv[i + 1]) {
      opts.port = Number(argv[++i]) || DEFAULT_PORT;
    } else if (arg === '--rw' && argv[i + 1]) {
      opts.rwRoots.push(path.resolve(expandHome(argv[++i])));
    } else if (arg === '--ro' && argv[i + 1]) {
      opts.roRoots.push(path.resolve(expandHome(argv[++i])));
    } else if (!arg.startsWith('-') && !opts.projectArg) {
      opts.projectArg = arg;
    }
  }
  return opts;
}

function expandHome(value) {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

function copyClipboard(text) {
  if (process.platform === 'darwin') {
    const res = spawnSync('pbcopy', [], { input: text, encoding: 'utf8' });
    return res.status === 0;
  }
  return false;
}

function printHelp() {
  console.log(`CAROL TELEOPERATOR — remote MCP gateway for web AI clients

Usage:
  teleoperator [project-dir] [options]

Options:
  --port <n>       Loopback port (default: 9494)
  --rw <dir>       Add extra read-write root (repeatable)
  --ro <dir>       Add extra read-only root (repeatable)
  --local          Loopback only (skip Tailscale Funnel)
  --no-wizard      Skip interactive prompts
  --rotate-token   Mint a new access token
  --skill          Build uploadable TELEOPERATOR skill bundle and exit
  -h, --help       Show this help`);
}

function printUpstreams(status) {
  console.log('\nMCP Upstreams:');
  for (const [name, info] of Object.entries(status)) {
    if (info.active) {
      console.log(`  [ok]   ${name} (${info.tools} tools)`);
    } else {
      console.log(`  [skip] ${name} (${info.reason})`);
    }
  }
}

function readSingleKey() {
  return new Promise((resolve) => {
    const onData = (buf) => {
      const ch = buf.toString('utf8');
      if (ch === '\u0003') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        process.exit(130);
      }
      if (ch === '\r' || ch === '\n' || CLIENTS.some((c) => c.key === ch)) {
        process.stdin.off('data', onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.unref();
        resolve(ch === '\r' || ch === '\n' ? '1' : ch);
      }
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

async function runWizard(opts) {
  const projectDir = path.resolve(expandHome(opts.projectArg || process.cwd()));
  let client = CLIENTS[0];

  if (!opts.noWizard && process.stdin.isTTY) {
    console.log(`\nCAROL TELEOPERATOR — ${projectDir}`);
    for (const c of CLIENTS) {
      console.log(`  ${c.key}) ${c.name}`);
    }
    process.stdout.write('Press 1-4 [1]: ');
    const key = await readSingleKey();
    client = CLIENTS.find((c) => c.key === key) || CLIENTS[0];
    console.log(client.name);
  }

  return { projectDir, client };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  if (opts.skill) {
    const bundle = exportSkillBundle(CAROL_DIR, STATE_DIR);
    console.log('TELEOPERATOR skill bundle built from ~/.carol/ SSOT:');
    console.log(`  Folder: ${bundle.bundleDir}`);
    console.log(`  SKILL:  ${bundle.skillFile}`);
    console.log(`  Refs:   ${bundle.refsDir} (${bundle.files.length} files)`);
    if (bundle.zipPath) {
      console.log(`  Zip:    ${bundle.zipPath}`);
    }
    return;
  }

  const { projectDir, client } = await runWizard(opts);
  if (!fs.existsSync(projectDir)) {
    console.error(`Project folder does not exist: ${projectDir}`);
    process.exit(1);
  }

  const token = loadOrCreateToken(STATE_DIR, opts.rotateToken);
  const port = await findFreePort(opts.port);

  const registry = new ToolRegistry(projectDir, CAROL_DIR, {
    readWriteRoots: opts.rwRoots,
    readOnlyRoots: opts.roRoots
  });
  await registry.start();

  const httpServer = createTeleoperatorServer({
    registry,
    token,
    port,
    publicUrl: '',
    stateDir: STATE_DIR
  });
  await httpServer.listen();

  let mcpUrl = `http://127.0.0.1:${port}/mcp/${token}`;
  let funnelStarted = false;

  if (!opts.local) {
    const funnel = startFunnel(port);
    if (!funnel.ok) {
      console.error(`\nTailscale Funnel error: ${funnel.reason}\n`);
      for (const step of funnel.steps) {
        console.error(`  ${step}`);
      }
      console.error('\nTip: run `teleoperator --local` to test locally without Tailscale.');
      await httpServer.close();
      registry.closeAll();
      process.exit(1);
    }
    funnelStarted = true;
    httpServer.setPublicUrl(funnel.publicUrl);
    mcpUrl = `${funnel.publicUrl}/mcp/${token}`;
  }

  const copied = copyClipboard(mcpUrl);
  const hasManifest = fs.existsSync(path.join(projectDir, 'project-info.md'));

  console.log('\nTELEOPERATOR Gateway Online');
  console.log(`  Project:  ${projectDir}`);
  console.log(`  RW Roots: ${registry.rwRoots.join(', ')}`);
  console.log(`  RO Roots: ${registry.roRoots.join(', ') || 'none'}`);
  console.log(`  Manifest: ${hasManifest ? 'project-info.md detected (ling active)' : 'none (ling skipped)'}`);
  console.log(`  Health:   http://127.0.0.1:${port}/health`);
  console.log(`  MCP Link: ${mcpUrl}${copied ? '  (copied to clipboard)' : ''}`);
  printUpstreams(registry.status);

  console.log(`\nSetup on ${client.name}:`);
  for (const line of client.steps(mcpUrl)) {
    console.log(`  ${line}`);
  }
  console.log('\nPress Ctrl+C to stop gateway and close Tailscale Funnel.');

  let stopping = false;
  const shutdown = async () => {
    if (stopping) {
      process.exit(130);
    }
    stopping = true;
    console.log('\nStopping TELEOPERATOR...');
    const forceExit = setTimeout(() => process.exit(0), 1500);
    registry.closeAll();
    await httpServer.close();
    if (funnelStarted) {
      stopFunnel();
    }
    clearTimeout(forceExit);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(`TELEOPERATOR failed: ${err.message}`);
  process.exit(1);
});
