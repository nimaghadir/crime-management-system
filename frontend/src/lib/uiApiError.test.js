import assert from "node:assert/strict";
import test from "node:test";
import { formatUiApiError, isMissingBackendApiError } from "./uiApiError.js";

test("uiApiError: identifies missing backend API errors", () => {
  const error = { code: "BACKEND_API_NOT_IMPLEMENTED" };
  assert.equal(isMissingBackendApiError(error), true);
  assert.equal(isMissingBackendApiError({ code: "OTHER_ERROR" }), false);
});

test("uiApiError: formats backend-missing message with endpoints", () => {
  const error = {
    code: "BACKEND_API_NOT_IMPLEMENTED",
    feature: "listTags",
    endpoints: ["/api/tags/"],
  };
  const message = formatUiApiError(error, "Request failed.");
  assert.equal(message.includes("Request failed."), true);
  assert.equal(message.includes("listTags"), true);
  assert.equal(message.includes("/api/tags/"), true);
});

test("uiApiError: prefers native Error messages", () => {
  const message = formatUiApiError(new Error("Boom"), "Fallback");
  assert.equal(message, "Boom");
});

test("uiApiError: falls back to generic message when input is empty", () => {
  assert.equal(formatUiApiError(null, "Fallback text"), "Fallback text");
  assert.equal(formatUiApiError(undefined, "Fallback text"), "Fallback text");
});
