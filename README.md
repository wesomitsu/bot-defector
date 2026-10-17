# bot-defector

Simple bot detection and IP blocking for Node.js websites. One middleware,
no dependencies, nothing to sign up for and no API keys.

It blocks:
- **Bot user agents**: `curl`, `python-requests`, headless browsers, SEO scrapers and similar, while letting search engines and link previews through
- **Blocked IPs and ranges**: single IPs or CIDR ranges, IPv4 and IPv6
- **Trap paths**: an IP that asks for `/wp-login.php`, `/.env` and the like is banned for an hour
- **Too many requests**: 120 per minute per IP by default, answered with `429` and `Retry-After`

## Install

```sh
npm install github:wesomitsu/bot-defector
```

## Express

```js
import express from 'express';
import { botDefector } from 'bot-defector';

const app = express();
app.use(botDefector());
```

## Plain Node

```js
import { createServer } from 'node:http';
import { botDefector } from 'bot-defector';

const defend = botDefector();
createServer((req, res) => defend(req, res, () => res.end('Hello'))).listen(3000);
```

See [`examples/server.js`](examples/server.js) for a runnable version.

## Options

```js
botDefector({
  allowIps: ['10.0.0.0/8'],          // never blocked (your office, monitoring)
  blockIps: ['203.0.113.0/24'],      // always blocked
  trustProxy: false,                 // true if you're behind Nginx, Cloudflare, a load balancer...
  userAgents: true,                  // false to skip, or { block: [...], allow: [...] } to use your own lists
  rateLimit: { limit: 120, windowMs: 60_000 }, // false to turn off
  requireBrowserHeaders: false,      // true: block requests without Accept + Accept-Language (not for APIs)
  traps: ['/wp-login.php', '/.env'], // [] to turn off
  banMs: 60 * 60_000,                // how long a trap ban lasts
  onBlock: (verdict, req) => console.log(verdict), // { ip, status, reason }
  respond: (verdict, req, res) => res.status(verdict.status).json({ error: 'blocked' }), // optional custom page/JSON
});
```

The returned middleware also has:
- `check(req)`: returns `null` or the verdict, without sending a response
- `unban(ip)`: lifts a trap ban
- `stats()`: counts so far, like `{ allowed: 120, blocked: 7, reasons: { 'blocked agent': 5, trap: 2 } }`

## Lists in a file

Keep long lists in a text file, one IP or range per line, with `#` comments:

```text
# blocklist.txt
203.0.113.0/24   # scraper network
198.51.100.7
```

```js
import { botDefector, loadIpList } from 'bot-defector';

app.use(botDefector({ blockIps: loadIpList('./blocklist.txt') }));
```

## Behind a proxy

If your site runs behind Nginx, Cloudflare or a load balancer, every request
looks like it comes from the proxy. Set `trustProxy: true` so the client IP is
read from `X-Forwarded-For`. Only do this behind a proxy you control, because
anyone can send that header otherwise.

## Limits

- User agents are easy to fake. This stops lazy and honest bots, not determined ones.
- Bans and rate limits are kept in memory, per process. They reset on restart,
  and each server counts on its own when you run several.

## TypeScript

Types are included (`src/index.d.ts`), no `@types` package needed.

## Development

```sh
npm test
```

## License

MIT
