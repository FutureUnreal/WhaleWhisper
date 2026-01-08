import { appConfig } from "../config";

export type MemoryFact = {
  id: number;
  content: string;
  tags: string[];
  created_at: number;
};

export type MemoryCandidate = {
  id: number;
  content: string;
  reason: string;
  status: string;
  created_at: number;
};

export type MemorySummary = {
  id: number;
  content: string;
  created_at: number;
  session_id: string;
};

export type MemoryExportPayload = {
  facts: Array<{ content: string; tags?: string[]; created_at?: number }>;
  summaries: Array<{ content: string; created_at?: number; session_id?: string }>;
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

async function request<T>(path: string, options?: RequestInit) {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, options);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const suffix = text ? ` ${text}` : "";
    throw new Error(`Memory API error: ${response.status}${suffix}`);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Memory API returned non-JSON response. Check API base URL.");
  }
}

export async function listMemoryFacts(params: {
  userId: string;
  profileId: string;
  limit?: number;
}): Promise<MemoryFact[]> {
  const search = new URLSearchParams({
    user_id: params.userId,
    profile_id: params.profileId,
  });
  if (params.limit) {
    search.set("limit", String(params.limit));
  }
  const result = await request<{ facts?: MemoryFact[] }>(`/api/memory/facts?${search.toString()}`);
  return result.facts ?? [];
}

export async function deleteMemoryFact(params: {
  factId: number;
  userId: string;
  profileId: string;
}) {
  const search = new URLSearchParams({
    user_id: params.userId,
    profile_id: params.profileId,
  });
  return await request<{ ok: boolean }>(
    `/api/memory/facts/${params.factId}?${search.toString()}`,
    { method: "DELETE" }
  );
}

export async function listMemoryCandidates(params: {
  userId: string;
  profileId: string;
  status?: string;
  limit?: number;
}): Promise<MemoryCandidate[]> {
  const search = new URLSearchParams({
    user_id: params.userId,
    profile_id: params.profileId,
    status: params.status || "pending",
  });
  if (params.limit) {
    search.set("limit", String(params.limit));
  }
  const result = await request<{ candidates?: MemoryCandidate[] }>(
    `/api/memory/candidates?${search.toString()}`
  );
  return result.candidates ?? [];
}

export async function listMemorySummaries(params: {
  userId: string;
  profileId: string;
  limit?: number;
}): Promise<MemorySummary[]> {
  const search = new URLSearchParams({
    user_id: params.userId,
    profile_id: params.profileId,
  });
  if (params.limit) {
    search.set("limit", String(params.limit));
  }
  const result = await request<{ summaries?: MemorySummary[] }>(
    `/api/memory/summaries?${search.toString()}`
  );
  return result.summaries ?? [];
}

export async function deleteMemorySummary(params: {
  summaryId: number;
  userId: string;
  profileId: string;
}) {
  const search = new URLSearchParams({
    user_id: params.userId,
    profile_id: params.profileId,
  });
  return await request<{ ok: boolean }>(
    `/api/memory/summaries/${params.summaryId}?${search.toString()}`,
    { method: "DELETE" }
  );
}

export async function acceptMemoryCandidate(params: {
  candidateId: number;
  userId: string;
  profileId: string;
}): Promise<MemoryFact | null> {
  const search = new URLSearchParams({
    user_id: params.userId,
    profile_id: params.profileId,
  });
  const result = await request<{ ok: boolean; fact?: MemoryFact }>(
    `/api/memory/candidates/${params.candidateId}/accept?${search.toString()}`,
    { method: "POST" }
  );
  return result.fact ?? null;
}

export async function rejectMemoryCandidate(params: {
  candidateId: number;
  userId: string;
  profileId: string;
}) {
  const search = new URLSearchParams({
    user_id: params.userId,
    profile_id: params.profileId,
  });
  return await request<{ ok: boolean }>(
    `/api/memory/candidates/${params.candidateId}/reject?${search.toString()}`,
    { method: "POST" }
  );
}

export async function exportMemory(params: {
  userId: string;
  profileId: string;
}): Promise<MemoryExportPayload> {
  const search = new URLSearchParams({
    user_id: params.userId,
    profile_id: params.profileId,
  });
  return await request<MemoryExportPayload>(`/api/memory/export?${search.toString()}`);
}

export async function importMemory(params: {
  userId: string;
  profileId: string;
  payload: MemoryExportPayload;
}): Promise<{ facts: number; summaries: number }> {
  const search = new URLSearchParams({
    user_id: params.userId,
    profile_id: params.profileId,
  });
  return await request<{ facts: number; summaries: number }>(
    `/api/memory/import?${search.toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params.payload),
    }
  );
}
