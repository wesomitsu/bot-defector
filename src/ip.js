import { isIP } from 'node:net';

// Turns an IPv4 or IPv6 address into a BigInt plus its bit length.
// IPv4-mapped IPv6 addresses (::ffff:1.2.3.4) are treated as IPv4.
export function parseIp(ip) {
  let value = String(ip).trim();
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) value = mapped[1];

  const version = isIP(value);
  if (version === 4) {
    const n = value.split('.').reduce((acc, part) => (acc << 8n) + BigInt(Number(part)), 0n);
    return { bits: 32, value: n };
  }
  if (version === 6) {
    // An embedded IPv4 tail (e.g. 64:ff9b::1.2.3.4) counts as two groups.
    const v4 = value.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
    if (v4) {
      const n = parseIp(v4[2]).value;
      value = `${v4[1]}${(n >> 16n).toString(16)}:${(n & 0xffffn).toString(16)}`;
    }
    let parts = value.split(':');
    const gap = value.indexOf('::');
    if (gap >= 0) {
      const head = gap === 0 ? [] : value.slice(0, gap).split(':');
      const tail = gap + 2 === value.length ? [] : value.slice(gap + 2).split(':');
      parts = [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail];
    }
    const n = parts.reduce((acc, part) => (acc << 16n) + BigInt(parseInt(part || '0', 16)), 0n);
    return { bits: 128, value: n };
  }
  return null;
}

// Parses "1.2.3.4", "10.0.0.0/8" or "2001:db8::/32" into a matcher range.
export function parseCidr(entry) {
  const [addr, prefixRaw] = String(entry).trim().split('/');
  const ip = parseIp(addr);
  if (!ip) throw new Error(`Invalid IP or CIDR: "${entry}"`);
  const prefix = prefixRaw === undefined ? ip.bits : Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > ip.bits) throw new Error(`Invalid CIDR prefix: "${entry}"`);
  const shift = BigInt(ip.bits - prefix);
  return { bits: ip.bits, prefix, start: (ip.value >> shift) << shift, shift };
}

// Builds a fast "is this IP in any of these ranges?" check.
export function ipMatcher(entries = []) {
  const ranges = entries.map(parseCidr);
  return (ip) => {
    const parsed = parseIp(ip);
    if (!parsed) return false;
    return ranges.some((r) => r.bits === parsed.bits && (parsed.value >> r.shift) << r.shift === r.start);
  };
}
