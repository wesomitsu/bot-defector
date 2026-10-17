import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkUserAgent } from '../src/user-agent.js';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

test('lets normal browsers through', () => {
  assert.deepEqual(checkUserAgent(CHROME), { bot: false, reason: null });
});

test('flags empty and tool user agents', () => {
  assert.equal(checkUserAgent('').reason, 'empty user agent');
  assert.equal(checkUserAgent(undefined).bot, true);
  assert.equal(checkUserAgent('curl/8.5.0').reason, 'blocked agent: curl');
  assert.equal(checkUserAgent('python-requests/2.32').bot, true);
  assert.equal(checkUserAgent('Mozilla/5.0 HeadlessChrome/120.0').bot, true);
});

test('lets search engines through', () => {
  const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
  assert.equal(checkUserAgent(ua).bot, false);
});

test('custom lists replace the defaults', () => {
  assert.equal(checkUserAgent('curl/8', { block: ['wget'] }).bot, false);
  assert.equal(checkUserAgent('MyCrawler/1.0', { block: ['mycrawler'] }).bot, true);
  assert.equal(checkUserAgent('curl/8 (friendly-monitor)', { allow: ['friendly-monitor'] }).bot, false);
});
