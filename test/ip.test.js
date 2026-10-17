import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ipMatcher, parseCidr, parseIp } from '../src/ip.js';

test('parses IPv4, IPv6 and mapped addresses', () => {
  assert.deepEqual(parseIp('1.2.3.4'), { bits: 32, value: 0x01020304n });
  assert.deepEqual(parseIp('::ffff:1.2.3.4'), { bits: 32, value: 0x01020304n });
  assert.equal(parseIp('::1').value, 1n);
  assert.equal(parseIp('2001:db8::1').value, (0x20010db8n << 96n) + 1n);
  assert.equal(parseIp('64:ff9b::1.2.3.4').value, (0x64ff9bn << 96n) + 0x01020304n);
  for (const bad of ['', 'nope', '1.2.3', '300.1.1.1', 'gggg::1']) assert.equal(parseIp(bad), null, bad);
});

test('rejects bad CIDRs', () => {
  assert.throws(() => parseCidr('1.2.3.4/33'), /prefix/);
  assert.throws(() => parseCidr('x/8'), /Invalid IP/);
});

test('matches single IPs and ranges', () => {
  const match = ipMatcher(['10.0.0.0/8', '192.168.1.5', '2001:db8::/32']);
  assert.ok(match('10.200.3.4'));
  assert.ok(match('::ffff:10.0.0.1'));
  assert.ok(match('192.168.1.5'));
  assert.ok(!match('192.168.1.6'));
  assert.ok(match('2001:db8:abcd::1'));
  assert.ok(!match('2001:db9::1'));
  assert.ok(!match('11.0.0.1'));
  assert.ok(!match('garbage'));
});

test('a /0 range matches everything of that family', () => {
  const match = ipMatcher(['0.0.0.0/0']);
  assert.ok(match('8.8.8.8'));
  assert.ok(!match('::1'));
});
