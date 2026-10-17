import { test } from 'node:test';
import assert from 'node:assert/strict';
import { botDefector, clientIp } from '../src/index.js';

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/141.0 Safari/537.36';
const req = (ip, ua = CHROME, headers = {}, url = '/') => ({ url, socket: { remoteAddress: ip }, headers: { 'user-agent': ua, ...headers } });
function res() {
  return {
    headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(body) { this.body = body; },
  };
}

test('passes normal visitors to next()', () => {
  const mw = botDefector();
  let called = false;
  mw(req('1.2.3.4'), res(), () => (called = true));
  assert.ok(called);
});

test('blocks bad user agents and blocked IPs with 403', () => {
  const blocked = [];
  const mw = botDefector({ blockIps: ['203.0.113.0/24'], onBlock: (v) => blocked.push(v.reason) });
  const r1 = res();
  mw(req('1.2.3.4', 'curl/8.5'), r1);
  assert.equal(r1.statusCode, 403);
  const r2 = res();
  mw(req('203.0.113.9'), r2);
  assert.equal(r2.statusCode, 403);
  assert.deepEqual(blocked, ['blocked agent: curl', 'blocked IP']);
});

test('allowIps skip every check', () => {
  const mw = botDefector({ allowIps: ['10.0.0.0/8'], blockIps: ['10.0.0.0/8'] });
  assert.equal(mw.check(req('10.1.1.1', 'curl/8')), null);
});

test('rate limits with 429 and Retry-After', () => {
  const mw = botDefector({ rateLimit: { limit: 2, windowMs: 60_000 } });
  mw(req('5.5.5.5'), res());
  mw(req('5.5.5.5'), res());
  const r = res();
  mw(req('5.5.5.5'), r);
  assert.equal(r.statusCode, 429);
  assert.equal(r.headers['retry-after'], 60);
});

test('features can be turned off', () => {
  const mw = botDefector({ userAgents: false, rateLimit: false });
  for (let i = 0; i < 500; i++) assert.equal(mw.check(req('6.6.6.6', 'curl/8')), null);
});

test('only trusts X-Forwarded-For when told to', () => {
  const r = req('127.0.0.1', CHROME, { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' });
  assert.equal(clientIp(r), '127.0.0.1');
  assert.equal(clientIp(r, true), '198.51.100.7');
});

test('a trap path bans the IP for every later request', () => {
  const mw = botDefector();
  assert.equal(mw.check(req('7.7.7.7', CHROME, {}, '/wp-login.php?x=1')).reason, 'trap: /wp-login.php');
  assert.equal(mw.check(req('7.7.7.7', CHROME, {}, '/')).reason, 'banned after trap');
  assert.equal(mw.check(req('8.8.8.8', CHROME, {}, '/')), null);
  mw.unban('7.7.7.7');
  assert.equal(mw.check(req('7.7.7.7', CHROME, {}, '/')), null);
});

test('traps can be customised or turned off', () => {
  assert.equal(botDefector({ traps: ['/secret-trap/'] }).check(req('9.9.9.9', CHROME, {}, '/secret-trap')).status, 403);
  assert.equal(botDefector({ traps: [] }).check(req('9.9.9.9', CHROME, {}, '/.env')), null);
});

test('counts allowed and blocked requests by reason', () => {
  const mw = botDefector();
  mw(req('1.1.1.1'), res());
  mw(req('1.1.1.2', 'curl/8'), res());
  mw(req('1.1.1.3', 'wget/1'), res());
  mw(req('1.1.1.4', CHROME, {}, '/.env'), res());
  assert.deepEqual(mw.stats(), { allowed: 1, blocked: 3, reasons: { 'blocked agent': 2, trap: 1 } });
});
