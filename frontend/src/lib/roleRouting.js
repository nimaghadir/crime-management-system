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

export function isSystemAdminRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["system admin", "super admin", "superuser", "super user", "chief", "admin"]);
}

export function isComplainantRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["complainant", "citizen", "plaintiff", "reporter", "shaki"]);
}

export function isOfficerRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["officer", "patrol"]);
}

export function isDetectiveBoardRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["detective", "sergeant", "captain"]);
}

export function isPoliceRole(roleName) {
  const role = normalizeRole(roleName);
  return hasAny(role, ["detective", "sergeant", "captain", "officer", "patrol", "police"]);
}

export function getHomePathForRole(roleName) {
  if (isSystemAdminRole(roleName)) return "/admin/console";
  if (isComplainantRole(roleName)) return "/complaint";
  if (isDetectiveBoardRole(roleName)) return "/board";
  if (isOfficerRole(roleName) || isPoliceRole(roleName)) return "/dashboard";
  return "/dashboard";
}
