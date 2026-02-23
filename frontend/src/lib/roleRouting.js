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
    "basic user",
    "shaki",
  ]);
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
  return hasAny(role, ["detective", "sergeant", "captain"]);
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

function getAllowedRoutePrefixes(roleName) {
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
    return [
      "/home",
      "/dashboard",
      "/cases",
      "/complaint",
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
      "/interrogation",
      "/suspect-referrals",
      "/evidence-review",
      "/notifications",
      "/profile",
    ];
  }

  if (isCaptainRole(roleName)) {
    return [
      "/home",
      "/board",
      "/cases",
      "/interrogation",
      "/reports",
      "/notifications",
      "/profile",
    ];
  }

  if (isSergeantRole(roleName)) {
    return [
      "/home",
      "/board",
      "/cases",
      "/interrogation",
      "/notifications",
      "/profile",
    ];
  }

  if (isOfficerRole(roleName) || isCadetRole(roleName) || isPoliceRole(roleName)) {
    return [
      "/home",
      "/cases",
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

  const allowedPrefixes = getAllowedRoutePrefixes(roleName);
  return allowedPrefixes.some((prefix) => pathMatchesPrefix(path, prefix));
}

export function getHomePathForRole(roleName) {
  if (isSystemAdminRole(roleName)) return "/admin/console";
  if (isComplainantRole(roleName)) return "/dashboard";
  if (isJudgeRole(roleName)) return "/cases";
  if (isChiefRole(roleName) || isCaptainRole(roleName)) return "/reports";
  if (isDetectiveBoardRole(roleName)) return "/board";
  return "/cases";
}
