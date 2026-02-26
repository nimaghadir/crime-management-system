import assert from "node:assert/strict";
import test from "node:test";
import { getNotificationMeta } from "./notificationMeta.js";

test("notificationMeta: resolves case label and default case link", () => {
  const meta = getNotificationMeta({ related_case_id: 42 });
  assert.equal(meta.label, "Case #42");
  assert.equal(meta.link, "/cases/42");
});

test("notificationMeta: prefers explicit target path", () => {
  const meta = getNotificationMeta({
    related_case_id: 7,
    target_path: "/cases/7/logs",
  });
  assert.equal(meta.label, "Case #7");
  assert.equal(meta.link, "/cases/7/logs");
});

test("notificationMeta: supports generic links without case id", () => {
  const meta = getNotificationMeta({ link: "/reports?case=2" });
  assert.equal(meta.label, "Open notification target");
  assert.equal(meta.link, "/reports?case=2");
});

test("notificationMeta: returns empty meta when no navigation target exists", () => {
  const meta = getNotificationMeta({});
  assert.equal(meta.label, "");
  assert.equal(meta.link, "");
});

