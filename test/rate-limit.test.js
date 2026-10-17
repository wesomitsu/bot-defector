import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/rate-limit.js';

test('limits a key after too many hits in the window', () => {
  let t = 0;
  const rl = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
  assert.equal(rl.hit('a').limited, false);
  assert.equal(rl.hit('a').limited, false);
  assert.equal(rl.hit('a').limited, false);
  t = 400;
  const fourth = rl.hit('a');
  assert.equal(fourth.limited, true);
  assert.equal(fourth.retryAfterMs, 600);
  assert.equal(rl.hit('b').limited, false);
});

test('the window slides', () => {
  let t = 0;
  const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
  rl.hit('a');
  rl.hit('a');
  t = 1000;
  assert.equal(rl.hit('a').limited, false);
});

test('sweep forgets idle keys', () => {
  let t = 0;
  const rl = createRateLimiter({ limit: 5, windowMs: 100, now: () => t });
  rl.hit('a');
  rl.hit('b');
  t = 50;
  rl.hit('b');
  t = 120;
  rl.sweep();
  assert.equal(rl.size(), 1);
});
