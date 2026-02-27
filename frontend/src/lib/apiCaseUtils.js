export function mapLevelToCrimeLevel(level) {
  const raw = String(level || "").trim().toLowerCase();
  if (["critical", "level_1", "level_2", "level_3"].includes(raw)) return raw;
  const numeric = Number(level);
  if (numeric === 4) return "critical";
  if (numeric === 2) return "level_2";
  if (numeric === 1) return "level_1";
  return "level_3";
}

export function mapCrimeLevelToLevel(crimeLevel) {
  const raw = String(crimeLevel || "").trim().toLowerCase();
  if (raw === "critical") return 4;
  if (raw === "level_1") return 1;
  if (raw === "level_2") return 2;
  if (raw === "level_3") return 3;
  const numeric = Number(crimeLevel);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return 3;
}

export function normalizeOptionalId(value) {
  const numeric = Number(value);
  return numeric > 0 ? numeric : null;
}
