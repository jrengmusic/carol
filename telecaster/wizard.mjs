import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ToolRegistry } from './registry.mjs';
import { loadOrCreateToken, startFunnel, stopFunnel } from './tunnel.mjs';
import { createTelecasterServer, findFreePort } from './server.mjs';
import { exportSkillBundle } from './skill.mjs';

const DEFAULT_PORT = 9494;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CAROL_DIR = path.resolve(SCRIPT_DIR, '..');
const STATE_DIR = path.join(CAROL_DIR, '.telecaster');

const USE_COLOR = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const ansi = (code) => (USE_COLOR ? `\x1b[${code}m` : '');
const C = {
  red: ansi('0;31'),
  green: ansi('0;32'),
  yellow: ansi('1;33'),
  blue: ansi('0;34'),
  magenta: ansi('0;35'),
  cyan: ansi('0;36'),
  grey: ansi('0;37'),
  dim: ansi('2'),
  bold: ansi('1'),
  nc: ansi('0')
};

const BANNER_LINES = [
  ['38;2;0;212;255',   '    ████████     ████     ██████████     ████████   ████        '],
  ['38;2;51;170;255',  '  ████░░░░░░   ████████   ████░░░░████ ████░░░░████ ████        '],
  ['38;2;102;128;255', '████░░       ████░░░░████ ████    ████ ████    ████ ████        '],
  ['38;2;153;102;255', '████         ████    ████ ██████████░░ ████    ████ ████        '],
  ['38;2;178;76;230',  '████         ████████████ ████░░████   ████    ████ ████        '],
  ['38;2;204;51;204',  '░░████       ████░░░░████ ████  ░░████ ████    ████ ████        '],
  ['38;2;230;25;179',  '  ░░████████ ████    ████ ████    ████ ░░████████░░ ████████████'],
  ['38;2;255;0;153',   '    ░░░░░░░░ ░░░░    ░░░░ ░░░░    ░░░░   ░░░░░░░░   ░░░░░░░░░░░░']
];

function printBanner() {
  console.log('');
  for (const [rgb, line] of BANNER_LINES) {
    console.log(`${ansi(rgb)}${line}${C.nc}`);
  }
  console.log('');
  console.log(`${C.cyan}Cognitive Amplifier Role Orchestration for Large Language Model${C.nc}`);
}

const CLIENTS = [
  {
    key: '1',
    name: 'Gemini Web',
    steps: (mcpUrl) => [
      '1. Open https://gemini.google.com/customize/connectors',
      `2. Add a custom MCP connector and paste: ${mcpUrl}`,
      '3. Enable the connector in your Gemini Web chat.',
      '4. Upload the TELECASTER skill once (`telecaster --skill`), then send: telecaster rock n roll'
    ]
  },
  {
    key: '2',
    name: 'Claude Web',
    steps: (mcpUrl) => [
      '1. Open https://claude.ai/settings/connectors',
      `2. Click "Add custom connector" and paste: ${mcpUrl}`,
      '3. Enable the connector in your Claude chat.',
      '4. Upload the TELECASTER skill once (`telecaster --skill`), then send: telecaster rock n roll'
    ]
  },
  {
    key: '3',
    name: 'ChatGPT Web',
    steps: (mcpUrl) => [
      '1. Open ChatGPT Settings -> Connectors -> Developer Mode.',
      `2. Add a custom MCP server and paste: ${mcpUrl}`,
      '3. Enable the connector in your chat.',
      '4. Load the TELECASTER skill (`telecaster --skill`), then send: telecaster rock n roll'
    ]
  },
  {
    key: '4',
    name: 'Other MCP Web Client',
    steps: (mcpUrl) => [
      `1. Paste this Streamable HTTP / SSE MCP endpoint into your client: ${mcpUrl}`,
      '2. Load the TELECASTER skill (`telecaster --skill`), then send: telecaster rock n roll'
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
  printBanner();
  console.log('');
  console.log(`${C.cyan}Usage:${C.nc}`);
  console.log('  telecaster [project-dir] [options]');
  console.log('');
  console.log(`${C.magenta}Options:${C.nc}`);
  console.log(`  ${C.yellow}--port <n>${C.nc}       Loopback port (default: 9494)`);
  console.log(`  ${C.yellow}--rw <dir>${C.nc}       Add extra read-write root (repeatable)`);
  console.log(`  ${C.yellow}--ro <dir>${C.nc}       Add extra read-only root (repeatable)`);
  console.log(`  ${C.yellow}--local${C.nc}          Loopback only (skip Tailscale Funnel)`);
  console.log(`  ${C.yellow}--no-wizard${C.nc}      Skip interactive prompts`);
  console.log(`  ${C.yellow}--rotate-token${C.nc}   Mint a new access token`);
  console.log(`  ${C.yellow}--skill${C.nc}          Build uploadable TELECASTER skill bundle and exit`);
  console.log(`  ${C.yellow}-h, --help${C.nc}       Show this help`);
}

function printUpstreams(status) {
  console.log(`\n${C.magenta}MCP Upstreams:${C.nc}`);
  for (const [name, info] of Object.entries(status)) {
    if (info.active) {
      const unit = info.tools === 1 ? 'tool' : 'tools';
      console.log(`  ${C.green}✓${C.nc} ${C.cyan}${name.padEnd(8)}${C.nc} ${C.dim}(${info.tools} ${unit})${C.nc}`);
    } else {
      console.log(`  ${C.dim}– ${name.padEnd(8)} (${info.reason})${C.nc}`);
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

  printBanner();
  if (!opts.noWizard && process.stdin.isTTY) {
    console.log(`\n${C.magenta}TELECASTER${C.nc} ${C.dim}—${C.nc} ${C.cyan}${projectDir}${C.nc}`);
    for (const c of CLIENTS) {
      console.log(`  ${C.yellow}${c.key})${C.nc} ${c.name}`);
    }
    process.stdout.write(`Press ${C.yellow}1-4${C.nc} [${C.yellow}1${C.nc}]: `);
    const key = await readSingleKey();
    client = CLIENTS.find((c) => c.key === key) || CLIENTS[0];
    console.log(`${C.green}${client.name}${C.nc}`);
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
    console.log(`${C.green}✓ TELECASTER skill bundle built from ~/.carol/ SSOT:${C.nc}`);
    console.log(`  ${C.yellow}Folder:${C.nc} ${bundle.bundleDir}`);
    console.log(`  ${C.yellow}SKILL:${C.nc}  ${bundle.skillFile}`);
    console.log(`  ${C.yellow}Refs:${C.nc}   ${bundle.refsDir} (${bundle.files.length} files)`);
    if (bundle.zipPath) {
      console.log(`  ${C.yellow}Zip:${C.nc}    ${C.cyan}${bundle.zipPath}${C.nc}`);
    }
    return;
  }

  const { projectDir, client } = await runWizard(opts);
  if (!fs.existsSync(projectDir)) {
    console.error(`${C.red}Error: Project folder does not exist: ${projectDir}${C.nc}`);
    process.exit(1);
  }

  const token = loadOrCreateToken(STATE_DIR, opts.rotateToken);
  const port = await findFreePort(opts.port);

  const registry = new ToolRegistry(projectDir, CAROL_DIR, {
    readWriteRoots: opts.rwRoots,
    readOnlyRoots: opts.roRoots
  });
  await registry.start();

  const httpServer = createTelecasterServer({
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
      console.error(`\n${C.red}Error: Tailscale Funnel: ${funnel.reason}${C.nc}\n`);
      for (const step of funnel.steps) {
        console.error(`  ${step}`);
      }
      console.error(`\n${C.yellow}→${C.nc} Tip: run ${C.cyan}telecaster --local${C.nc} to test locally without Tailscale.`);
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

  console.log(`\n${C.green}${C.bold}✓ Amplifier MCP Online${C.nc} ${C.dim}(TELECASTER)${C.nc}`);
  console.log(`  ${C.yellow}Project:${C.nc}  ${C.cyan}${projectDir}${C.nc}`);
  console.log(`  ${C.yellow}RW Roots:${C.nc} ${registry.rwRoots.join(', ')}`);
  console.log(`  ${C.yellow}RO Roots:${C.nc} ${registry.roRoots.join(', ') || `${C.dim}none${C.nc}`}`);
  console.log(`  ${C.yellow}Manifest:${C.nc} ${hasManifest ? `${C.green}project-info.md detected (ling active)${C.nc}` : `${C.dim}none (ling skipped)${C.nc}`}`);
  console.log(`  ${C.yellow}Health:${C.nc}   http://127.0.0.1:${port}/health`);
  console.log(`  ${C.yellow}MCP Link:${C.nc} ${C.cyan}${mcpUrl}${C.nc}${copied ? `  ${C.green}(copied to clipboard)${C.nc}` : ''}`);
  printUpstreams(registry.status);

  console.log(`\n${C.magenta}Setup on ${client.name}:${C.nc}`);
  for (const line of client.steps(mcpUrl)) {
    console.log(`  ${line}`);
  }
  console.log(`\n${C.dim}Press Ctrl+C to stop gateway and close Tailscale Funnel.${C.nc}`);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) {
      process.exit(130);
    }
    stopping = true;
    console.log(`\n${C.yellow}→ Stopping TELECASTER...${C.nc}`);
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
  console.error(`${C.red}Error: TELECASTER failed: ${err.message}${C.nc}`);
  process.exit(1);
});
