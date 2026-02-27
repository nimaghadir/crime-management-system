import assert from "node:assert/strict";
import test from "node:test";
import {
  mapCrimeLevelToLevel,
  mapLevelToCrimeLevel,
  normalizeOptionalId,
} from "./apiCaseUtils.js";

test("apiCaseUtils: mapLevelToCrimeLevel keeps existing crime-level tokens", () => {
  assert.equal(mapLevelToCrimeLevel("critical"), "critical");
  assert.equal(mapLevelToCrimeLevel("level_1"), "level_1");
  assert.equal(mapLevelToCrimeLevel("level_2"), "level_2");
  assert.equal(mapLevelToCrimeLevel("level_3"), "level_3");
});

test("apiCaseUtils: mapLevelToCrimeLevel maps numeric levels to backend format", () => {
  assert.equal(mapLevelToCrimeLevel(4), "critical");
  assert.equal(mapLevelToCrimeLevel(2), "level_2");
  assert.equal(mapLevelToCrimeLevel(1), "level_1");
  assert.equal(mapLevelToCrimeLevel(3), "level_3");
});

test("apiCaseUtils: mapCrimeLevelToLevel maps backend format to numeric level", () => {
  assert.equal(mapCrimeLevelToLevel("critical"), 4);
  assert.equal(mapCrimeLevelToLevel("level_1"), 1);
  assert.equal(mapCrimeLevelToLevel("level_2"), 2);
  assert.equal(mapCrimeLevelToLevel("level_3"), 3);
});

test("apiCaseUtils: normalizeOptionalId returns null for invalid ids", () => {
  assert.equal(normalizeOptionalId(""), null);
  assert.equal(normalizeOptionalId(0), null);
  assert.equal(normalizeOptionalId(-4), null);
  assert.equal(normalizeOptionalId("7"), 7);
});

