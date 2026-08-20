import assert from "node:assert/strict";
import { test } from "node:test";
import { add, multiply } from "./math.js";

test("add sums two numbers", () => {
  assert.equal(add(2, 3), 5);
});

test("multiply multiplies two numbers", () => {
  assert.equal(multiply(4, 5), 20);
});
