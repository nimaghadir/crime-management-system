import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCaseCreatePayloadCandidates,
  buildRegisterPayloadCandidates,
} from "./apiPayloadUtils.js";

test("buildCaseCreatePayloadCandidates keeps full and minimal variants", () => {
  const [full, minimal] = buildCaseCreatePayloadCandidates({
    title: " Theft ",
    description: " Stolen bike ",
    level: 3,
    creation_method: "crime_scene",
    location: " Tehran ",
    incident_datetime: "2026-02-01T09:30:00Z",
    witnesses: [{ user_id: 7 }],
  });

  assert.deepEqual(full, {
    title: "Theft",
    description: "Stolen bike",
    crime_level: "level_3",
    creation_method: "crime_scene",
    location: "Tehran",
    incident_datetime: "2026-02-01T09:30:00Z",
    witnesses: [{ user_id: 7 }],
  });

  assert.deepEqual(minimal, {
    title: "Theft",
    crime_level: "level_3",
    creation_method: "crime_scene",
    location: "Tehran",
    incident_datetime: "2026-02-01T09:30:00Z",
    witnesses: [{ user_id: 7 }],
  });
});

test("buildRegisterPayloadCandidates returns backend-first and fallback payloads", () => {
  const [primaryBackend, fallbackPayload] = buildRegisterPayloadCandidates({
    username: " new_user ",
    password: "pass123",
    email: "mail@example.com",
    phone: "09123334455",
    first_name: "Ali",
    last_name: "Karimi",
    national_id: "1234567890",
  });

  assert.deepEqual(primaryBackend, {
    username: "new_user",
    password: "pass123",
    email: "mail@example.com",
    phone_number: "09123334455",
    national_id: "1234567890",
  });

  assert.deepEqual(fallbackPayload, {
    username: "new_user",
    password: "pass123",
    email: "mail@example.com",
    phone: "09123334455",
    first_name: "Ali",
    last_name: "Karimi",
    national_id: "1234567890",
  });
});
