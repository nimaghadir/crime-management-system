function normalizeRoles(input) {
  if (Array.isArray(input)) {
    return input.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof input === "string" && input.trim()) {
    return [input.trim()];
  }
  return [];
}

function pickRoleName(data, roles = []) {
  const candidates = [
    data?.user?.role_name,
    data?.user?.role,
    data?.role_name,
    roles[0],
  ];
  return String(candidates.find((item) => String(item || "").trim()) || "");
}

function normalizeAuthResponse(data, context = {}) {
  const roles = normalizeRoles(data?.roles || data?.user?.roles || data?.user?.role_names);
  const roleName = pickRoleName(data, roles);
  const token = String(data?.access_token || data?.token || "").trim();
  const userData = data?.user && typeof data.user === "object" ? data.user : {};

  const user = {
    ...userData,
    id: userData?.id ?? data?.user_id ?? null,
    username: String(
      userData?.username ||
        data?.username ||
        context?.username ||
        context?.identifier ||
        "",
    ).trim(),
    email: String(userData?.email || context?.email || "").trim(),
    phone: String(userData?.phone || userData?.phone_number || context?.phone || "").trim(),
    national_id: String(userData?.national_id || context?.national_id || "").trim(),
    role_name: roleName,
    roles,
  };

  if (!user.phone_number && user.phone) {
    user.phone_number = user.phone;
  }

  return {
    ...data,
    access_token: token,
    user,
    mocked: false,
  };
}

export {
  normalizeRoles,
  pickRoleName,
  normalizeAuthResponse,
};
