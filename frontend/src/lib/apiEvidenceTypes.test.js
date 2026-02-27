import test from "node:test";
import assert from "node:assert/strict";
import {
  EVIDENCE_TYPES,
  evidenceListPathByType,
  normalizeEvidenceType,
} from "./apiEvidenceTypes.js";

test("normalizeEvidenceType accepts known types and rejects unknown values", () => {
  assert.equal(normalizeEvidenceType(" testimony "), EVIDENCE_TYPES.TESTIMONY);
  assert.equal(normalizeEvidenceType("BIO_MEDICAL"), EVIDENCE_TYPES.BIO_MEDICAL);
  assert.equal(normalizeEvidenceType("other"), EVIDENCE_TYPES.OTHER);
  assert.equal(normalizeEvidenceType("unknown"), "");
  assert.equal(normalizeEvidenceType(null), "");
});

test("evidenceListPathByType maps evidence types to backend endpoints", () => {
  assert.equal(evidenceListPathByType(EVIDENCE_TYPES.TESTIMONY), "/evidence/testimony/");
  assert.equal(evidenceListPathByType(EVIDENCE_TYPES.BIO_MEDICAL), "/evidence/biological/");
  assert.equal(evidenceListPathByType(EVIDENCE_TYPES.VEHICLE), "/evidence/vehicle/");
  assert.equal(evidenceListPathByType(EVIDENCE_TYPES.IDENTITY), "/evidence/identification-document/");
  assert.equal(evidenceListPathByType(EVIDENCE_TYPES.OTHER), "/evidence/other/");
});
