import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPath } from "./roleRouting.js";

test("roleRouting paths: basic user access boundaries", () => {
  assert.equal(canAccessPath("basic user", "/tips/submit"), true);
  assert.equal(canAccessPath("basic user", "/admin/console"), false);
  assert.equal(canAccessPath("basic user", "/cases"), false);
});

