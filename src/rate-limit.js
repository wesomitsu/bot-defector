// Counts requests per key in a sliding window, in memory.
// For several servers behind a load balancer, each server counts on its own.
export function createRateLimiter({ limit = 60, windowMs = 60_000, now = Date.now } = {}) {
  const hits = new Map();

  function prune(list, t) {
    while (list.length && list[0] <= t - windowMs) list.shift();
  }

  return {
    // Records a hit and says whether the key is over the limit.
    hit(key) {
      const t = now();
      const list = hits.get(key) ?? [];
      prune(list, t);
      list.push(t);
      hits.set(key, list);
      const retryAfterMs = list.length > limit ? list[list.length - limit - 1] + windowMs - t : 0;
      return { count: list.length, limited: list.length > limit, retryAfterMs };
    },
    // Drops keys with no recent hits so memory doesn't grow forever.
    sweep() {
      const t = now();
      for (const [key, list] of hits) {
        prune(list, t);
        if (!list.length) hits.delete(key);
      }
    },
    size: () => hits.size,
  };
}
