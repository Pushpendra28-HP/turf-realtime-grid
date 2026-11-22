// Tiny token bucket, one per socket. take() returns false when the caller is spamming.
export function createLimiter({ capacity, refillPerSec }) {
  let tokens = capacity;
  let last = Date.now();

  return function take() {
    const t = Date.now();
    tokens = Math.min(capacity, tokens + ((t - last) / 1000) * refillPerSec);
    last = t;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}
