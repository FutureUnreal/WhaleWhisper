type HealthResponse = {
  ok: boolean;
  status_code?: number | null;
  message?: string | null;
};

type Translator = (key: string, fallback?: string) => string;

function resolveText(t: Translator | undefined, key: string, fallback: string) {
  if (!t) return fallback;
  return t(key, fallback);
}

function sanitizeMessage(message: string, t?: Translator) {
  const trimmed = message.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower.includes("<!doctype") || lower.includes("<html")) {
    return resolveText(
      t,
      "health.html",
      "Health check returned HTML. Verify base URL or health path."
    );
  }
  if (trimmed.length > 200) {
    return `${trimmed.slice(0, 200)}...`;
  }
  return trimmed;
}

function friendlyFromStatus(status?: number | null, t?: Translator) {
  if (!status) return resolveText(t, "health.failed", "Health check failed.");
  if (status === 401 || status === 403) {
    return resolveText(
      t,
      "health.unauthorized",
      "Health check unauthorized. Check API key or token."
    );
  }
  if (status === 404) {
    return resolveText(
      t,
      "health.notFound",
      "Health check endpoint not found. Check base URL or health path."
    );
  }
  if (status === 429) {
    return resolveText(
      t,
      "health.rateLimited",
      "Health check rate limited. Try again later."
    );
  }
  if (status >= 500) {
    return resolveText(
      t,
      "health.unavailable",
      "Health check failed: service unavailable."
    );
  }
  const template = resolveText(
    t,
    "health.status",
    `Health check failed (status ${status}).`
  );
  return template.replace("{status}", String(status));
}

export function formatHealthMessage(health?: HealthResponse | null, t?: Translator) {
  if (!health || health.ok) return "";
  if (health.message) {
    const sanitized = sanitizeMessage(health.message, t);
    if (sanitized) return sanitized;
  }
  return friendlyFromStatus(health.status_code, t);
}

export function formatHealthError(error: unknown, t?: Translator) {
  const message = error instanceof Error ? error.message : "Health check failed.";
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return resolveText(
      t,
      "health.fetchFailed",
      "Unable to reach the service. Check the URL or network."
    );
  }
  if (message.toLowerCase().includes("cors")) {
    return resolveText(
      t,
      "health.cors",
      "Request blocked by CORS. Check backend CORS settings."
    );
  }
  if (message.includes("non-JSON")) {
    return resolveText(
      t,
      "health.nonJson",
      "Health check returned non-JSON. Check API base URL."
    );
  }
  return sanitizeMessage(message, t) || resolveText(t, "health.failed", "Health check failed.");
}
