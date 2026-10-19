// Holds learning events until the server has them (spec story 99: a retry is always safe).

/** "retry": keep the batch and try again later. "refused": the server will never accept it. */
export type SendResult = "sent" | "retry" | "refused";

/** The endpoint accepts at most 100 events per request. */
export const BATCH_LIMIT = 100;
/** About 16 hours of 60-second snapshots. Older events are dropped first. */
export const WAITING_LIMIT = 1000;

export class Outbox<E, Options = undefined> {
  private waiting: E[] = [];
  private running: Promise<unknown> = Promise.resolve();

  constructor(private readonly send: (batch: E[], options?: Options) => Promise<SendResult>) {}

  waitingCount(): number {
    return this.waiting.length;
  }

  /** Adds events and sends everything that waits. Resolves true when nothing is left waiting. */
  add(events: E[], options?: Options): Promise<boolean> {
    this.waiting.push(...events);
    if (this.waiting.length > WAITING_LIMIT) this.waiting.splice(0, this.waiting.length - WAITING_LIMIT);
    // One send at a time, so two quick calls never overwrite each other's events.
    const run = this.running.then(() => this.flush(options));
    this.running = run.catch(() => undefined);
    return run;
  }

  private async flush(options?: Options): Promise<boolean> {
    let allSent = true;
    while (this.waiting.length > 0) {
      const batch = this.waiting.slice(0, BATCH_LIMIT);
      const result = await this.send(batch, options).catch((): SendResult => "retry");
      if (result === "retry") return false;
      if (result === "refused") allSent = false;
      const done = new Set(batch);
      this.waiting = this.waiting.filter((event) => !done.has(event));
    }
    return allSent;
  }
}
