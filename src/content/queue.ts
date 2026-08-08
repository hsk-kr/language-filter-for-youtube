// Sequential action queue: "Not interested" clicks open a shared global menu
// popup, so they must never overlap — one at a time with a gap between.

const GAP_BETWEEN_ACTIONS_MS = 700;

export interface ActionQueue {
  readonly push: (job: () => Promise<void>) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createQueue(): ActionQueue {
  const jobs: Array<() => Promise<void>> = [];
  let running = false;

  async function run(): Promise<void> {
    if (running) return;
    running = true;
    while (jobs.length > 0) {
      const job = jobs.shift();
      if (job) {
        try {
          await job();
        } catch (err) {
          console.warn("[Language Filter] Queued action failed:", err);
        }
        await sleep(GAP_BETWEEN_ACTIONS_MS);
      }
    }
    running = false;
  }

  return Object.freeze({
    push(job: () => Promise<void>): void {
      jobs.push(job);
      void run();
    },
  });
}
