// Tools and scrapers that rarely come from real visitors. Matched case-insensitively.
export const BAD_AGENTS = [
  'curl', 'wget', 'python-requests', 'python-urllib', 'aiohttp', 'httpx', 'go-http-client', 'java/',
  'okhttp', 'libwww-perl', 'scrapy', 'httpclient', 'node-fetch', 'axios', 'headlesschrome', 'phantomjs',
  'selenium', 'puppeteer', 'playwright', 'zgrab', 'masscan', 'nmap', 'nikto', 'sqlmap', 'semrushbot',
  'ahrefsbot', 'mj12bot', 'dotbot', 'petalbot', 'bytespider', 'gptbot', 'ccbot',
];

// Search engines and link previews you usually want to let through.
export const GOOD_AGENTS = [
  'googlebot', 'bingbot', 'duckduckbot', 'yandexbot', 'applebot', 'baiduspider', 'slurp',
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'slackbot', 'discordbot', 'whatsapp', 'telegrambot',
];

// Returns { bot: boolean, reason } for a User-Agent header.
// Note: a User-Agent is easy to fake, so this only catches honest or lazy bots.
export function checkUserAgent(ua, { block = BAD_AGENTS, allow = GOOD_AGENTS } = {}) {
  const value = String(ua ?? '').toLowerCase().trim();
  if (!value) return { bot: true, reason: 'empty user agent' };
  const allowed = allow.find((a) => value.includes(a.toLowerCase()));
  if (allowed) return { bot: false, reason: `allowed agent: ${allowed}` };
  const blocked = block.find((b) => value.includes(b.toLowerCase()));
  if (blocked) return { bot: true, reason: `blocked agent: ${blocked}` };
  return { bot: false, reason: null };
}
