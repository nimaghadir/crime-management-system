import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessPath,
  getHomePathForRole,
  isBasicUserRole,
  isComplainantRole,
  isDetectiveRole,
  isReportReviewerRole,
  isSystemAdminRole,
} from "./roleRouting.js";

test("roleRouting: detects system admin role variants", () => {
  assert.equal(isSystemAdminRole("System Admin"), true);
  assert.equal(isSystemAdminRole("super_user"), true);
  assert.equal(isSystemAdminRole("complainant"), false);
});

test("roleRouting: detects complainant and basic user roles", () => {
  assert.equal(isComplainantRole("complainant"), true);
  assert.equal(isBasicUserRole("basic-user"), true);
  assert.equal(isComplainantRole("detective"), false);
});

test("roleRouting: detects detective role", () => {
  assert.equal(isDetectiveRole("Detective"), true);
  assert.equal(isDetectiveRole("captain"), false);
});

test("roleRouting: builds correct home paths by role", () => {
  assert.equal(getHomePathForRole("system admin"), "/admin/console");
  assert.equal(getHomePathForRole("basic user"), "/tips/submit");
  assert.equal(getHomePathForRole("judge"), "/cases");
  assert.equal(getHomePathForRole("captain"), "/reports");
});

test("roleRouting: allows or blocks paths based on role", () => {
  assert.equal(canAccessPath("basic user", "/tips/submit"), true);
  assert.equal(canAccessPath("basic user", "/cases"), false);
  assert.equal(canAccessPath("detective", "/board"), true);
  assert.equal(canAccessPath("detective", "/admin/users"), false);
});

test("roleRouting: recognizes report reviewer roles", () => {
  assert.equal(isReportReviewerRole("judge"), true);
  assert.equal(isReportReviewerRole("captain"), true);
  assert.equal(isReportReviewerRole("police chief"), true);
  assert.equal(isReportReviewerRole("officer"), false);
});
