// Run with: node examples/server.js, then try:
//   curl http://localhost:3000/              -> 403 (curl is a bot user agent)
//   open http://localhost:3000/ in a browser -> Hello
import { createServer } from 'node:http';
import { botDefector } from '../src/index.js';

const defend = botDefector({
  blockIps: ['203.0.113.0/24'],
  onBlock: (v) => console.log(`blocked ${v.ip}: ${v.reason}`),
});

createServer((req, res) => {
  defend(req, res, () => res.end('Hello\n'));
}).listen(3000, () => console.log('http://localhost:3000'));
