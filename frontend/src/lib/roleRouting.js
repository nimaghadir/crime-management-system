function normalizeRole(roleName) {
  return String(roleName || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function hasAny(role, keywords) {
  return keywords.some((keyword) => role.includes(keyword));
}

function normalizePath(path) {
  const raw = String(path || "").trim();
  if (!raw) return "/";
  const withoutQuery = raw.split("?")[0].split("#")[0].trim();
  if (!withoutQuery) return "/";
  return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
}

function pathMatchesPrefix(path, prefix) {
  if (path === prefix) return true;
  return path.startsWith(`${prefix}/`);
}

export function isSystemAdminRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["system admin", "super admin", "superuser", "super user", "administrator", "admin"]);
}

export function isComplainantRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, [
    "complainant",
    "citizen",
    "plaintiff",
    "reporter",
    "witness",
    "suspect",
    "shaki",
  ]);
}

export function isBasicUserRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["basic user", "ordinary user", "normal user"]);
}

export function isOfficerRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["officer", "patrol"]);
}

export function isCadetRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["cadet", "intern"]);
}

export function isDetectiveRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["detective"]);
}

export function isSergeantRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["sergeant"]);
}

export function isCaptainRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["captain"]);
}

export function isChiefRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["police chief", "chief of police", "chief"]);
}

export function isJudgeRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["judge", "qazi"]);
}

export function isReportReviewerRole(roleName) {
  return isJudgeRole(roleName) || isCaptainRole(roleName) || isChiefRole(roleName);
}

export function isDetectiveBoardRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["detective", "sergeant"]);
}

export function isPoliceRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, [
    "detective",
    "sergeant",
    "captain",
    "officer",
    "patrol",
    "cadet",
    "intern",
    "police",
  ]);
}

export function isCoronerRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["coroner", "forensic", "medical examiner"]);
}

export function isPoliceRankRole(roleName) {
  return (
    isCadetRole(roleName) ||
    isOfficerRole(roleName) ||
    isDetectiveRole(roleName) ||
    isSergeantRole(roleName) ||
    isCaptainRole(roleName) ||
    isChiefRole(roleName)
  );
}

function getAllowedRoutePrefixes(roleName) {
  if (isBasicUserRole(roleName)) {
    return [
      "/home",
      "/dashboard",
      "/tips/submit",
      "/notifications",
      "/profile",
    ];
  }

  if (isSystemAdminRole(roleName)) {
    return [
      "/home",
      "/admin/console",
      "/admin/roles",
      "/admin/case-queues",
      "/cases",
      "/notifications",
      "/profile",
    ];
  }

  if (isComplainantRole(roleName)) {
    const base = [
      "/home",
      "/dashboard",
      "/cases",
      "/complaint",
      "/notifications",
      "/profile",
    ];
    return base;
  }

  if (isCoronerRole(roleName)) {
    return [
      "/home",
      "/cases",
      "/forensic-review",
      "/notifications",
      "/profile",
    ];
  }

  if (isJudgeRole(roleName)) {
    return [
      "/home",
      "/cases",
      "/reports",
      "/notifications",
      "/profile",
    ];
  }

  if (isChiefRole(roleName)) {
    return [
      "/home",
      "/cases",
      "/crime-scene-case",
      "/interrogation",
      "/reports",
      "/notifications",
      "/profile",
    ];
  }

  if (isDetectiveRole(roleName)) {
    return [
      "/home",
      "/board",
      "/cases",
      "/crime-scene-case",
      "/interrogation",
      "/suspect-referrals",
      "/evidence-review",
      "/tips/detective-review",
      "/rewards/lookup",
      "/notifications",
      "/profile",
    ];
  }

  if (isCaptainRole(roleName)) {
    return [
      "/home",
      "/cases",
      "/crime-scene-case",
      "/interrogation",
      "/reports",
      "/rewards/lookup",
      "/notifications",
      "/profile",
    ];
  }

  if (isSergeantRole(roleName)) {
    return [
      "/home",
      "/board",
      "/cases",
      "/crime-scene-case",
      "/interrogation",
      "/rewards/lookup",
      "/notifications",
      "/profile",
    ];
  }

  if (isOfficerRole(roleName)) {
    return [
      "/home",
      "/cases",
      "/crime-scene-case",
      "/tips/officer-review",
      "/rewards/lookup",
      "/notifications",
      "/profile",
    ];
  }

  if (isCadetRole(roleName)) {
    return [
      "/home",
      "/cases",
      "/tips/officer-review",
      "/rewards/lookup",
      "/notifications",
      "/profile",
    ];
  }

  if (isPoliceRole(roleName)) {
    return [
      "/home",
      "/cases",
      "/crime-scene-case",
      "/tips/officer-review",
      "/rewards/lookup",
      "/notifications",
      "/profile",
    ];
  }

  return [
    "/home",
    "/cases",
    "/notifications",
    "/profile",
  ];
}

export function canAccessPath(roleName, targetPath) {
  const path = normalizePath(targetPath);
  if (path === "/" || path === "/app") return true;
  if (pathMatchesPrefix(path, "/intense-tracking")) return true;

  const allowedPrefixes = getAllowedRoutePrefixes(roleName);
  return allowedPrefixes.some((prefix) => pathMatchesPrefix(path, prefix));
}

export function getHomePathForRole(roleName) {
  if (isSystemAdminRole(roleName)) return "/admin/console";
  if (isBasicUserRole(roleName)) return "/tips/submit";
  if (isComplainantRole(roleName)) return "/dashboard";
  if (isCoronerRole(roleName)) return "/forensic-review";
  if (isJudgeRole(roleName)) return "/cases";
  if (isChiefRole(roleName) || isCaptainRole(roleName)) return "/reports";
  if (isSergeantRole(roleName)) return "/interrogation";
  if (isDetectiveBoardRole(roleName)) return "/board";
  return "/cases";
}
