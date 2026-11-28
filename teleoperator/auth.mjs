import crypto from 'node:crypto';

const ACCESS_TTL_MS = 86400000;
const CODE_TTL_MS = 600000;
const MAX_OAUTH_BODY = 65536;
const PUBLIC_PATHS = new Set([
  '/.well-known/oauth-authorization-server',
  '/.well-known/openid-configuration',
  '/.well-known/oauth-protected-resource',
  '/oauth/register',
  '/oauth/authorize',
  '/oauth/token'
]);

function sha256hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function sha256b64url(value) {
  return crypto.createHash('sha256').update(String(value)).digest('base64url');
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length || left.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function validRedirectUri(raw) {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:') {
      return true;
    }
    return parsed.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function isPublicPath(pathname) {
  return PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith('/.well-known/oauth-protected-resource/');
}

export function isLocalAdminRequest(req, port) {
  const host = String(req.headers.host || '').toLowerCase();
  const loopbackHosts = new Set([
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    `[::1]:${port}`,
    '127.0.0.1',
    'localhost',
    '[::1]'
  ]);
  const h = req.headers;
  const hasProxy = Boolean(
    h['cf-connecting-ip'] ||
    h['cf-ray'] ||
    h['x-forwarded-for'] ||
    h['x-forwarded-host'] ||
    h['forwarded'] ||
    h['tailscale-user-login']
  );
  return loopbackHosts.has(host) && !hasProxy;
}

export class AuthStore {
  constructor(masterToken) {
    this.masterToken = masterToken;
    this.clients = new Map();
    this.codes = new Map();
    this.tokens = new Map();
    this.sseSessionTokens = new Map();
  }

  extractToken(req, url, pathToken) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return req.headers['x-carol-token'] ||
      url.searchParams.get('token') ||
      pathToken ||
      '';
  }

  isAuthorized(req, url, pathToken) {
    if (!this.masterToken) {
      return false;
    }
    const given = this.extractToken(req, url, pathToken);
    if (!given) {
      return false;
    }
    if (safeEqual(given, this.masterToken)) {
      return true;
    }
    const sid = url.searchParams.get('sessionId');
    if (sid && this.sseSessionTokens.has(sid) && safeEqual(given, this.sseSessionTokens.get(sid))) {
      return true;
    }
    const rec = this.tokens.get(sha256hex(given));
    return Boolean(rec && rec.type === 'access' && (!rec.exp || rec.exp > Date.now()));
  }

  mintSseToken(sessionId) {
    const token = crypto.randomBytes(24).toString('hex');
    this.sseSessionTokens.set(sessionId, token);
    return token;
  }

  dropSseToken(sessionId) {
    this.sseSessionTokens.delete(sessionId);
  }

  mintOAuthTokens(clientId, existingRefresh = '') {
    const access = `tele_at_${crypto.randomBytes(32).toString('hex')}`;
    this.tokens.set(sha256hex(access), {
      type: 'access',
      clientId,
      exp: Date.now() + ACCESS_TTL_MS
    });
    let refresh = existingRefresh;
    if (!refresh) {
      refresh = `tele_rt_${crypto.randomBytes(32).toString('hex')}`;
      this.tokens.set(sha256hex(refresh), {
        type: 'refresh',
        clientId,
        exp: 0
      });
    }
    return {
      access_token: access,
      token_type: 'Bearer',
      expires_in: Math.floor(ACCESS_TTL_MS / 1000),
      refresh_token: refresh,
      scope: 'mcp'
    };
  }

  async handleOAuthRoute(req, res, url, baseUrl, readBody, sendJson) {
    if (url.pathname === '/.well-known/oauth-protected-resource' ||
        url.pathname.startsWith('/.well-known/oauth-protected-resource/')) {
      sendJson(res, 200, {
        resource: baseUrl,
        authorization_servers: [baseUrl],
        bearer_methods_supported: ['header'],
        scopes_supported: ['mcp']
      });
      return true;
    }

    if (url.pathname === '/.well-known/oauth-authorization-server' ||
        url.pathname === '/.well-known/openid-configuration') {
      sendJson(res, 200, {
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        registration_endpoint: `${baseUrl}/oauth/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
        scopes_supported: ['mcp']
      });
      return true;
    }

    if (url.pathname === '/oauth/register' && req.method === 'POST') {
      let meta = {};
      try {
        meta = JSON.parse(await readBody(req, MAX_OAUTH_BODY) || '{}');
      } catch {}
      const rawUris = Array.isArray(meta.redirect_uris) ? meta.redirect_uris : [];
      const redirectUris = rawUris.filter((u) => validRedirectUri(u));
      if (rawUris.length > 0 && redirectUris.length === 0) {
        sendJson(res, 400, { error: 'invalid_redirect_uri' });
        return true;
      }
      const allowedMethods = ['none', 'client_secret_post', 'client_secret_basic'];
      const authMethod = allowedMethods.includes(meta.token_endpoint_auth_method)
        ? meta.token_endpoint_auth_method
        : 'client_secret_post';
      const clientId = `tele_${crypto.randomBytes(16).toString('hex')}`;
      const clientSecret = authMethod === 'none' ? '' : crypto.randomBytes(32).toString('hex');
      this.clients.set(clientId, {
        secretHash: clientSecret ? sha256hex(clientSecret) : '',
        redirectUris,
        authMethod
      });
      const out = {
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: 0,
        redirect_uris: redirectUris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: authMethod,
        scope: 'mcp'
      };
      if (clientSecret) {
        out.client_secret = clientSecret;
      }
      sendJson(res, 201, out);
      return true;
    }

    if (url.pathname === '/oauth/authorize') {
      const redirectUri = url.searchParams.get('redirect_uri');
      if (!redirectUri) {
        sendJson(res, 200, { status: 'authorized' });
        return true;
      }
      const clientId = url.searchParams.get('client_id') || '';
      const client = this.clients.get(clientId);
      if (!client) {
        sendJson(res, 400, { error: 'invalid_client' });
        return true;
      }
      if (url.searchParams.get('response_type') !== 'code') {
        sendJson(res, 400, { error: 'unsupported_response_type' });
        return true;
      }
      const challenge = url.searchParams.get('code_challenge') || '';
      if (!challenge && client.authMethod === 'none') {
        sendJson(res, 400, { error: 'invalid_request' });
        return true;
      }
      const uriOk = client.redirectUris.length > 0
        ? client.redirectUris.includes(redirectUri)
        : validRedirectUri(redirectUri);
      if (!uriOk) {
        sendJson(res, 400, { error: 'invalid_redirect_uri' });
        return true;
      }
      const code = crypto.randomBytes(32).toString('hex');
      this.codes.set(code, {
        exp: Date.now() + CODE_TTL_MS,
        challenge,
        method: url.searchParams.get('code_challenge_method') || 'S256',
        clientId,
        redirectUri
      });
      const target = new URL(redirectUri);
      target.searchParams.set('code', code);
      const state = url.searchParams.get('state') || '';
      if (state) {
        target.searchParams.set('state', state);
      }
      target.searchParams.set('iss', baseUrl);
      res.writeHead(302, { Location: target.toString() });
      res.end();
      return true;
    }

    if (url.pathname === '/oauth/token' && req.method === 'POST') {
      const form = new URLSearchParams(await readBody(req, MAX_OAUTH_BODY));
      let clientId = form.get('client_id') || '';
      let clientSecret = form.get('client_secret') || '';
      const basic = req.headers.authorization || '';
      if (basic.startsWith('Basic ')) {
        try {
          const decoded = Buffer.from(basic.slice(6), 'base64').toString('utf8');
          const sep = decoded.indexOf(':');
          if (sep >= 0) {
            if (!clientId) clientId = decoded.slice(0, sep);
            if (!clientSecret) clientSecret = decoded.slice(sep + 1);
          }
        } catch {}
      }
      const grantType = form.get('grant_type') || 'authorization_code';
      if (grantType === 'refresh_token') {
        const rt = form.get('refresh_token') || '';
        const rec = this.tokens.get(sha256hex(rt));
        if (!rec || rec.type !== 'refresh') {
          sendJson(res, 401, { error: 'invalid_grant' });
          return true;
        }
        sendJson(res, 200, this.mintOAuthTokens(rec.clientId, rt));
        return true;
      }
      const code = form.get('code') || '';
      const rec = this.codes.get(code);
      this.codes.delete(code);
      if (!rec || rec.exp < Date.now()) {
        sendJson(res, 400, { error: 'invalid_grant' });
        return true;
      }
      const client = this.clients.get(rec.clientId);
      if (client && client.secretHash && !safeEqual(sha256hex(clientSecret), client.secretHash)) {
        sendJson(res, 401, { error: 'invalid_client' });
        return true;
      }
      if (rec.challenge) {
        const verifier = form.get('code_verifier') || '';
        const expected = rec.method === 'plain' ? verifier : sha256b64url(verifier);
        if (!safeEqual(expected, rec.challenge)) {
          sendJson(res, 400, { error: 'invalid_grant' });
          return true;
        }
      }
      sendJson(res, 200, this.mintOAuthTokens(rec.clientId));
      return true;
    }

    return false;
  }
}
