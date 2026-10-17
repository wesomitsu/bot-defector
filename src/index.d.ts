import type { IncomingMessage, ServerResponse } from 'node:http';

export interface Verdict {
  ip: string;
  status: 403 | 429;
  reason: string;
  retryAfterMs?: number;
}

export interface Stats {
  allowed: number;
  blocked: number;
  reasons: Record<string, number>;
}

export interface Options {
  allowIps?: string[];
  blockIps?: string[];
  trustProxy?: boolean;
  userAgents?: boolean | { block?: string[]; allow?: string[] };
  rateLimit?: false | { limit?: number; windowMs?: number };
  requireBrowserHeaders?: boolean;
  traps?: string[];
  banMs?: number;
  onBlock?: (verdict: Verdict, req: IncomingMessage) => void;
  respond?: ((verdict: Verdict, req: IncomingMessage, res: ServerResponse) => void) | null;
}

export interface BotDefector {
  (req: IncomingMessage, res: ServerResponse, next?: (err?: unknown) => void): void;
  check(req: IncomingMessage): Verdict | null;
  unban(ip: string): boolean;
  stats(): Stats;
}

export function botDefector(options?: Options): BotDefector;
export function clientIp(req: IncomingMessage, trustProxy?: boolean): string;
export function checkUserAgent(
  ua: string | undefined,
  lists?: { block?: string[]; allow?: string[] },
): { bot: boolean; reason: string | null };
export const BAD_AGENTS: string[];
export const GOOD_AGENTS: string[];
export function ipMatcher(entries?: string[]): (ip: string) => boolean;
export function parseIp(ip: string): { bits: 32 | 128; value: bigint } | null;
export function createRateLimiter(options?: { limit?: number; windowMs?: number; now?: () => number }): {
  hit(key: string): { count: number; limited: boolean; retryAfterMs: number };
  sweep(): void;
  size(): number;
};
export function parseIpList(text: string): string[];
export function loadIpList(path: string): string[];
