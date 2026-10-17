import { readFileSync } from 'node:fs';
import { parseCidr } from './ip.js';

// Reads a plain-text list of IPs/CIDRs: one per line, # starts a comment.
// Throws with the line number if an entry is invalid.
export function parseIpList(text) {
  const entries = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) return;
    try {
      parseCidr(line);
    } catch (err) {
      throw new Error(`Line ${i + 1}: ${err.message}`);
    }
    entries.push(line);
  });
  return entries;
}

export function loadIpList(path) {
  return parseIpList(readFileSync(path, 'utf8'));
}
