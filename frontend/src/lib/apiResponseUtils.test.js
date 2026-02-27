import test from "node:test";
import assert from "node:assert/strict";
import { extractError, normalizeListResponse } from "./apiResponseUtils.js";

test("extractError handles common backend error shapes", () => {
  assert.equal(extractError(null), "Request failed");
  assert.equal(extractError("simple error"), "simple error");
  assert.equal(extractError({ detail: "Forbidden" }), "Forbidden");
  assert.equal(extractError({ message: "Invalid input" }), "Invalid input");
  assert.equal(extractError({ username: ["already exists"] }), "username: already exists");
  assert.equal(extractError({ username: "required" }), "username: required");
});

test("normalizeListResponse supports array and paginated shape", () => {
  assert.deepEqual(normalizeListResponse([1, 2, 3]), [1, 2, 3]);
  assert.deepEqual(normalizeListResponse({ results: [4, 5] }), [4, 5]);
  assert.deepEqual(normalizeListResponse({}), []);
});
