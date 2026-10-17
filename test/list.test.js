import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadIpList, parseIpList } from '../src/list.js';

test('parses lines, skipping comments and blanks', () => {
  assert.deepEqual(parseIpList('# bad hosts\n203.0.113.0/24\n\n198.51.100.7  # scraper\r\n2001:db8::/32\n'), [
    '203.0.113.0/24',
    '198.51.100.7',
    '2001:db8::/32',
  ]);
});

test('reports the line of a bad entry', () => {
  assert.throws(() => parseIpList('1.2.3.4\nnot-an-ip\n'), /Line 2: Invalid IP/);
});

test('loads from a file', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'bd-')), 'block.txt');
  writeFileSync(file, '10.0.0.0/8\n');
  assert.deepEqual(loadIpList(file), ['10.0.0.0/8']);
});
