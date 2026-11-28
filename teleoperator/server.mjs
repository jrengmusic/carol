import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import { AuthStore, isPublicPath } from './auth.mjs';

const DEFAULT_PROTOCOL_VERSION = '2025-03-26';
const SERVER_INFO = { name: 'CAROL TELEOPERATOR', version: '0.1.0' };
const MAX_BODY_BYTES = 10_000_000;
const PORT_PROBE_COUNT = 20;

export function findFreePort(startPort) {
  return new Promise((resolve) => {
    const probe = (port, remaining) => {
      const server = net.createServer();
      server.once('error', () => {
        if (remaining > 0) {
          probe(port + 1, remaining - 1);
        } else {
          resolve(startPort);
        }
      });
      server.once('listening', () => server.close(() => resolve(port)));
      server.listen(port, '127.0.0.1');
    };
    probe(startPort, PORT_PROBE_COUNT);
  });
}

function sendJson(res, code, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders
  });
  res.end(body);
}

function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function setMcpCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-carol-token, mcp-session-id, mcp-protocol-version');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
}

function extractPathToken(pathname) {
  const match = pathname.match(/^\/(mcp|sse)\/([0-9a-f]{32,})$/);
  if (!match) {
    return { pathname, pathToken: '' };
  }
  return { pathname: `/${match[1]}`, pathToken: match[2] };
}

export function createTeleoperatorServer({ registry, token, port, publicUrl }) {
  const auth = new AuthStore(token);
  const mcpSessions = new Map();
  const sseSessions = new Map();
  let activePublicUrl = publicUrl || '';

  async function handleRpc(msg) {
    const { id, method, params } = msg || {};
    const reply = (result) => ({ jsonrpc: '2.0', id, result });
    const fail = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

    switch (method) {
      case 'initialize':
        return reply({
          protocolVersion: params?.protocolVersion || DEFAULT_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO
        });
      case 'notifications/initialized':
        return null;
      case 'ping':
        return reply({});
      case 'tools/list':
        return reply({ tools: registry.listTools() });
      case 'tools/call':
        try {
          const result = await registry.callTool(params?.name, params?.arguments || {});
          return reply(result);
        } catch (err) {
          return reply({
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true
          });
        }
      default:
        return id === undefined ? null : fail(-32601, `Method not found: ${method}`);
    }
  }

  const server = http.createServer(async (req, res) => {
    const rawUrl = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${port}`}`);
    const { pathname, pathToken } = extractPathToken(rawUrl.pathname);
    const baseUrl = activePublicUrl || `http://${req.headers.host || `127.0.0.1:${port}`}`;

    if (req.method === 'OPTIONS' && (pathname === '/mcp' || pathname === '/sse' || pathname === '/messages')) {
      setMcpCors(res);
      res.writeHead(204);
      res.end();
      return;
    }

    if (isPublicPath(pathname)) {
      const handled = await auth.handleOAuthRoute(req, res, rawUrl, baseUrl, readBody, sendJson);
      if (handled) {
        return;
      }
    }

    if (pathname === '/health' && req.method === 'GET') {
      sendJson(res, 200, {
        status: 'online',
        project: registry.projectDir,
        upstreams: registry.status,
        toolCount: registry.listTools().length
      });
      return;
    }

    if (!auth.isAuthorized(req, rawUrl, pathToken)) {
      res.writeHead(401, {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
      });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    if (pathname === '/mcp') {
      setMcpCors(res);
      if (req.method === 'DELETE') {
        const sid = req.headers['mcp-session-id'];
        if (sid) {
          mcpSessions.delete(String(sid));
        }
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        res.write(': connected\n\n');
        const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
        req.on('close', () => clearInterval(heartbeat));
        return;
      }
      if (req.method === 'POST') {
        let payload;
        try {
          payload = JSON.parse(await readBody(req) || '{}');
        } catch {
          sendJson(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
          return;
        }
        let sessionId = String(req.headers['mcp-session-id'] || '');
        if (payload?.method === 'initialize' && !sessionId) {
          sessionId = crypto.randomBytes(16).toString('hex');
          mcpSessions.set(sessionId, { createdAt: Date.now() });
        }
        const headers = sessionId ? { 'mcp-session-id': sessionId } : {};
        const response = await handleRpc(payload);
        if (response === null) {
          res.writeHead(202, headers);
          res.end();
          return;
        }
        sendJson(res, 200, response, headers);
        return;
      }
    }

    if (pathname === '/sse' && req.method === 'GET') {
      setMcpCors(res);
      const sessionId = crypto.randomBytes(16).toString('hex');
      const sseToken = auth.mintSseToken(sessionId);
      sseSessions.set(sessionId, res);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write(`event: endpoint\ndata: /messages?sessionId=${sessionId}&token=${sseToken}\n\n`);
      const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
      req.on('close', () => {
        clearInterval(heartbeat);
        sseSessions.delete(sessionId);
        auth.dropSseToken(sessionId);
      });
      return;
    }

    if (pathname === '/messages' && req.method === 'POST') {
      setMcpCors(res);
      const sessionId = rawUrl.searchParams.get('sessionId') || '';
      const sseRes = sseSessions.get(sessionId);
      if (!sseRes) {
        sendJson(res, 404, { error: 'Unknown SSE session' });
        return;
      }
      let payload;
      try {
        payload = JSON.parse(await readBody(req) || '{}');
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON' });
        return;
      }
      const response = await handleRpc(payload);
      if (response !== null) {
        sseRes.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
      }
      res.writeHead(202);
      res.end();
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  });

  return {
    server,
    setPublicUrl(url) {
      activePublicUrl = url;
    },
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => resolve());
      });
    },
    close() {
      for (const sseRes of sseSessions.values()) {
        try {
          sseRes.end();
        } catch {}
      }
      sseSessions.clear();
      return new Promise((resolve) => server.close(() => resolve()));
    }
  };
}
