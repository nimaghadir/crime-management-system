import assert from "node:assert/strict";
import test from "node:test";
import { getHomePathForRole } from "./roleRouting.js";

test("roleRouting home: resolves home page by role", () => {
  assert.equal(getHomePathForRole("detective"), "/board");
  assert.equal(getHomePathForRole("sergeant"), "/interrogation");
  assert.equal(getHomePathForRole("system admin"), "/admin/console");
});

