import { appConfig } from "../config";

export type AgentEngine = {
  id: string;
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type AgentParam = {
  name: string;
  type: string;
  required?: boolean;
  default?: unknown;
  options?: unknown[];
  description?: string;
};

export type AgentStreamEvent = {
  event: string;
  data?: unknown;
};

export type AgentHealthResponse = {
  ok: boolean;
  status_code?: number | null;
  message?: string | null;
  latency_ms?: number | null;
};

const proxyBaseUrl = appConfig.providers.proxyUrl?.trim();
const apiBaseUrl = appConfig.providers.apiBaseUrl?.trim();

function resolveApiBaseUrl() {
  if (proxyBaseUrl) {
    return proxyBaseUrl.replace(/\/$/, "");
  }
  if (apiBaseUrl) {
    return apiBaseUrl.replace(/\/$/, "");
  }
  return "";
}

async function request<T>(path: string) {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Agent API error: ${response.status}`);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Agent API returned non-JSON response. Check API base URL.");
  }
}

export async function listAgentEngines(): Promise<AgentEngine[]> {
  const result = await request<{ engines?: AgentEngine[] }>("/api/agent/engines");
  return result.engines ?? [];
}

export async function getDefaultAgentEngine(): Promise<AgentEngine | null> {
  const result = await request<{ engine?: AgentEngine | null }>("/api/agent/engines/default");
  return result.engine ?? null;
}

export async function listAgentParams(engineId: string): Promise<AgentParam[]> {
  const result = await request<{ params?: AgentParam[] }>(`/api/agent/engines/${engineId}/params`);
  return result.params ?? [];
}

export async function checkAgentHealth(
  engineId: string,
  config?: Record<string, unknown>
): Promise<AgentHealthResponse> {
  const baseUrl = resolveApiBaseUrl();
  const hasConfig = Boolean(config && Object.keys(config).length);
  const response = await fetch(`${baseUrl}/api/agent/engines/${engineId}/health`, {
    method: hasConfig ? "POST" : "GET",
    headers: hasConfig
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: hasConfig ? JSON.stringify({ config }) : undefined,
  });
  if (!response.ok) {
    throw new Error(`Agent health check failed: ${response.status}`);
  }
  try {
    return (await response.json()) as AgentHealthResponse;
  } catch {
    throw new Error("Agent health check returned non-JSON response. Check API base URL.");
  }
}

export async function streamAgent({
  engineId,
  text,
  config,
  sessionId,
  userId,
  profileId,
  signal,
  onEvent,
}: {
  engineId: string;
  text: string;
  config?: Record<string, unknown>;
  sessionId?: string;
  userId?: string;
  profileId?: string;
  signal?: AbortSignal;
  onEvent: (event: AgentStreamEvent) => void | Promise<void>;
}) {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/agent/engines`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      engine: engineId,
      data: {
        text,
        session_id: sessionId,
        user_id: userId,
        profile_id: profileId,
      },
      config: config ?? {},
    }),
    signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    const suffix = message ? ` ${message}` : "";
    throw new Error(`Agent API error: ${response.status}${suffix}`);
  }

  if (!response.body) {
    throw new Error("Agent stream body is empty.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const emitChunk = async (chunk: string) => {
    const lines = chunk.split("\n");
    let eventName = "";
    const dataLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trimEnd();
      if (!trimmed || trimmed.startsWith(":")) continue;
      if (trimmed.startsWith("event:")) {
        eventName = trimmed.slice(6).trim();
        continue;
      }
      if (trimmed.startsWith("data:")) {
        dataLines.push(trimmed.slice(5).trimStart());
      }
    }

    if (!eventName) {
      eventName = "message";
    }
    const dataText = dataLines.join("\n");
    let data: unknown = dataText;
    if (dataText) {
      try {
        data = JSON.parse(dataText);
      } catch {
        data = dataText;
      }
    }
    await onEvent({ event: eventName, data });
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      await emitChunk(chunk);
    }
  }

  if (buffer.trim()) {
    await emitChunk(buffer);
  }
}
