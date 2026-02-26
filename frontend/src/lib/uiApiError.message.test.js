import assert from "node:assert/strict";
import test from "node:test";
import { formatUiApiError } from "./uiApiError.js";

test("uiApiError message: returns fallback for unknown errors", () => {
  assert.equal(formatUiApiError({}, "Fallback"), "Fallback");
  assert.equal(formatUiApiError("", "Fallback"), "Fallback");
});

