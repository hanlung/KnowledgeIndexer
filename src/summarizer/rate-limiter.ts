export interface RateLimiter {
  acquire(): Promise<void>;
}

export function createRateLimiter(requestsPerMinute: number): RateLimiter {
  const intervalMs = (60 * 1000) / requestsPerMinute;
  const pendingQueue: Array<() => void> = [];
  let lastRequestTime = 0;
  let processing = false;

  async function processQueue(): Promise<void> {
    if (processing) return;
    processing = true;

    while (pendingQueue.length > 0) {
      const waitTime = Math.max(0, intervalMs - (Date.now() - lastRequestTime));
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      lastRequestTime = Date.now();
      const resolve = pendingQueue.shift();
      resolve?.();
    }

    processing = false;
  }

  return {
    acquire(): Promise<void> {
      return new Promise((resolve) => {
        pendingQueue.push(resolve);
        void processQueue();
      });
    },
  };
}
