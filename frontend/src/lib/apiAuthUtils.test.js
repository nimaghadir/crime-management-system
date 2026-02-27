import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAuthResponse,
  normalizeRoles,
  pickRoleName,
} from "./apiAuthUtils.js";

test("normalizeRoles supports arrays and single strings", () => {
  assert.deepEqual(normalizeRoles([" detective ", "", null, "judge"]), ["detective", "judge"]);
  assert.deepEqual(normalizeRoles(" captain "), ["captain"]);
  assert.deepEqual(normalizeRoles(undefined), []);
});

test("pickRoleName uses stable priority order", () => {
  assert.equal(
    pickRoleName(
      {
        user: { role_name: "detective", role: "sergeant" },
        role_name: "judge",
      },
      ["captain"],
    ),
    "detective",
  );
  assert.equal(pickRoleName({}, ["captain"]), "captain");
});

test("normalizeAuthResponse maps token and user fields with context fallback", () => {
  const normalized = normalizeAuthResponse(
    {
      token: "abc-token",
      user_id: 12,
      roles: ["basic_user"],
    },
    {
      username: "test_user",
      email: "u@example.com",
      phone: "09120000000",
      national_id: "0011223344",
    },
  );

  assert.equal(normalized.access_token, "abc-token");
  assert.equal(normalized.user.id, 12);
  assert.equal(normalized.user.username, "test_user");
  assert.equal(normalized.user.email, "u@example.com");
  assert.equal(normalized.user.phone, "09120000000");
  assert.equal(normalized.user.phone_number, "09120000000");
  assert.equal(normalized.user.national_id, "0011223344");
  assert.equal(normalized.user.role_name, "basic_user");
  assert.deepEqual(normalized.user.roles, ["basic_user"]);
  assert.equal(normalized.mocked, false);
});
