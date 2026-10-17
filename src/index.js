import { ipMatcher } from './ip.js';
import { createRateLimiter } from './rate-limit.js';
import { checkUserAgent } from './user-agent.js';

export { checkUserAgent, BAD_AGENTS, GOOD_AGENTS } from './user-agent.js';
export { ipMatcher, parseIp } from './ip.js';
export { createRateLimiter } from './rate-limit.js';
export { loadIpList, parseIpList } from './list.js';

// The client IP. Only reads X-Forwarded-For when trustProxy is on, because
// anyone can send that header when there's no proxy in front of you.
export function clientIp(req, trustProxy = false) {
  if (trustProxy) {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? '';
}

export function botDefector(options = {}) {
  const {
    allowIps = [],
    blockIps = [],
    trustProxy = false,
    userAgents = true,
    rateLimit = { limit: 120, windowMs: 60_000 },
    onBlock = () => {},
    // Paths no real visitor asks for. Hitting one bans that IP for banMs.
    traps = ['/wp-login.php', '/wp-admin', '/xmlrpc.php', '/.env', '/.git/config', '/phpmyadmin'],
    banMs = 60 * 60_000,
  } = options;

  const allowed = ipMatcher(allowIps);
  const blocked = ipMatcher(blockIps);
  const banned = new Map();
  const norm = (p) => String(p).split('?')[0].toLowerCase().replace(/\/+$/, '');
  const trapSet = new Set(traps.map(norm));
  const limiter = rateLimit ? createRateLimiter(rateLimit) : null;
  setInterval(() => {
    limiter?.sweep();
    const t = Date.now();
    for (const [ip, until] of banned) if (until <= t) banned.delete(ip);
  }, rateLimit?.windowMs ?? 60_000).unref();

  // Returns null to let the request through, or { ip, status, reason, retryAfterMs }.
  function check(req) {
    const ip = clientIp(req, trustProxy);
    if (allowed(ip)) return null;
    if (blocked(ip)) return { ip, status: 403, reason: 'blocked IP' };
    if ((banned.get(ip) ?? 0) > Date.now()) return { ip, status: 403, reason: 'banned after trap' };
    if (trapSet.has(norm(req.url ?? ''))) {
      banned.set(ip, Date.now() + banMs);
      return { ip, status: 403, reason: `trap: ${String(req.url).split('?')[0]}` };
    }
    if (userAgents) {
      const ua = checkUserAgent(req.headers?.['user-agent'], userAgents === true ? {} : userAgents);
      if (ua.bot) return { ip, status: 403, reason: ua.reason };
    }
    if (limiter) {
      const r = limiter.hit(ip);
      if (r.limited) return { ip, status: 429, reason: 'rate limited', retryAfterMs: r.retryAfterMs };
    }
    return null;
  }

  // Works with Express, Connect, and plain node:http (call it with (req, res, next)).
  const stats = { allowed: 0, blocked: 0, reasons: {} };

  function middleware(req, res, next = () => {}) {
    const verdict = check(req);
    if (!verdict) {
      stats.allowed++;
      return next();
    }
    stats.blocked++;
    // Group "blocked agent: curl" and "trap: /.env" style reasons by their kind.
    const kind = verdict.reason.split(':')[0];
    stats.reasons[kind] = (stats.reasons[kind] ?? 0) + 1;
    onBlock(verdict, req);
    if (verdict.retryAfterMs) res.setHeader('Retry-After', Math.ceil(verdict.retryAfterMs / 1000));
    res.statusCode = verdict.status;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(verdict.status === 429 ? 'Too many requests\n' : 'Forbidden\n');
  }

  middleware.check = check;
  middleware.stats = () => structuredClone(stats);
  middleware.unban = (ip) => banned.delete(ip);
  return middleware;
}
