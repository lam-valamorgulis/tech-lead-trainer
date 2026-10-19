import { describe, expect, it } from "vitest";
import { Outbox, type SendResult } from "./outbox.ts";

type Event = { clientEventId: string };
const events = (count: number, from = 0): Event[] =>
  Array.from({ length: count }, (_, i) => ({ clientEventId: `e${from + i}` }));

function fakeSend(results: SendResult[]) {
  const batches: Event[][] = [];
  const send = async (batch: Event[]) => {
    batches.push(batch);
    return results.shift() ?? "sent";
  };
  return { send, batches };
}

describe("Outbox", () => {
  it("sends events in batches of at most 100", async () => {
    const { send, batches } = fakeSend([]);
    const outbox = new Outbox<Event>(send);
    expect(await outbox.add(events(250))).toBe(true);
    expect(batches.map((b) => b.length)).toEqual([100, 100, 50]);
  });

  it("keeps events after a network failure and sends them with the next add", async () => {
    const { send, batches } = fakeSend(["retry"]);
    const outbox = new Outbox<Event>(send);
    expect(await outbox.add(events(2))).toBe(false);
    expect(await outbox.add(events(1, 2))).toBe(true);
    expect(batches.at(-1)!.map((e) => e.clientEventId)).toEqual(["e0", "e1", "e2"]);
  });

  it("drops a batch the server refused, so one bad event cannot block the rest for ever", async () => {
    const { send, batches } = fakeSend(["refused"]);
    const outbox = new Outbox<Event>(send);
    expect(await outbox.add(events(1))).toBe(false);
    await outbox.add(events(1, 1));
    expect(batches.at(-1)!.map((e) => e.clientEventId)).toEqual(["e1"]);
  });

  it("keeps at most 1000 waiting events, dropping the oldest", async () => {
    const { send, batches } = fakeSend(Array(20).fill("retry"));
    const outbox = new Outbox<Event>(send);
    await outbox.add(events(1200));
    expect(outbox.waitingCount()).toBe(1000);
    await outbox.add([]);
    expect(batches.at(-1)![0].clientEventId).toBe("e200");
  });

  it("sends one batch at a time, so two quick adds never lose an event", async () => {
    const sent: string[] = [];
    let first = true;
    const outbox = new Outbox<Event>(async (batch) => {
      if (first) {
        first = false;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return "retry";
      }
      sent.push(...batch.map((e) => e.clientEventId));
      return "sent";
    });
    const a = outbox.add(events(1));
    const b = outbox.add(events(1, 1));
    await Promise.all([a, b]);
    expect(sent.sort()).toEqual(["e0", "e1"]);
  });
});
