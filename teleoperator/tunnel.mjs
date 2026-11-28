import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const TOKEN_BYTES = 24;
const TOKEN_PATTERN = /^[0-9a-f]{32,}$/;
const TAILSCALE_TIMEOUT_MS = 15000;
const FUNNEL_TIMEOUT_MS = 20000;

export function loadOrCreateToken(stateDir, rotate = false) {
  const tokenPath = path.join(stateDir, 'token');
  if (!rotate) {
    try {
      const saved = fs.readFileSync(tokenPath, 'utf8').trim();
      if (TOKEN_PATTERN.test(saved)) {
        return saved;
      }
    } catch {}
  }
  const fresh = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(tokenPath, `${fresh}\n`, { mode: 0o600 });
  return fresh;
}

export function checkTailscale() {
  const which = spawnSync('which', ['tailscale'], { encoding: 'utf8' });
  if (which.status !== 0 || !which.stdout.trim()) {
    return {
      ok: false,
      reason: 'Tailscale CLI is not installed.',
      steps: [
        '1. Install Tailscale: https://tailscale.com/download (or `brew install --cask tailscale`).',
        '2. Open Tailscale and sign in (free plan works).',
        '3. Enable Funnel once in Tailscale Admin Console -> DNS -> Enable HTTPS & Funnel.',
        '4. Re-run `teleoperator`.'
      ]
    };
  }

  const status = spawnSync('tailscale', ['status', '--json'], {
    encoding: 'utf8',
    timeout: TAILSCALE_TIMEOUT_MS
  });
  if (status.status !== 0) {
    return {
      ok: false,
      reason: 'Tailscale is installed but not signed in or daemon is stopped.',
      steps: [
        '1. Start Tailscale and sign in (`tailscale up` or via the Tailscale menu bar app).',
        '2. Re-run `teleoperator`.'
      ]
    };
  }

  let dnsName = '';
  try {
    const parsed = JSON.parse(status.stdout || '{}');
    dnsName = String(parsed?.Self?.DNSName || '').replace(/\.$/, '');
  } catch {}

  if (!dnsName) {
    return {
      ok: false,
      reason: 'Tailscale MagicDNS hostname is missing.',
      steps: [
        '1. Open Tailscale Admin Console -> DNS -> Enable MagicDNS and HTTPS Certificates.',
        '2. Re-run `teleoperator`.'
      ]
    };
  }

  return { ok: true, dnsName };
}

export function startFunnel(port) {
  const check = checkTailscale();
  if (!check.ok) {
    return { ok: false, reason: check.reason, steps: check.steps, publicUrl: '' };
  }

  const res = spawnSync('tailscale', ['funnel', '--bg', String(port)], {
    encoding: 'utf8',
    timeout: FUNNEL_TIMEOUT_MS
  });
  if (res.status !== 0) {
    const detail = (res.stderr || res.stdout || '').trim() || 'tailscale funnel failed';
    return {
      ok: false,
      reason: detail,
      steps: [
        '1. Enable Funnel once in Tailscale Admin Console (or follow the URL printed by Tailscale).',
        `2. Verify manually: tailscale funnel --bg ${port}`,
        '3. Re-run `teleoperator`.'
      ],
      publicUrl: ''
    };
  }

  return {
    ok: true,
    dnsName: check.dnsName,
    publicUrl: `https://${check.dnsName}`
  };
}

export function stopFunnel() {
  try {
    spawnSync('tailscale', ['funnel', '--bg', 'off'], {
      stdio: 'ignore',
      timeout: TAILSCALE_TIMEOUT_MS
    });
  } catch {}
}
