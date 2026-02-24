export function isMissingBackendApiError(error) {
  return error && typeof error === "object" && error.code === "BACKEND_API_NOT_IMPLEMENTED";
}

function formatMissingEndpoints(endpoints) {
  const rows = Array.isArray(endpoints) ? endpoints.filter(Boolean) : [];
  if (!rows.length) return "";
  return ` Missing endpoint: ${rows.join(", ")}`;
}

export function formatUiApiError(error, fallbackMessage = "Request failed.") {
  if (isMissingBackendApiError(error)) {
    const feature = error.feature ? ` (${error.feature})` : "";
    return `${fallbackMessage} This feature is not available yet because the backend API is not implemented${feature}.${formatMissingEndpoints(error.endpoints)}`;
  }

  if (error instanceof Error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallbackMessage;
}
