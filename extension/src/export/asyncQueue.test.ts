import { describe, expect, it } from "vitest";
import { createAsyncQueue } from "./asyncQueue";

describe("createAsyncQueue", () => {
  it("runs tasks in order without overlapping", async () => {
    const enqueue = createAsyncQueue();
    const order: number[] = [];
    const first = enqueue(async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push(1);
      return "a";
    });
    const second = enqueue(async () => {
      order.push(2);
      return "b";
    });
    await expect(Promise.all([first, second])).resolves.toEqual(["a", "b"]);
    expect(order).toEqual([1, 2]);
  });
});
